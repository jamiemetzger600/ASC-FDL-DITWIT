import React, { useState, useEffect } from 'react';
import type { FDL, FramingIntent, Context, Canvas, FramingDecision } from '../types/fdl';
import { generateFDLId } from '../validation/fdlValidator';
import { COMMON_ASPECT_RATIOS } from '../types/fdl';
import FDLVisualizer from './FDLVisualizer';
import FrameLeaderEditor from './FrameLeaderEditor';
import { calculateFramingDecisionGeometry } from '../utils/fdlGeometry';
import Header from './Header';
import { useFrameLeaderSettingsStore } from '../stores/frameLeaderSettingsStore';
import { useFdlStore } from '../stores/fdlStore';

interface FDLEditorProps {
  fdl: FDL;
  onChange: (fdl: FDL) => void;
}

interface Resolution {
  name: string;
  width: number;
  height: number;
}

interface CameraModel {
  name: string;
  resolutions: Resolution[];
  physical_dimensions_mm?: { width: number; height: number };
}

interface CameraManufacturer {
  name: string;
  models: CameraModel[];
}

// Define a type for the new UI state for camera selections
interface CameraSelection {
  manufacturer: string;
  model: string;
  resolutionName: string; // Required to store the selected resolution name
}

const CAMERA_DATA: CameraManufacturer[] = [
  {
    name: "ARRI",
    models: [
      {
        name: "ALEXA 35",
        physical_dimensions_mm: { width: 27.99, height: 19.22 },
        resolutions: [
          { name: "4.6K", width: 4608, height: 3164 },
          { name: "4K", width: 4096, height: 2304 },
          { name: "UHD", width: 3840, height: 2160 },
          { name: "2K", width: 2048, height: 1152 },
          { name: "HD", width: 1920, height: 1080 },
          { name: "4K 2:1", width: 4096, height: 2048 },
          { name: "3.3K", width: 3328, height: 2790 },
          { name: "4K 2.39:1 Ana 2x", width: 4096, height: 1716 },
          { name: "3.8K 2:1 Ana 2x", width: 3840, height: 1920 },
          { name: "3K 1:1", width: 3072, height: 3072 },
          { name: "4.6K 16:9 (Sensor)", width: 4608, height: 2592 },
        ],
      },
      {
        name: "ALEXA 265",
        resolutions: [
          { name: "6.5K 2.12:1 Open Gate", width: 6560, height: 3100 },
          { name: "5.1K 1.65:1", width: 5120, height: 3100 },
          { name: "4.5K LF 3:2", width: 4448, height: 3096 }
        ],
      },
      {
        name: "ALEXA Mini LF",
        resolutions: [
          { name: "4.5K LF Open Gate (4480x3096)", width: 4480, height: 3096 },
          { name: "4.5K LF 2.39:1 (4480x1856)", width: 4480, height: 1856 },
          { name: "3.8K LF 16:9 UHD (3840x2160)", width: 3840, height: 2160 },
          { name: "2.8K S35 16:9 HD (1920x1080)", width: 1920, height: 1080 },
          { name: "2.8K S35 4:3 2.8K (3072x2160)", width: 3072, height: 2160 },
          { name: "3.2K S35 16:9 3.2K (3200x1800)", width: 3200, height: 1800 },
          { name: "3.4K S35 3:2 3.4K (3424x2202)", width: 3424, height: 2202 },
          { name: "2.8K LF 1:1 2.8K (3072x2880)", width: 3072, height: 2880 },
          { name: "3.8K LF 16:9 HD (1920x1080)", width: 1920, height: 1080 },
          { name: "3.8K LF 16:9 2K (2048x1152)", width: 2048, height: 1152 },
          { name: "4.3K LF 16:9 HD (1920x1080)", width: 1920, height: 1080 },
          { name: "4.3K LF 16:9 UHD (3840x2160)", width: 3840, height: 2160 },
        ],
      },
      {
        name: "ALEXA Mini",
        resolutions: [
          { name: "Open Gate 3.4K ARRIRAW", width: 3424, height: 2202 },
          { name: "4:3 2.8K ARRIRAW (OG 3.4K)", width: 2880, height: 2160 },
          { name: "2.8K ARRIRAW", width: 2880, height: 1620 },
          { name: "3.2K ProRes", width: 3200, height: 1800 },
          { name: "4:3 2.8K ProRes", width: 2944, height: 2160 },
          { name: "2.39:1 2K Ana. ProRes", width: 2048, height: 858 },
          { name: "2K ProRes", width: 2048, height: 1152 },
          { name: "HD Ana. ProRes", width: 1920, height: 1080 },
          { name: "HD ProRes", width: 1920, height: 1080 },
          { name: "S16 HD ProRes", width: 1920, height: 1080 },
          { name: "4K UHD ProRes (from 3.2K Sensor)", width: 3840, height: 2160 },
        ],
      },
      {
        name: "ALEXA 65",
        resolutions: [
          { name: "Open Gate 6.5K", width: 6560, height: 3100 },
          { name: "5.1K", width: 5120, height: 2880 },
          { name: "LF Open Gate (on 65)", width: 4448, height: 3096 },
          { name: "4.3K", width: 4320, height: 2880 },
          { name: "4K UHD (on 65)", width: 3840, height: 2160 },
        ],
      },
      {
        name: "ALEXA LF",
        resolutions: [
          { name: "OG 4.5K", width: 4480, height: 3096 },
          { name: "Scope 4.5K", width: 4480, height: 1856 },
          { name: "4K UHD", width: 3840, height: 2160 },
          { name: "2K", width: 2048, height: 1152 },
          { name: "HD", width: 1920, height: 1080 },
        ],
      },
      {
        name: "ALEXA SXT",
        resolutions: [
          { name: "ARRIRAW 3.4K Open Gate", width: 3424, height: 2202 },
          { name: "ARRIRAW 2.8K 4:3", width: 2880, height: 2160 },
          { name: "ARRIRAW 2.8K 16:9", width: 2880, height: 1620 },
          { name: "ProRes 4K Cine", width: 4096, height: 2636 },
          { name: "ProRes 3.4K Open Gate", width: 3424, height: 2202 },
          { name: "ProRes 3.2K 16:9", width: 3200, height: 1800 },
          { name: "ProRes 4:3 2.8K", width: 2880, height: 2160 },
          { name: "ProRes 2K Anamorphic", width: 2048, height: 858 },
          { name: "ProRes 4K UHD", width: 3840, height: 2160 },
          { name: "ProRes 2K 16:9", width: 2048, height: 1152 },
          { name: "ProRes HD 16:9", width: 1920, height: 1080 },
        ],
      },
      {
        name: "ALEXA XT",
        resolutions: [
          { name: "ARRIRAW Open Gate", width: 3414, height: 2198 },
          { name: "ARRIRAW 4:3 Full", width: 2880, height: 2160 },
          { name: "ARRIRAW 4:3 Cropped", width: 2578, height: 2160 },
          { name: "ARRIRAW 16:9 2.8K", width: 2880, height: 1620 },
          { name: "ProRes 3.2K 16:9", width: 3164, height: 1778 },
          { name: "ProRes 4:3 2K", width: 2048, height: 1536 },
          { name: "ProRes 16:9 2K", width: 2048, height: 1152 },
          { name: "ProRes HD 16:9", width: 1920, height: 1080 },
        ],
      },
      {
        name: "ALEXA Classic",
        resolutions: [
          { name: "ARRIRAW 2.8K 4:3", width: 2880, height: 2160 },
          { name: "ARRIRAW 2.8K 16:9", width: 2880, height: 1620 },
          { name: "ProRes 2K 4:3", width: 2048, height: 1536 },
          { name: "ProRes 2K 16:9", width: 2048, height: 1152 },
          { name: "ProRes HD 16:9", width: 1920, height: 1080 },
        ],
      },
      {
        name: "Amira",
        resolutions: [
          { name: "HD MPEG-2 (Amira Only)", width: 1920, height: 1080 },
          { name: "3.2K ProRes", width: 3200, height: 1800 },
          { name: "4K UHD ProRes (from 3.2K Sensor)", width: 3840, height: 2160 },
          { name: "2K ProRes", width: 2048, height: 1152 },
          { name: "HD ProRes", width: 1920, height: 1080 },
        ],
      },
    ],
  },
  {
    name: "Sony",
    models: [
      {
        name: "VENICE",
        resolutions: [
          // Full Frame Modes
          { name: "6K 3:2 Full Frame", width: 6048, height: 4032 },
          { name: "6K 2.39:1 Full Frame", width: 6048, height: 2534 },
          { name: "6K 1.85:1 Full Frame", width: 6054, height: 3272 },
          { name: "6K 17:9 Full Frame", width: 6054, height: 3192 },
          { name: "5.7K 16:9 Full Frame", width: 5674, height: 3192 },
          // Super35 Modes
          { name: "4K 6:5 Anamorphic S35", width: 4096, height: 3432 },
          { name: "4K 4:3 Anamorphic S35", width: 4096, height: 3024 },
          { name: "4K 17:9 S35", width: 4096, height: 2160 },
          { name: "4K 2.39:1 S35", width: 4096, height: 1716 },
          { name: "3.8K 16:9 S35", width: 3840, height: 2160 },
        ],
      },
      {
        name: "VENICE 2 (6K Sensor)",
        resolutions: [
          // Full Frame Modes
          { name: "6K 3:2 Full Frame", width: 6048, height: 4032 },
          { name: "6K 2.39:1 Full Frame", width: 6048, height: 2534 },
          { name: "6K 1.85:1 Full Frame", width: 6054, height: 3272 },
          { name: "6K 17:9 Full Frame", width: 6054, height: 3192 },
          { name: "5.7K 16:9 Full Frame", width: 5674, height: 3192 },
          // Super35 Modes
          { name: "4K 6:5 Anamorphic S35", width: 4096, height: 3432 },
          { name: "4K 4:3 Anamorphic S35", width: 4096, height: 3024 },
          { name: "4K 17:9 S35", width: 4096, height: 2160 },
          { name: "4K 2.39:1 S35", width: 4096, height: 1716 },
          { name: "3.8K 16:9 S35", width: 3840, height: 2160 },
          // Surround View Modes
          { name: "4K 17:9 S35 Surround View", width: 4552, height: 2400 },
          { name: "4K 4:3 S35 Surround View", width: 4552, height: 3360 },
          { name: "3.8K 16:9 S35 Surround View", width: 4268, height: 2400 },
        ],
      },
      {
        name: "VENICE 2 (8K Sensor)",
        physical_dimensions_mm: { width: 35.9, height: 24.0 },
        resolutions: [
          // Full Frame 8K Modes
          { name: "8.6K 3:2 Full Frame", width: 8640, height: 5760 },
          { name: "8.6K 17:9 Full Frame", width: 8640, height: 4556 },
          { name: "8.2K 17:9 Full Frame", width: 8192, height: 4320 },
          { name: "8.2K 2.39:1 Full Frame", width: 8192, height: 3432 },
          { name: "8.1K 16:9 Full Frame", width: 8100, height: 4556 },
          { name: "7.6K 16:9 Full Frame", width: 7680, height: 4320 },
          // Super35 5K/6K Modes
          { name: "5.8K 17:9 S35", width: 5792, height: 3056 },
          { name: "5.8K 6:5 Anamorphic S35", width: 5792, height: 4854 },
          { name: "5.8K 4:3 Anamorphic S35", width: 5792, height: 4276 },
          { name: "5.5K 2.39:1 S35", width: 5480, height: 2296 },
          { name: "5.4K 16:9 S35", width: 5434, height: 3056 },
        ],
      },
    ],
  },
  {
    name: "RED",
    models: [
      {
        name: "V-RAPTOR 8K S35 (Spherical)",
        resolutions: [
          { name: "8K 17:9", width: 8192, height: 4320 },
          { name: "8K 2:1", width: 8192, height: 4096 },
          { name: "8K 2.4:1", width: 8192, height: 3456 },
          { name: "8K 16:9", width: 7680, height: 4320 },
          { name: "7K 17:9", width: 7168, height: 3780 },
          { name: "7K 2:1", width: 7168, height: 3584 },
          { name: "7K 2.4:1", width: 7168, height: 3024 },
          { name: "7K 16:9", width: 6720, height: 3780 },
          { name: "6K 17:9", width: 6144, height: 3240 },
          { name: "6K 2:1", width: 6144, height: 3072 },
          { name: "6K 2.4:1", width: 6144, height: 2592 },
          { name: "6K 16:9", width: 5760, height: 3240 },
          { name: "5K 17:9", width: 5120, height: 2700 },
          { name: "5K 2:1", width: 5120, height: 2560 },
          { name: "5K 2.4:1", width: 5120, height: 2160 },
          { name: "5K 16:9", width: 4800, height: 2700 },
          { name: "4K 17:9", width: 4096, height: 2160 },
          { name: "4K 2:1", width: 4096, height: 2048 },
          { name: "4K 2.4:1", width: 4096, height: 1716 },
          { name: "4K 16:9", width: 3840, height: 2160 },
          { name: "3K 17:9", width: 3072, height: 1620 },
          { name: "3K 2:1", width: 3072, height: 1536 },
          { name: "3K 2.4:1", width: 3072, height: 1286 },
          { name: "3K 16:9", width: 2880, height: 1620 },
          { name: "2K 17:9", width: 2048, height: 1080 },
          { name: "2K 2:1", width: 2048, height: 1024 },
          { name: "2K 2.4:1", width: 2048, height: 858 },
          { name: "2K 16:9", width: 1920, height: 1080 },
        ],
      },
      {
        name: "V-Raptor 8K VV (Spherical)",
        physical_dimensions_mm: { width: 40.96, height: 21.60 },
        resolutions: [
          { name: "8K 17:9", width: 8192, height: 4320 },
          { name: "8K 2:1", width: 8192, height: 4096 },
          { name: "8K 2.4:1", width: 8192, height: 3456 },
          { name: "8K 16:9", width: 7680, height: 4320 },
          { name: "7K 17:9", width: 7168, height: 3780 },
          { name: "7K 2:1", width: 7168, height: 3584 },
          { name: "7K 2.4:1", width: 7168, height: 3024 },
          { name: "7K 16:9", width: 6720, height: 3780 },
          { name: "6K 17:9", width: 6144, height: 3240 },
          { name: "6K 2:1", width: 6144, height: 3072 },
          { name: "6K 2.4:1", width: 6144, height: 2592 },
          { name: "6K 16:9", width: 5760, height: 3240 },
          { name: "5K 17:9", width: 5120, height: 2700 },
          { name: "5K 2:1", width: 5120, height: 2560 },
          { name: "5K 2.4:1", width: 5120, height: 2160 },
          { name: "5K 16:9", width: 4800, height: 2700 },
          { name: "4K 17:9", width: 4096, height: 2160 },
          { name: "4K 2:1", width: 4096, height: 2048 },
          { name: "4K 2.4:1", width: 4096, height: 1716 },
          { name: "4K 16:9", width: 3840, height: 2160 },
          { name: "3K 17:9", width: 3072, height: 1620 },
          { name: "3K 2:1", width: 3072, height: 1536 },
          { name: "3K 2.4:1", width: 3072, height: 1286 },
          { name: "3K 16:9", width: 2880, height: 1620 },
          { name: "2K 17:9", width: 2048, height: 1080 },
          { name: "2K 2:1", width: 2048, height: 1024 },
          { name: "2K 2.4:1", width: 2048, height: 858 },
          { name: "2K 16:9", width: 1920, height: 1080 },
        ],
      },
      {
        name: "V-Raptor 8K VV (Anamorphic)",
        resolutions: [
          { name: "8K 4:3 2X", width: 5760, height: 4320 },
          { name: "8K 6:5 2X", width: 5184, height: 4320 },
          { name: "8K 1:1 2X", width: 4320, height: 4320 },
          { name: "8K 3:2 1.8X", width: 6480, height: 4320 },
          { name: "8K 4:3 1.8X", width: 5758, height: 4320 },
          { name: "8K 3:2 1.6X", width: 6480, height: 4320 },
          { name: "8K 16:9 1.5X", width: 7680, height: 4320 },
          { name: "8K 17:9 1.3X", width: 8192, height: 4320 },
          { name: "8K 16:9 1.3X", width: 7680, height: 4320 },
          { name: "8K 17:9 1.25X", width: 8192, height: 4320 },
        ],
      },
      {
        name: "V-Raptor 7K-6K S35 (Anamorphic)",
        resolutions: [
          { name: "7K 4:3 2X", width: 5040, height: 3780 },
          { name: "7K 6:5 2X", width: 4536, height: 3780 },
          { name: "7K 1:1 2X", width: 3780, height: 3780 },
          { name: "7K 3:2 1.8X", width: 5670, height: 3780 },
          { name: "7K 4:3 1.8X", width: 5040, height: 3780 },
          { name: "6K 3:2 1.8X", width: 5670, height: 3240 },
          { name: "6K 4:3 1.8X", width: 5040, height: 3240 },
          { name: "6K 17:9 1.3X", width: 6144, height: 3240 },
          { name: "6K 2:1 1.3X", width: 6144, height: 3072 },
          { name: "6K 16:9 1.3X", width: 5760, height: 3240 },
        ],
      },
      // Future RED models can be added here
    ],
  },
];

