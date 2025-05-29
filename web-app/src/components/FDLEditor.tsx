import React, { useState, useEffect } from 'react';
import type { FDL, FramingIntent, Context, Canvas, FDLDimensions as Dimensions, FDLPoint } from '../types/fdl';
import { generateFDLId, generateUUID } from '../validation/fdlValidator';
import { COMMON_ASPECT_RATIOS } from '../types/fdl';
import FDLVisualizer from './FDLVisualizer';

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
}

interface CameraManufacturer {
  name: string;
  models: CameraModel[];
}

const CAMERA_DATA: CameraManufacturer[] = [
  {
    name: "ARRI",
    models: [
      {
        name: "ALEXA 35",
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

const FDLEditor: React.FC<FDLEditorProps> = ({ fdl, onChange }) => {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(CAMERA_DATA[0]?.name || '');
  const [selectedModel, setSelectedModel] = useState<string>(CAMERA_DATA[0]?.models[0]?.name || '');
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState<boolean[]>([]);
  const [visualizedContextIndex, setVisualizedContextIndex] = useState<number | null>(null);

  useEffect(() => {
    if (fdl.contexts && fdl.contexts.length > 0) {
      if (visualizedContextIndex === null || visualizedContextIndex >= fdl.contexts.length) {
        setVisualizedContextIndex(0);
      }
    } else {
      setVisualizedContextIndex(null);
    }
  }, [fdl.contexts, visualizedContextIndex]);

  const updateFDL = (updates: Partial<FDL>) => {
    onChange({ ...fdl, ...updates });
  };

  const addFramingIntent = () => {
    const newIntent: FramingIntent = {
      id: generateFDLId(`intent_${Date.now()}`),
      label: '',
      aspect_ratio: { width: 16, height: 9 }
    };
    const newIntents = [...(fdl.framing_intents || []), newIntent];
    updateFDL({ framing_intents: newIntents });
  };

  const updateFramingIntent = (index: number, updates: Partial<FramingIntent>) => {
    const newIntents = [...(fdl.framing_intents || [])];
    newIntents[index] = { ...newIntents[index], ...updates };
    updateFDL({ framing_intents: newIntents });
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
    const defaultCanvas: Canvas = {
      id: generateFDLId(`canvas_${Date.now()}`),
      source_canvas_id: generateFDLId(`source_canvas_${Date.now()}`),
      label: 'Primary Capture',
      dimensions: { 
        width: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.width || 0, 
        height: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.height || 0 
      },
      effective_dimensions: { 
        width: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.width || 0, 
        height: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.height || 0 
      },
      effective_anchor_point: { x: 0, y: 0 },
      photosite_dimensions: { 
        width: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.width || 0, 
        height: CAMERA_DATA[0]?.models[0]?.resolutions[0]?.height || 0 
      },
      physical_dimensions: { width: 36.70, height: 25.54 },
      anamorphic_squeeze: 1.0,
      framing_decisions: [],
    };
    const newContext: Context = {
      label: `Camera Setup ${(fdl.contexts?.length || 0) + 1}`,
      canvases: [defaultCanvas],
      meta: {
        manufacturer: CAMERA_DATA[0]?.name || '',
        model: CAMERA_DATA[0]?.models[0]?.name || '',
      }
    };
    const newContexts = [...(fdl.contexts || []), newContext];
    updateFDL({ contexts: newContexts });
    setAdvancedSettingsVisible(prev => [...prev, false]);
    if (visualizedContextIndex === null) {
      setVisualizedContextIndex(0);
    }
  };

  const updateContext = (contextIndex: number, updates: Partial<Context>) => {
    const newContexts = [...(fdl.contexts || [])];
    newContexts[contextIndex] = { ...newContexts[contextIndex], ...updates };
    updateFDL({ contexts: newContexts });
  };

  const updateCanvas = (contextIndex: number, canvasIndex: number, updates: Partial<Canvas>) => {
    const newContexts = [...(fdl.contexts || [])];
    if (newContexts[contextIndex] && newContexts[contextIndex].canvases) {
      const canvases = [...(newContexts[contextIndex].canvases || [])];
      canvases[canvasIndex] = { ...canvases[canvasIndex], ...updates };
      newContexts[contextIndex] = { ...newContexts[contextIndex], canvases };
      updateFDL({ contexts: newContexts });
    }
  };

  const removeContext = (contextIndexToRemove: number) => {
    const newContexts = [...(fdl.contexts || [])];
    newContexts.splice(contextIndexToRemove, 1);
    updateFDL({ contexts: newContexts });
    setAdvancedSettingsVisible(prev => prev.filter((_, i) => i !== contextIndexToRemove));

    if (visualizedContextIndex !== null) {
      if (visualizedContextIndex === contextIndexToRemove) {
        setVisualizedContextIndex(newContexts.length > 0 ? 0 : null);
      } else if (visualizedContextIndex > contextIndexToRemove) {
        setVisualizedContextIndex(visualizedContextIndex - 1);
      }
    }
  };

  const toggleAdvancedSettings = (index: number) => {
    setAdvancedSettingsVisible(prev => 
      prev.map((visible, i) => (i === index ? !visible : visible))
    );
  };

  return (
    <div className="space-y-8">
      {/* Camera & Canvas Setups */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Camera & Canvas Setups</h2>
          <button
            onClick={addContext}
            className="fdl-button-primary text-sm"
          >
            Add Camera Setup
          </button>
        </div>
        <div className="space-y-4">
          {(fdl.contexts || []).map((context, contextIndex) => {
            const currentManufacturer = CAMERA_DATA.find(m => m.name === context.meta?.manufacturer);
            const currentModel = currentManufacturer?.models.find(mod => mod.name === context.meta?.model);
            const primaryCanvas = context.canvases && context.canvases.length > 0 ? context.canvases[0] : null;

            return (
            <div key={contextIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Camera Setup {contextIndex + 1}</h3>
                <button
                  onClick={() => removeContext(contextIndex)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Setup Label
                  </label>
                  <input
                    type="text"
                    value={context.label || ''}
                    onChange={(e) => updateContext(contextIndex, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., A-Cam, Scene 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Context Creator
                  </label>
                  <input
                    type="text"
                    value={context.context_creator || ''}
                    onChange={(e) => updateContext(contextIndex, { context_creator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional creator"
                  />
                </div>
              </div>
              
              {/* Camera Selection - New Fields */}
              <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-3">
                <h4 className="text-md font-medium text-gray-800 mb-2 border-b pb-2">Canvas Definition</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`manufacturer-${contextIndex}`} className="block text-sm font-medium text-gray-700 mb-1">Camera Manufacturer</label>
                    <select
                      id={`manufacturer-${contextIndex}`}
                      value={context.meta?.manufacturer || ''}
                      onChange={(e) => {
                        const newManufacturerName = e.target.value;
                        const manufacturer = CAMERA_DATA.find(m => m.name === newManufacturerName);
                        const newModelName = manufacturer?.models[0]?.name || '';
                        const newResolution = manufacturer?.models[0]?.resolutions[0];

                        // Get the current contexts array from the fdl prop
                        const originalContexts = [...(fdl.contexts || [])];
                        // Create a deep copy of the specific context to modify safely
                        const contextToUpdate = JSON.parse(JSON.stringify(originalContexts[contextIndex]));

                        // Update its meta
                        contextToUpdate.meta = {
                          manufacturer: newManufacturerName,
                          model: newModelName,
                        };

                        // If there's a primary canvas and a new resolution, update its dimensions too
                        if (newResolution && contextToUpdate.canvases && contextToUpdate.canvases.length > 0) {
                          const primaryCanvasToUpdate = contextToUpdate.canvases[0];
                          primaryCanvasToUpdate.dimensions = { width: newResolution.width, height: newResolution.height };
                          primaryCanvasToUpdate.effective_dimensions = { width: newResolution.width, height: newResolution.height };
                          primaryCanvasToUpdate.photosite_dimensions = { width: newResolution.width, height: newResolution.height };
                        }
                        
                        // Create the final new contexts array
                        const newContextsArray = originalContexts.map((ctx, idx) => 
                          idx === contextIndex ? contextToUpdate : ctx
                        );

                        // Single update to FDL
                        updateFDL({ contexts: newContextsArray });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Manufacturer</option>
                      {CAMERA_DATA.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`model-${contextIndex}`} className="block text-sm font-medium text-gray-700 mb-1">Camera Model</label>
                    <select
                      id={`model-${contextIndex}`}
                      key={`model-select-${context.meta?.manufacturer || 'none'}-${context.meta?.model || 'none_model'}-${contextIndex}`}
                      value={context.meta?.model || ''}
                      disabled={!currentManufacturer}
                      onChange={(e) => {
                        const newModelName = e.target.value;
                        const currentMetaManufacturer = context.meta?.manufacturer;

                        const manufacturerData = CAMERA_DATA.find(m => m.name === currentMetaManufacturer);
                        const modelData = manufacturerData?.models.find(mod => mod.name === newModelName);
                        const firstResolution = modelData?.resolutions[0];

                        const newContexts = (fdl.contexts || []).map((ctx, idx) => {
                          if (idx === contextIndex) {
                            const updatedCtx = { ...ctx };
                            // Update meta with new model name
                            updatedCtx.meta = { 
                              ...(ctx.meta || {}), 
                              manufacturer: currentMetaManufacturer, // Keep current manufacturer
                              model: newModelName 
                            };

                            // Update canvas dimensions based on the new model's first resolution
                            if (updatedCtx.canvases && updatedCtx.canvases.length > 0) {
                              const updatedPrimaryCanvas = { ...updatedCtx.canvases[0] };
                              if (firstResolution) {
                                updatedPrimaryCanvas.dimensions = { width: firstResolution.width, height: firstResolution.height };
                                updatedPrimaryCanvas.effective_dimensions = { width: firstResolution.width, height: firstResolution.height };
                                updatedPrimaryCanvas.photosite_dimensions = { width: firstResolution.width, height: firstResolution.height };
                              } else {
                                // New model has no resolutions, reset canvas dimensions
                                updatedPrimaryCanvas.dimensions = { width: 0, height: 0 };
                                updatedPrimaryCanvas.effective_dimensions = { width: 0, height: 0 };
                                updatedPrimaryCanvas.photosite_dimensions = { width: 0, height: 0 };
                              }
                              updatedCtx.canvases = [updatedPrimaryCanvas, ...updatedCtx.canvases.slice(1)];
                            }
                            return updatedCtx;
                          }
                          return ctx;
                        });
                        updateFDL({ contexts: newContexts });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Model</option>
                      {currentManufacturer?.models.map(mod => <option key={mod.name} value={mod.name}>{mod.name}</option>)}   
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`resolution-${contextIndex}`} className="block text-sm font-medium text-gray-700 mb-1">Sensor Mode/Resolution</label>
                    <select
                      id={`resolution-${contextIndex}`}
                      key={`resolution-select-${context.meta?.model || 'none'}-${contextIndex}`}
                      disabled={!currentModel}
                      value={primaryCanvas?.dimensions && currentModel?.resolutions.find(r => r.width === primaryCanvas.dimensions.width && r.height === primaryCanvas.dimensions.height)?.name || ''}
                      onChange={(e) => {
                        const selectedResName = e.target.value;
                        const manufacturer = CAMERA_DATA.find(m => m.name === context.meta?.manufacturer);
                        const model = manufacturer?.models.find(mod => mod.name === context.meta?.model);
                        const newResolution = model?.resolutions.find(r => r.name === selectedResName);
                        if (newResolution && primaryCanvas) {
                          updateCanvas(contextIndex, 0, { 
                            dimensions: { width: newResolution.width, height: newResolution.height },
                            effective_dimensions: { width: newResolution.width, height: newResolution.height },
                            photosite_dimensions: { width: newResolution.width, height: newResolution.height },
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Resolution</option>
                      {currentModel?.resolutions.map(res => <option key={res.name} value={res.name}>{res.name} ({res.width}x{res.height})</option>)} 
                    </select>
                  </div>
                </div>

                {/* Primary Canvas Details */}
                {primaryCanvas && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Canvas Label
                        </label>
                        <input
                          type="text"
                          value={primaryCanvas.label || ''}
                          onChange={(e) => updateCanvas(contextIndex, 0, { label: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Main Sensor, VFX Plate"
                        />
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Canvas Width (px)
                        </label>
                        <input
                          type="number"
                          value={primaryCanvas.dimensions?.width || ''}
                          readOnly 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Canvas Height (px)
                        </label>
                        <input
                          type="number"
                          value={primaryCanvas.dimensions?.height || ''}
                          readOnly 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="mt-4">
                      <button 
                        onClick={() => toggleAdvancedSettings(contextIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {advancedSettingsVisible[contextIndex] ? 'Hide' : 'Show'} Advanced Canvas Settings
                      </button>
                    </div>

                    {/* ADVANCED CANVAS FIELDS - Conditionally Rendered */}
                    {advancedSettingsVisible[contextIndex] && primaryCanvas && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                        <h5 className="text-sm font-semibold text-gray-700">Advanced Canvas Properties</h5>
                        
                        {/* Effective Dimensions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Effective Width (px)</label>
                            <input type="number" value={primaryCanvas.effective_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_dimensions: { ...(primaryCanvas.effective_dimensions || { width:0, height:0 }), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Effective Height (px)</label>
                            <input type="number" value={primaryCanvas.effective_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_dimensions: { ...(primaryCanvas.effective_dimensions || { width:0, height:0 }), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                        </div>

                        {/* Effective Anchor Point */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Effective Anchor X</label>
                            <input type="number" value={primaryCanvas.effective_anchor_point?.x || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_anchor_point: { ...(primaryCanvas.effective_anchor_point || {x:0, y:0}), x: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Effective Anchor Y</label>
                            <input type="number" value={primaryCanvas.effective_anchor_point?.y || ''} onChange={(e) => updateCanvas(contextIndex, 0, { effective_anchor_point: { ...(primaryCanvas.effective_anchor_point || {x:0, y:0}), y: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                        </div>

                        {/* Photosite Dimensions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Photosite Width (px)</label>
                            <input type="number" value={primaryCanvas.photosite_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { photosite_dimensions: { ...(primaryCanvas.photosite_dimensions || {width:0, height:0}), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Photosite Height (px)</label>
                            <input type="number" value={primaryCanvas.photosite_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { photosite_dimensions: { ...(primaryCanvas.photosite_dimensions || {width:0, height:0}), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                        </div>

                        {/* Physical Dimensions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Physical Width (mm)</label>
                            <input type="number" step="0.01" value={primaryCanvas.physical_dimensions?.width || ''} onChange={(e) => updateCanvas(contextIndex, 0, { physical_dimensions: { ...(primaryCanvas.physical_dimensions || {width:0, height:0}), width: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Physical Height (mm)</label>
                            <input type="number" step="0.01" value={primaryCanvas.physical_dimensions?.height || ''} onChange={(e) => updateCanvas(contextIndex, 0, { physical_dimensions: { ...(primaryCanvas.physical_dimensions || {width:0, height:0}), height: Number(e.target.value) }})} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                          </div>
                        </div>
                        
                        {/* Anamorphic Squeeze */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Anamorphic Squeeze</label>
                          <input type="number" step="0.01" value={primaryCanvas.anamorphic_squeeze || ''} onChange={(e) => updateCanvas(contextIndex, 0, { anamorphic_squeeze: Number(e.target.value) })} className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
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
            <div className="text-center py-8 text-gray-500">
              No Camera Setups defined. Click "Add Camera Setup" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Framing Intents */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Framing Intents (Drag to reorder, Top = Highest Priority)</h2>
          <button
            onClick={addFramingIntent}
            className="fdl-button-primary text-sm"
          >
            Add Intent
          </button>
        </div>
        <div className="space-y-4">
          {(fdl.framing_intents || []).map((intent, index) => (
            <div key={intent.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">Intent {index + 1}</h3>
                  <button 
                    onClick={() => moveFramingIntent(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move Up (Higher Priority)"
                  >
                    &#x25B2; {/* UP ARROW */}
                  </button>
                  <button 
                    onClick={() => moveFramingIntent(index, 'down')}
                    disabled={index === (fdl.framing_intents || []).length - 1}
                    className="p-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move Down (Lower Priority)"
                  >
                    &#x25BC; {/* DOWN ARROW */}
                  </button>
                </div>
                <button
                  onClick={() => removeFramingIntent(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID
                  </label>
                  <input
                    type="text"
                    value={intent.id}
                    onChange={(e) => updateFramingIntent(index, { id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={intent.label || ''}
                    onChange={(e) => updateFramingIntent(index, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional label"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quick Aspect Ratio
                  </label>
                  <select
                    onChange={(e) => {
                      const ratio = COMMON_ASPECT_RATIOS.find(r => r.label === e.target.value)?.ratio;
                      if (ratio) {
                        updateFramingIntent(index, { aspect_ratio: ratio });
                      }
                    }}
                    value={COMMON_ASPECT_RATIOS.find(r => r.ratio.width === intent.aspect_ratio.width && r.ratio.height === intent.aspect_ratio.height)?.label || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={intent.aspect_ratio.width}
                    onChange={(e) => updateFramingIntent(index, { 
                      aspect_ratio: { ...intent.aspect_ratio, width: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={intent.aspect_ratio.height}
                    onChange={(e) => updateFramingIntent(index, { 
                      aspect_ratio: { ...intent.aspect_ratio, height: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protection (%)
                  </label>
                  <input
                    type="number"
                    value={intent.protection || ''}
                    onChange={(e) => updateFramingIntent(index, { 
                      protection: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          ))}
          {(!fdl.framing_intents || fdl.framing_intents.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No framing intents defined. Click "Add Intent" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Visualizer Context Selector - Placed above the visualizer */}
      {(fdl.contexts && fdl.contexts.length > 0) && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label htmlFor="visualized-context-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Camera Setup to Visualize:
          </label>
          <select
            id="visualized-context-select"
            value={visualizedContextIndex === null ? '' : visualizedContextIndex}
            onChange={(e) => setVisualizedContextIndex(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(fdl.contexts || []).map((context, index) => (
              <option key={`vis-ctx-${index}`} value={index}>
                {context.label || `Camera Setup ${index + 1}`}
                {context.meta?.model ? ` (${context.meta.manufacturer} ${context.meta.model})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* FDL Visualizer */}
      <FDLVisualizer fdl={fdl} visualizedContextIndex={visualizedContextIndex} />

      {/* General Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">General Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UUID
            </label>
            <input
              type="text"
              value={fdl.uuid}
              onChange={(e) => updateFDL({ uuid: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FDL Creator
            </label>
            <input
              type="text"
              value={fdl.fdl_creator || ''}
              onChange={(e) => updateFDL({ fdl_creator: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Creator name or organization"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Framing Intent
            </label>
            <select
              value={fdl.default_framing_intent || ''}
              onChange={(e) => updateFDL({ default_framing_intent: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
};

export default FDLEditor; 