const intentColors = ["#f87171", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"]; // Red, Blue, Yellow, Green, Purple, Pink
const intentBackgroundOpacity = '40'; // Approx 25% opacity (hex 40)

const FDLEditor: React.FC = () => {
  const { fdl, setFdl } = useFdlStore();
  const [selectedVisualizedContextIndex, setSelectedVisualizedContextIndex] = useState<number | null>(null);

  useEffect(() => {
    // ... existing code ...
  }, [fdl.contexts]);

  const handleExport = () => {
    const dataStr = JSON.stringify(fdl, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `fdl_${new Date().toISOString().split('T')[0]}.fdl`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedFdl = JSON.parse(result) as FDL;
        
        setFdl(importedFdl);
        alert('FDL imported successfully!');
      } catch (error) {
        console.error('Error importing FDL file:', error);
        alert('Error importing FDL file. Please ensure the file is a correctly formatted JSON FDL file.');
      }
    };
    reader.readAsText(file);
  };
  
  const updateFDL = (newFdl: Partial<FDL>) => {
    setFdl({ ...fdl, ...newFdl });
  };

  // Initialize selectedCameraSelections based on the initial FDL or defaults
  const initializeCameraSelections = (currentFdl: FDL): CameraSelection[] => {
    if (currentFdl.contexts && currentFdl.contexts.length > 0) {
      return currentFdl.contexts.map(context => {
        const defaultSelection: CameraSelection = {
          manufacturer: CAMERA_DATA[0]?.name || '',
          model: CAMERA_DATA[0]?.models[0]?.name || '',
          resolutionName: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.name || '',
        };

        if (context.canvases && context.canvases.length > 0) {
          const canvas = context.canvases[0];
          const importedCanvasId = canvas.id;

          for (const manufacturer of CAMERA_DATA) {
            for (const model of manufacturer.models) {
              for (const resolution of model.resolutions) {
                const candidateId = generateFDLId(`${manufacturer.name}_${model.name}_${resolution.name}`);
                if (candidateId === importedCanvasId) {
                  return {
                    manufacturer: manufacturer.name,
                    model: model.name,
                    resolutionName: resolution.name,
                  };
                }
              }
            }
          }
          console.warn(`FDLEditor:initializeCameraSelections - Could not find matching camera data for canvas ID: ${importedCanvasId}. Using defaults for context "${context.label || 'Untitled'}".`);
        }
        return defaultSelection; // Default for context with no canvases
      });
    }
    return [];
  };

  const [selectedCameraSelections, setSelectedCameraSelections] = useState<CameraSelection[]>(() => initializeCameraSelections(fdl));
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean[]>([]);
  const [selectedContextIndex, setSelectedContextIndex] = useState<number | null>(null);

  useEffect(() => {
    // Synchronize selectedCameraSelections when FDL prop changes (e.g., on import)
    // This ensures dropdowns reflect the current FDL state.
    if (fdl && fdl.contexts) {
      const newSelections = initializeCameraSelections(fdl);
      setSelectedCameraSelections(newSelections);

      // Also, reset selectedContextIndex if it's out of bounds
      if (fdl.contexts.length > 0) {
        if (selectedContextIndex === null || selectedContextIndex >= fdl.contexts.length) {
          setSelectedContextIndex(0);
        }
        if (selectedVisualizedContextIndex === null || selectedVisualizedContextIndex >= fdl.contexts.length) {
          setSelectedVisualizedContextIndex(0);
        }
      } else {
        setSelectedContextIndex(null);
        setSelectedVisualizedContextIndex(null);
      }
      
      // Initialize showAdvancedSettings for new contexts
      setShowAdvancedSettings(new Array(fdl.contexts.length).fill(false));

    } else { // No contexts in FDL
      setSelectedCameraSelections([]);
      setSelectedContextIndex(null);
      setSelectedVisualizedContextIndex(null);
      setShowAdvancedSettings([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fdl]); // Rerun when the FDL prop itself changes

  // Effect to handle initialization and updates when contexts are added/removed
  useEffect(() => {
    if (fdl && fdl.contexts) {
      if (fdl.contexts.length > 0 && selectedContextIndex === null) {
        setSelectedContextIndex(0);
      } else if (fdl.contexts.length === 0 && selectedContextIndex !== null) {
        setSelectedContextIndex(null);
      }
      // Ensure selectedCameraSelections array matches the number of contexts
      if (selectedCameraSelections.length !== fdl.contexts.length) {
         // Re-initialize if lengths mismatch - this might happen if addContext doesn't immediately trigger fdl prop update
         setSelectedCameraSelections(initializeCameraSelections(fdl));
      }
      if (showAdvancedSettings.length !== fdl.contexts.length) {
        setShowAdvancedSettings(new Array(fdl.contexts.length).fill(false));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fdl?.contexts?.length, selectedContextIndex]); // React to changes in number of contexts

  const addFramingIntent = () => {
    const defaultAspectRatio = { width: 16, height: 9 };
    const defaultRatioObject = COMMON_ASPECT_RATIOS.find(
      r => r.ratio.width === defaultAspectRatio.width && r.ratio.height === defaultAspectRatio.height
    );
    
    let initialLabel = '';
    if (defaultRatioObject && defaultRatioObject.label) {
      initialLabel = defaultRatioObject.label;
    }

    const newIntent: FramingIntent = {
      id: generateFDLId(`intent_${Date.now()}`),
      label: initialLabel,
      aspect_ratio: defaultAspectRatio
    };
    const newIntents = [...(fdl.framing_intents || []), newIntent];

    // --- New logic to add FramingDecision automatically ---
    let newFdlContexts = fdl.contexts ? JSON.parse(JSON.stringify(fdl.contexts)) as Context[] : [];

    if (selectedVisualizedContextIndex !== null && 
        newFdlContexts[selectedVisualizedContextIndex] && 
        newFdlContexts[selectedVisualizedContextIndex].canvases && 
        newFdlContexts[selectedVisualizedContextIndex].canvases.length > 0) {

      const targetContext = newFdlContexts[selectedVisualizedContextIndex];
      const primaryCanvas = targetContext.canvases[0];

      if (primaryCanvas) {
        const geometry = calculateFramingDecisionGeometry(newIntent, primaryCanvas);
        if (geometry) {
          const newDecision: FramingDecision = {
            id: generateFDLId(newIntent.label || `decision_${newIntent.id}`),
            label: newIntent.label || 'Framing Decision',
            framing_intent_id: newIntent.id,
            ...geometry,
          };
          primaryCanvas.framing_decisions = [...(primaryCanvas.framing_decisions || []), newDecision];
        }
      }
    }
    // --- End of new logic ---

    updateFDL({ framing_intents: newIntents, contexts: newFdlContexts });
  };

  const updateFramingIntent = (index: number, updates: Partial<FramingIntent>) => {
    const clonedFdl = JSON.parse(JSON.stringify(fdl)) as FDL; // Deep clone FDL

    // Ensure framing_intents array exists on the clone
    if (!clonedFdl.framing_intents) {
      clonedFdl.framing_intents = [];
    }
    
    // Update the intent
    const updatedIntent = { ...clonedFdl.framing_intents[index], ...updates };
    clonedFdl.framing_intents[index] = updatedIntent;

    // Update the corresponding FramingDecision on the visualized canvas
    if (selectedVisualizedContextIndex !== null &&
        clonedFdl.contexts &&
        clonedFdl.contexts[selectedVisualizedContextIndex] &&
        clonedFdl.contexts[selectedVisualizedContextIndex].canvases &&
        clonedFdl.contexts[selectedVisualizedContextIndex].canvases.length > 0) {
      
      const targetContext = clonedFdl.contexts[selectedVisualizedContextIndex];
      const primaryCanvas = targetContext.canvases[0];

      if (primaryCanvas) {
        // Ensure framing_decisions array exists
        if (!primaryCanvas.framing_decisions) {
          primaryCanvas.framing_decisions = [];
        }

        const decisionIndex = primaryCanvas.framing_decisions.findIndex(
          fd => fd.framing_intent_id === updatedIntent.id
        );

        if (decisionIndex !== -1) {
          const geometry = calculateFramingDecisionGeometry(updatedIntent, primaryCanvas);
          if (geometry) {
            primaryCanvas.framing_decisions[decisionIndex] = {
              ...primaryCanvas.framing_decisions[decisionIndex], // Keep other fields if any
              id: generateFDLId(updatedIntent.label || `decision_${updatedIntent.id}`),
              label: updatedIntent.label || 'Framing Decision',
              ...geometry, // This includes dimensions, anchor_point, and potentially protection_*,
              framing_intent_id: updatedIntent.id // Ensure this is still correct
            };
          } else {
            // If geometry calculation fails (e.g., invalid aspect ratio in updatedIntent),
            // we might remove the decision or leave it with old geometry but updated label/id.
            // For now, let's update label/id and keep old geometry if new one is null.
            // Or, more robustly, if an intent becomes invalid, its decision shouldn't render / be valid.
            // Let's try removing the decision if its geometry can no longer be calculated,
            // as it implies the intent is no longer valid for display.
            console.warn(`Could not calculate geometry for updated intent ${updatedIntent.label}. Removing corresponding decision.`);
            primaryCanvas.framing_decisions.splice(decisionIndex, 1);
          }
        }
        // If decisionIndex is -1, it means a decision for this intent didn't exist on this canvas.
        // This could happen if the intent was added but the canvas wasn't the visualized one at the time.
        // The handleIntentVisibilityChange in FrameLeaderEditor would create it if toggled.
        // For now, updateFramingIntent will only modify *existing* decisions.
      }
    }
    updateFDL(clonedFdl); // Use the generic onChange, not updateFDL directly
  };

  const removeFramingIntent = (index: number) => {
    const newIntents = [...(fdl.framing_intents || [])];
    newIntents.splice(index, 1);
    updateFDL({ framing_intents: newIntents });
  };

  const moveFramingIntent = (index: number, direction: 'up' | 'down') => {
    const intents = [...(fdl.framing_intents || [])];
    if (direction === 'up' && index > 0) {
      const temp = intents[index];
      intents[index] = intents[index - 1];
      intents[index - 1] = temp;
    } else if (direction === 'down' && index < intents.length - 1) {
      const temp = intents[index];
      intents[index] = intents[index + 1];
      intents[index + 1] = temp;
    }
    updateFDL({ framing_intents: intents });
  };

  const addContext = () => {
    const defaultManufacturerData = CAMERA_DATA[0];
    const defaultModelData = defaultManufacturerData?.models[0];
    const defaultResolutionData = defaultModelData?.resolutions[0];

    // Get physical dimensions from the selected model, or use a fallback
    const physicalDims = defaultModelData?.physical_dimensions_mm 
      ? { width: defaultModelData.physical_dimensions_mm.width, height: defaultModelData.physical_dimensions_mm.height }
      : { width: 35.9, height: 24.0 }; // Fallback if not defined for model

    let newCanvasId = generateFDLId('default_canvas');
    if (defaultManufacturerData && defaultModelData && defaultResolutionData) {
      newCanvasId = generateFDLId(`${defaultManufacturerData.name}_${defaultModelData.name}_${defaultResolutionData.name}`);
    }
    let defaultLabel = 'Primary Capture';
    if (defaultResolutionData) {
      defaultLabel = defaultResolutionData.name;
    }

    const defaultCanvas: Canvas = {
      id: newCanvasId,
      source_canvas_id: newCanvasId,
      label: defaultLabel, 
      dimensions: { 
        width: defaultResolutionData?.width || 0, 
        height: defaultResolutionData?.height || 0 
      },
      effective_dimensions: { 
        width: defaultResolutionData?.width || 0, 
        height: defaultResolutionData?.height || 0
      },
      effective_anchor_point: { x: 0, y: 0 },
      photosite_dimensions: {
        width: defaultResolutionData?.width || 0, 
        height: defaultResolutionData?.height || 0
      },
      physical_dimensions: physicalDims,
      anamorphic_squeeze: 1.0,
      framing_decisions: [],
      recording_codec: defaultManufacturerData?.name === 'ARRI' ? 'ARRIRAW' : undefined,
    };
    const newContext: Context = {
      label: `Camera Setup ${(fdl.contexts?.length || 0) + 1}`,
      context_creator: fdl.fdl_creator || '',
      canvases: [defaultCanvas],
    };
    
    // Update FDL
    const newFdlContexts = [...(fdl.contexts || []), newContext];
    updateFDL({ contexts: newFdlContexts });

    // Update cameraSelections state for the new context
    setSelectedCameraSelections(prev => [...prev, {
        manufacturer: defaultManufacturerData?.name || '',
        model: defaultModelData?.name || '',
        resolutionName: defaultResolutionData?.name || ''
    }]);

    setShowAdvancedSettings(prev => [...prev, false]);
    if (selectedVisualizedContextIndex === null) {
      setSelectedVisualizedContextIndex(0);
    }
  };

  const updateCanvas = (contextIndex: number, canvasIndex: number, updates: Partial<Canvas>) => {
    const newFdlContexts = [...(fdl.contexts || [])];
    if (newFdlContexts[contextIndex] && newFdlContexts[contextIndex].canvases) {
      const canvases = [...(newFdlContexts[contextIndex].canvases || [])];
      // Retrieve the current anamorphic squeeze from the updates or existing canvas
      const anamorphicSqueeze = updates.anamorphic_squeeze ?? canvases[canvasIndex]?.anamorphic_squeeze ?? 1.0;
      
      let effectiveDimensions = updates.effective_dimensions ?? canvases[canvasIndex]?.effective_dimensions;
      const dimensions = updates.dimensions ?? canvases[canvasIndex]?.dimensions;

      // If anamorphic_squeeze is updated OR dimensions are updated, recalculate effective_dimensions
      if (updates.anamorphic_squeeze !== undefined || updates.dimensions !== undefined) {
        if (dimensions) {
          effectiveDimensions = {
            width: Math.round(dimensions.width * anamorphicSqueeze),
            height: dimensions.height,
          };
        }
      }
      
      canvases[canvasIndex] = { 
        ...canvases[canvasIndex], 
        ...updates,
        effective_dimensions: effectiveDimensions // Ensure this is part of the update
      };
      
      newFdlContexts[contextIndex] = { ...newFdlContexts[contextIndex], canvases };
      updateFDL({ contexts: newFdlContexts });
    }
  };
  
  const handleCameraSelectionChange = (
    contextIndex: number,
    type: 'manufacturer' | 'model' | 'resolution',
    value: string
  ) => {
    const newSelections = [...selectedCameraSelections];
    let currentSelection = { ...newSelections[contextIndex] };
    let newCanvasProps: Partial<Canvas> = {};
    const currentCanvas = fdl.contexts?.[contextIndex]?.canvases?.[0];
    const anamorphicSqueeze = currentCanvas?.anamorphic_squeeze || 1.0;
    
    let selectedManufacturerData: CameraManufacturer | undefined;
    let selectedModelData: CameraModel | undefined;
    let selectedResolutionData: Resolution | undefined;

    if (type === 'manufacturer') {
      currentSelection.manufacturer = value;
      selectedManufacturerData = CAMERA_DATA.find(m => m.name === value);
      currentSelection.model = selectedManufacturerData?.models[0]?.name || '';
      selectedModelData = selectedManufacturerData?.models.find(m => m.name === currentSelection.model);
      currentSelection.resolutionName = selectedModelData?.resolutions[0]?.name || '';
      selectedResolutionData = selectedModelData?.resolutions.find(r => r.name === currentSelection.resolutionName);
    } else if (type === 'model') {
      currentSelection.model = value;
      selectedManufacturerData = CAMERA_DATA.find(m => m.name === currentSelection.manufacturer);
      selectedModelData = selectedManufacturerData?.models.find(m => m.name === value);
      currentSelection.resolutionName = selectedModelData?.resolutions[0]?.name || '';
      selectedResolutionData = selectedModelData?.resolutions.find(r => r.name === currentSelection.resolutionName);
    } else if (type === 'resolution') {
      currentSelection.resolutionName = value;
      selectedManufacturerData = CAMERA_DATA.find(m => m.name === currentSelection.manufacturer);
      selectedModelData = selectedManufacturerData?.models.find(m => m.name === currentSelection.model);
      selectedResolutionData = selectedModelData?.resolutions.find(r => r.name === value);
    }

    const physicalDims = selectedModelData?.physical_dimensions_mm
      ? { width: selectedModelData.physical_dimensions_mm.width, height: selectedModelData.physical_dimensions_mm.height }
      : (currentCanvas?.physical_dimensions || { width: 35.9, height: 24.0 }); 

    if (type === 'manufacturer' || type === 'model' ) {
        newCanvasProps.physical_dimensions = physicalDims;
    }

    if (selectedResolutionData) {
      const canvasId = generateFDLId(`${currentSelection.manufacturer}_${currentSelection.model}_${currentSelection.resolutionName}`);
      newCanvasProps.id = canvasId;
      newCanvasProps.source_canvas_id = canvasId;
      newCanvasProps.label = currentSelection.resolutionName;
      newCanvasProps.dimensions = { width: selectedResolutionData.width, height: selectedResolutionData.height };
      newCanvasProps.effective_dimensions = { 
          width: Math.round(selectedResolutionData.width * anamorphicSqueeze), 
          height: selectedResolutionData.height 
      };
      newCanvasProps.effective_anchor_point = { x: 0, y: 0 };
      newCanvasProps.photosite_dimensions = { width: selectedResolutionData.width, height: selectedResolutionData.height };
      if (type !== 'resolution') { 
         newCanvasProps.physical_dimensions = physicalDims;
      }
    } else if (type !== 'resolution') { 
      const canvasId = generateFDLId(`${currentSelection.manufacturer}_${currentSelection.model}_unknown`);
      newCanvasProps.id = canvasId;
      newCanvasProps.source_canvas_id = canvasId;
      newCanvasProps.label = 'Unknown Resolution';
      newCanvasProps.dimensions = { width: 0, height: 0 };
      newCanvasProps.effective_dimensions = { width: 0, height: 0 };
      newCanvasProps.effective_anchor_point = { x: 0, y: 0 };
      newCanvasProps.photosite_dimensions = { width: 0, height: 0 };
      newCanvasProps.physical_dimensions = physicalDims;
    }
    
    if (type === 'manufacturer') {
        newCanvasProps.recording_codec = value === 'ARRI' ? 'ARRIRAW' : (currentCanvas?.recording_codec === 'ARRIRAW' ? undefined : currentCanvas?.recording_codec);
    }

    newSelections[contextIndex] = currentSelection;
    setSelectedCameraSelections(newSelections);

    if (Object.keys(newCanvasProps).length > 0) {
      const existingCanvas = fdl.contexts?.[contextIndex]?.canvases?.[0];
      const finalCanvasProps: Partial<Canvas> = {
        ...(existingCanvas ? existingCanvas : {}),
        ...newCanvasProps,
        physical_dimensions: newCanvasProps.physical_dimensions || existingCanvas?.physical_dimensions || physicalDims
      };
      updateCanvas(contextIndex, 0, finalCanvasProps); 
    }
  };


  const removeContext = (contextIndexToRemove: number) => {
    const newFdlContexts = [...(fdl.contexts || [])];
    newFdlContexts.splice(contextIndexToRemove, 1);
    updateFDL({ contexts: newFdlContexts });

    // Remove corresponding camera selection
    const newCameraSelections = [...selectedCameraSelections];
    newCameraSelections.splice(contextIndexToRemove, 1);
    setSelectedCameraSelections(newCameraSelections);

    setShowAdvancedSettings(prev => prev.filter((_, i) => i !== contextIndexToRemove));

    if (selectedVisualizedContextIndex !== null) {
      if (selectedVisualizedContextIndex === contextIndexToRemove) {
        setSelectedVisualizedContextIndex(newFdlContexts.length > 0 ? 0 : null);
      } else if (selectedVisualizedContextIndex > contextIndexToRemove) {
        setSelectedVisualizedContextIndex(selectedVisualizedContextIndex - 1);
      }
    }
  };

  const toggleAdvancedSettings = (index: number) => {
    setShowAdvancedSettings(prev => 
      prev.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  return (
    <div>
      <Header onExport={handleExport} onImport={handleImport} />
      <div className="p-6">
        <div className="space-y-8">
                <div className="text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-md p-4">
                  <p>
                    Thanks for checking out my ASC-FDL creation tool. FDL stands for Frameline Decision List and will be similar to CDL but with photoshop style layer controls. The ASC comittee is still working on definining the release SPEC for FDL - so this tool is extremely ALPHA. As far as I know, FDL is only supported in colorfront as of now. Software companies and Camera companies should support FDL once the spec is final. For the meantime, I will continue to build this app so it's ready to go once the SPEC is live. I'll add backwards compatibility as well so you can use it to generate regular frameline files for Arri/Red/Sony. Please play around and test this. Please send me ideas and feedback. I'm pretty quick to respond - I want this tool to be great. <a href="mailto:jamiemetzger@gmail.com" className="text-blue-600 hover:underline">jamiemetzger@gmail.com</a>
                  </p>
                </div>

                {/* Camera & Canvas Setups */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-400 dark:border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Camera & Canvas Setups</h2>
                    <button
                      onClick={addContext}
                      className="fdl-button-primary text-sm"
                    >
                      Add Camera Setup
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(fdl.contexts || []).map((context, contextIndex) => {
                      // Derive current manufacturer and model from cameraSelections state
                      const currentSelection = selectedCameraSelections[contextIndex] || { manufacturer: '', model: '', resolutionName: '' };
                      const currentManufacturerData = CAMERA_DATA.find(m => m.name === currentSelection.manufacturer);
                      const currentModelData = currentManufacturerData?.models.find(mod => mod.name === currentSelection.model);
                      
                      const primaryCanvas = context.canvases && context.canvases.length > 0 ? context.canvases[0] : null;

                      return (
                      <div key={contextIndex} className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"> {/* Use contextIndex as key */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-gray-900 dark:text-gray-200">{context.label || `Camera Setup ${contextIndex + 1}`}</h3>
                          <button
                            onClick={() => removeContext(contextIndex)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        
                        {/* Canvas Definition - MOVED UP */}
                        <div className="bg-gray-200 dark:bg-gray-600 p-4 rounded-md mb-4 space-y-3">
                          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2 border-b border-gray-400 dark:border-gray-500 pb-2">Canvas Definition</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label htmlFor={`manufacturer-${contextIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camera Manufacturer</label>
                              <select
                                id={`manufacturer-${contextIndex}`}
                                value={currentSelection.manufacturer}
                                onChange={(e) => handleCameraSelectionChange(contextIndex, 'manufacturer', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Manufacturer</option>
                                {CAMERA_DATA.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`model-${contextIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Camera Model</label>
                              <select
                                id={`model-${contextIndex}`}
                                key={`model-select-${currentSelection.manufacturer}-${currentSelection.model}-${contextIndex}`} // Key for re-render
                                value={currentSelection.model}
                                disabled={!currentManufacturerData}
                                onChange={(e) => handleCameraSelectionChange(contextIndex, 'model', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Model</option>
                                {currentManufacturerData?.models.map(mod => <option key={mod.name} value={mod.name}>{mod.name}</option>)}   
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`resolution-${contextIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sensor Mode/Resolution</label>
                              <select
                                id={`resolution-${contextIndex}`}
                                key={`resolution-select-${currentSelection.model}-${contextIndex}`} // Key for re-render
                                disabled={!currentModelData}
                                value={currentSelection.resolutionName || ''}
                                onChange={(e) => handleCameraSelectionChange(contextIndex, 'resolution', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Resolution</option>
                                {currentModelData?.resolutions.map(res => <option key={res.name} value={res.name}>{res.name} ({res.width}x{res.height})</option>)} 
                              </select>
                            </div>
                          </div>

                          {/* New Row for Anamorphic Squeeze and Recording Codec */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"> {/* Added mt-3 for spacing */}
                            <div>
                              <label htmlFor={`anamorphic-squeeze-${contextIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anamorphic Squeeze</label>
                              <select
                                id={`anamorphic-squeeze-${contextIndex}`}
                                value={primaryCanvas?.anamorphic_squeeze || 1.0} // Default to 1.0 if not set
                                onChange={(e) => {
                                  if (primaryCanvas) {
                                    updateCanvas(contextIndex, 0, { anamorphic_squeeze: parseFloat(e.target.value) });
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {[1.0, 1.25, 1.30, 1.33, 1.5, 1.65, 1.8, 1.85, 2.0].map(val => (
                                  <option key={val} value={val}>{val.toFixed(2)}</option>
                                ))}
                              </select>
                            </div>
                            {currentSelection.manufacturer === 'ARRI' && ( // Use cameraSelections for conditional rendering
                              <div>
                                <label htmlFor={`recording-codec-${contextIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recording Codec</label>
                                <select
                                  id={`recording-codec-${contextIndex}`}
                                  value={primaryCanvas?.recording_codec || ''}
                                  onChange={(e) => {
                                    if (primaryCanvas) {
                                      updateCanvas(contextIndex, 0, { recording_codec: e.target.value });
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Codec</option>
                                  <option value="Apple ProRes">Apple ProRes</option>
                                  <option value="ARRIRAW">ARRIRAW</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Primary Canvas Details */} 
                          {primaryCanvas && (
                            <div className="mt-3 pt-3 border-t border-gray-400 dark:border-gray-500 space-y-3">
                               <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Context Label (Internal Use)
                                  </label>
                                  <input
                                    type="text"
                                    value={context.label || ''}
                                    onChange={(e) => {
                                      const newContexts = [...(fdl.contexts || [])];
                                      if(newContexts[contextIndex]) {
                                          newContexts[contextIndex] = {...newContexts[contextIndex], label: e.target.value };
                                          updateFDL({contexts: newContexts});
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., A-Cam, Scene 5 Setup"
                                  />
                                </div>
                                 <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Canvas Label (FDL Spec)
                                  </label>
                                  <input
                                    type="text"
                                    value={primaryCanvas.label || ''}
                                    onChange={(e) => updateCanvas(contextIndex, 0, { label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Main Sensor, VFX Plate"
                                  />
                                </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Canvas Width (px)
                                  </label>
                                  <input
                                    type="number"
                                    value={primaryCanvas.dimensions?.width || ''}
                                    readOnly 
                                    className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Canvas Height (px)
                                  </label>
                                  <input
                                    type="number"
                                    value={primaryCanvas.dimensions?.height || ''}
                                    readOnly 
                                    className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Advanced Settings Toggle */}
                              <div className="mt-4">
                                <button 
                                  onClick={() => toggleAdvancedSettings(contextIndex)}
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  {showAdvancedSettings[contextIndex] ? 'Hide' : 'Show'} Advanced Canvas Settings
                                </button>
                              </div>

                              {/* ADVANCED CANVAS FIELDS - Conditionally Rendered */}
                              {showAdvancedSettings[contextIndex] && primaryCanvas && (
                                <div className="mt-3 pt-3 border-t border-gray-400 dark:border-gray-500 space-y-3">
                                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Advanced Canvas Properties</h5>
                                  
                                  {/* Effective Dimensions */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effective Width (px)</label>
                                      <input type="number" value={primaryCanvas.effective_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_dimensions: { ...(primaryCanvas.effective_dimensions || { width:0, height:0 }), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effective Height (px)</label>
                                      <input type="number" value={primaryCanvas.effective_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_dimensions: { ...(primaryCanvas.effective_dimensions || { width:0, height:0 }), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                  </div>

                                  {/* Effective Anchor Point */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effective Anchor X</label>
                                      <input type="number" value={primaryCanvas.effective_anchor_point?.x || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_anchor_point: { ...(primaryCanvas.effective_anchor_point || {x:0, y:0}), x: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Effective Anchor Y</label>
                                      <input type="number" value={primaryCanvas.effective_anchor_point?.y || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_anchor_point: { ...(primaryCanvas.effective_anchor_point || {x:0, y:0}), y: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                  </div>

                                  {/* Photosite Dimensions */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photosite Width (px)</label>
                                      <input type="number" value={primaryCanvas.photosite_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { photosite_dimensions: { ...(primaryCanvas.photosite_dimensions || {width:0, height:0}), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photosite Height (px)</label>
                                      <input type="number" value={primaryCanvas.photosite_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { photosite_dimensions: { ...(primaryCanvas.photosite_dimensions || {width:0, height:0}), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                  </div>

                                  {/* Physical Dimensions */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Physical Width (mm)</label>
                                      <input type="number" step="0.01" value={primaryCanvas.physical_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { physical_dimensions: { ...(primaryCanvas.physical_dimensions || {width:0, height:0}), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Physical Height (mm)</label>
                                      <input type="number" step="0.01" value={primaryCanvas.physical_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { physical_dimensions: { ...(primaryCanvas.physical_dimensions || {width:0, height:0}), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm" />
                                    </div>
                                  </div>
                                  
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })}
                    
                    {(!fdl.contexts || fdl.contexts.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No Camera Setups defined. Click "Add Camera Setup" to get started.
                      </div>
                    )}
                  </div>
                </div>

                {/* Framing Intents */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-400 dark:border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Framing Intents</h2>
                    <button
                      onClick={addFramingIntent}
                      className="fdl-button-primary text-sm"
                    >
                      Add Intent
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(fdl.framing_intents || []).map((intent, index) => {
                      return (
                        <div key={intent.id} className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 dark:text-gray-200">
                                <span 
                                  className="inline-block px-2 py-1 rounded-md text-xs font-semibold text-white mr-2"
                                  style={{
                                    backgroundColor: (() => {
                                      const colors = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#8b5cf6", "#ec4899"]; // red, blue, yellow, green, purple, pink
                                      return colors[index % colors.length];
                                    })()
                                  }}
                                >
                                  Intent {index + 1}
                                </span>
                              </h3>
                              <button 
                                onClick={() => moveFramingIntent(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Move Up (Higher Priority)"
                              >
                                &#x25B2;
                              </button>
                              <button 
                                onClick={() => moveFramingIntent(index, 'down')}
                                disabled={index === (fdl.framing_intents || []).length - 1}
                                className="p-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Move Down (Lower Priority)"
                              >
                                &#x25BC;
                              </button>
                            </div>
                            <button
                              onClick={() => removeFramingIntent(index)}
                              className="text-red-600 dark:text-red-500 hover:text-red-800 dark:hover:text-red-400 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Quick Aspect Ratio
                              </label>
                              <select
                                onChange={(e) => {
                                  const selectedLabelValue = e.target.value;
                                  const ratioObj = COMMON_ASPECT_RATIOS.find(r => r.label === selectedLabelValue);
                                  if (ratioObj) {
                                    updateFramingIntent(index, { aspect_ratio: ratioObj.ratio, label: selectedLabelValue });
                                  } else {
                                    if (selectedLabelValue === '') { 
                                         updateFramingIntent(index, { 
                                            aspect_ratio: { width: intent.aspect_ratio.width, height: intent.aspect_ratio.height } 
                                        });
                                    } else {
                                         updateFramingIntent(index, { label: intent.label || '' });
                                    }
                                  }
                                }}
                                value={COMMON_ASPECT_RATIOS.find(r => r.ratio.width === intent.aspect_ratio.width && r.ratio.height === intent.aspect_ratio.height)?.label || ''}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Custom...</option>
                                {COMMON_ASPECT_RATIOS.map((ratio) => (
                                  <option key={ratio.label} value={ratio.label}>
                                    {ratio.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Label
                              </label>
                              <input
                                type="text"
                                value={intent.label || ''}
                                onChange={(e) => updateFramingIntent(index, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 16:9 or Safety"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ID
                              </label>
                              <input
                                type="text"
                                value={intent.id}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Second Row for Protection, Width, Height */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Protection (%)
                              </label>
                              <input
                                type="number"
                                value={intent.protection || ''}
                                onChange={(e) => updateFramingIntent(index, { 
                                  protection: e.target.value ? Number(e.target.value) : undefined
                                })}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional (0-99)"
                                min="0"
                                max="99"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Width (Aspect Ratio Unit)
                              </label>
                              <input
                                type="number"
                                value={intent.aspect_ratio.width}
                                onChange={(e) => updateFramingIntent(index, { 
                                  aspect_ratio: { ...intent.aspect_ratio, width: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Height (Aspect Ratio Unit)
                              </label>
                              <input
                                type="number"
                                value={intent.aspect_ratio.height}
                                onChange={(e) => updateFramingIntent(index, { 
                                  aspect_ratio: { ...intent.aspect_ratio, height: Number(e.target.value) }
                                })}
                                className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(!fdl.framing_intents || fdl.framing_intents.length === 0) && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No framing intents defined. Click "Add Intent" to get started.
                      </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-400 dark:border-gray-500">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Framing Intent
                      </label>
                      <select
                        value={fdl.default_framing_intent || ''}
                        onChange={(e) => updateFDL({ default_framing_intent: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {(fdl.framing_intents || []).map((intent) => (
                          <option key={intent.id} value={intent.id}>
                            {intent.label || intent.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Visualizer Context Selector - Placed above the visualizer */}
                {(fdl.contexts && fdl.contexts.length > 0) && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-400 dark:border-gray-600 p-4 mb-6">
                    <label htmlFor="visualized-context-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Camera Setup to Visualize:
                    </label>
                    <select
                      id="visualized-context-select"
                      value={selectedVisualizedContextIndex === null ? '' : selectedVisualizedContextIndex}
                      onChange={(e) => setSelectedVisualizedContextIndex(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(fdl.contexts || []).map((context, index) => {
                        const selection = selectedCameraSelections[index] || { manufacturer: '', model: '' };
                        return (
                          <option key={`vis-ctx-${index}`} value={index}>
                            {context.label || `Camera Setup ${index + 1}`}
                            {selection.model ? ` (${selection.manufacturer} ${selection.model})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* FDL Visualizer */}
                <FDLVisualizer fdl={fdl} visualizedContextIndex={selectedVisualizedContextIndex} />

                {/* Frame Leader Editor - New Section */}
                {(fdl.contexts && fdl.contexts.length > 0 && selectedVisualizedContextIndex !== null) && (
                  <FrameLeaderEditor 
                    fdl={fdl} 
                    visualizedContextIndex={selectedVisualizedContextIndex} 
                    onChange={updateFDL}
                  />
                )}
        </div>
      </div>
    </div>
  );
};

export default FDLEditor;