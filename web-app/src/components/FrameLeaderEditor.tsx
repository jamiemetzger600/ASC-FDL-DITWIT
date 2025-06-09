import React, { useState, useEffect, useRef } from 'react';
import type { FDL, FramingIntent, Canvas, FramingDecision } from '../types/fdl';
import { jsPDF, type jsPDFOptions } from 'jspdf';
import 'svg2pdf.js'; // Extends jsPDF. Must be imported after jsPDF
import { generateFDLId } from '../validation/fdlValidator';
import { 
  calculateFramingDecisionGeometry, 
  calculateExactFrameDimensions, 
  calculateFrameWithProtection,
  DEFAULT_ROUNDING,
  type RoundingConfig
} from '../utils/fdlGeometry'; // Import the functions
import { useFrameLeaderSettingsStore, type FrameLeaderSettings, type TextElementSettings, type CustomFont, type CustomImage } from '../stores/frameLeaderSettingsStore';

const intentColors = ["#f87171", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"];

const PREDEFINED_FONTS = [
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Verdana', family: 'Verdana, sans-serif' },
  { name: 'Tahoma', family: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', family: '\'Trebuchet MS\', sans-serif' },
  { name: 'Times New Roman', family: '\'Times New Roman\', Times, serif' },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Courier New', family: '\'Courier New\', Courier, monospace' },
  { name: 'Lucida Console', family: '\'Lucida Console\', Monaco, monospace' }
];



interface FrameLeaderEditorProps {
  fdl: FDL;
  visualizedContextIndex: number | null;
  onChange: (fdl: FDL) => void;
}

// Helper function to calculate geometry for a FramingDecision
// function calculateFramingDecisionGeometry( ... MOVED TO fdlGeometry.ts ... )

// Helper function to sanitize filename
const sanitizeFilename = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9\-_.]/g, '') // Remove non-alphanumeric characters except hyphens, underscores, periods
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single one
};

const FRAME_LEADER_SETTINGS_STORAGE_KEY = 'fdl-frameleader-settings';

const FrameLeaderEditor: React.FC<FrameLeaderEditorProps> = ({ fdl, visualizedContextIndex, onChange }) => {
  const svgPreviewViewBoxWidth = 800;
  const svgPreviewViewBoxHeight = 450;
  const svgRef = useRef<SVGSVGElement>(null);

  // Zustand store integration
  const { settings, setSettings, updateSettings, resetSettings, addCustomFont, addCustomImage } = useFrameLeaderSettingsStore();

  const activeContext = 
    visualizedContextIndex !== null && fdl.contexts && fdl.contexts[visualizedContextIndex]
      ? fdl.contexts[visualizedContextIndex]
      : null;
  const primaryCanvas: Canvas | null = 
    activeContext?.canvases && activeContext.canvases.length > 0 
      ? activeContext.canvases[0] 
      : null;

  const createInitialIntentVisibility = () => {
    const visibility: { [intentId: string]: boolean } = {};
    // Initialize based on existing framing_decisions for the current canvas
    const currentDecisionIntentIds = new Set(
      primaryCanvas?.framing_decisions?.map(fd => fd.framing_intent_id) || []
    );
    (fdl.framing_intents || []).forEach((intent) => {
      visibility[intent.id] = currentDecisionIntentIds.has(intent.id);
    });
    return visibility;
  };
  
  const getDefaultFrameLeaderSettings = (): FrameLeaderSettings => ({
    title: { text: 'PRODUCTION TITLE', fontSize: 20, position: { x: 400, y: 35 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false, visible: true },
    director: { text: 'Director: ', fontSize: 14, position: { x: 400, y: 60 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false, visible: true },
    dp: { text: 'DP: ', fontSize: 14, position: { x: 400, y: 80 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false, visible: true }, 
    text1: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 40 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false, visible: false },
    text2: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 25 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false, visible: false },
    intentVisibility: createInitialIntentVisibility(),
    centerMarkerEnabled: true,
    centerMarkerSize: 28,
    siemensStarsEnabled: true,
    siemensStarsSize: 35,
    anamorphicDesqueezeInPreview: false,
        customLogoEnabled: false,
    customLogoUrl: null,
    customLogoSize: 15,
    customLogoPosition: { x: 50, y: 50 },
    showCameraInfo: true,
    showPixelDimensions: true,
    showSensorDimensions: true,
    showFormatArrow: true,
    cameraInfoPosition: { x: 400, y: 120 },
    cameraInfoFontSize: 12,
    customFonts: [],
    customImages: [], 
  });
  
  // Initialize store on first render or when hydrated state is null
  useEffect(() => {
    if (settings === null) {
      const defaultSettings = getDefaultFrameLeaderSettings();
      const savedSettings = useFrameLeaderSettingsStore.getState().settings; // Get hydrated state
      setSettings(savedSettings || defaultSettings);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Restore custom fonts to document.fonts when component loads
  useEffect(() => {
    const loadCustomFonts = async () => {
      if (settings?.customFonts) {
        for (const font of settings.customFonts) {
          try {
            // Check if font is already loaded to avoid duplicates
            const existingFont = Array.from(document.fonts).find(f => f.family === font.family);
            if (!existingFont) {
              const newFont = new FontFace(font.family, `url(${font.data})`);
              await newFont.load();
              document.fonts.add(newFont);
            }
          } catch (error) {
            console.warn(`Failed to restore font ${font.name}:`, error);
          }
        }
      }
    };
    
    if (settings) {
      loadCustomFonts();
    }
  }, [settings?.customFonts]);

  const [isFrameLeaderSettingsVisible, setIsFrameLeaderSettingsVisible] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  
  // Initialize exportFilename based on the default title text
  const [exportFilename, setExportFilename] = useState<string>(
    () => sanitizeFilename(getDefaultFrameLeaderSettings().title.text) || 'frame-leader'
  );
  const [isFilenameManuallyEdited, setIsFilenameManuallyEdited] = useState<boolean>(false);
  const [openFormattingDropdown, setOpenFormattingDropdown] = useState<string | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  useEffect(() => {
    if (settings) {
      updateSettings({ intentVisibility: createInitialIntentVisibility() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fdl.framing_intents, primaryCanvas]); // Depend on primaryCanvas to re-init visibility

  // Effect to update exportFilename when settings.title.text changes, if not manually edited
  useEffect(() => {
    if (!isFilenameManuallyEdited && settings?.title?.text) {
      setExportFilename(sanitizeFilename(settings.title.text) || 'frame-leader');
    }
  }, [settings?.title?.text, isFilenameManuallyEdited]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFormattingDropdown && !(event.target as Element).closest('.relative')) {
        setOpenFormattingDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFormattingDropdown]);

  // Handle escape key to close fullscreen preview
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreenPreview) {
        setIsFullscreenPreview(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isFullscreenPreview]);

  const handleIntentVisibilityChange = (intentId: string, isVisible: boolean) => {
    if (!primaryCanvas || visualizedContextIndex === null) return;

    const newFdl = JSON.parse(JSON.stringify(fdl)) as FDL; // Deep clone
    const targetCanvas = newFdl.contexts?.[visualizedContextIndex]?.canvases?.[0];

    if (!targetCanvas) return;

    let currentFramingDecisions = targetCanvas.framing_decisions || [];

    if (isVisible) {
      // Add FramingDecision if not already present
      if (!currentFramingDecisions.some(fd => fd.framing_intent_id === intentId)) {
        const intent = fdl.framing_intents?.find(fi => fi.id === intentId);
        if (intent) {
          const geometry = calculateFramingDecisionGeometry(intent, primaryCanvas);
          if (geometry) {
            const newDecision: FramingDecision = {
              id: generateFDLId(intent.label || `decision_${intentId}`),
              label: intent.label || 'Framing Decision',
              framing_intent_id: intentId,
              ...geometry,
            };
            currentFramingDecisions.push(newDecision);
          }
        }
      }
    } else {
      // Remove FramingDecision
      currentFramingDecisions = currentFramingDecisions.filter(fd => fd.framing_intent_id !== intentId);
    }

    targetCanvas.framing_decisions = currentFramingDecisions;
    onChange(newFdl); // Propagate change to FDLEditor

    // Update local settings state for UI checkbox
    updateSettings({
      intentVisibility: {
        ...settings.intentVisibility,
        [intentId]: isVisible,
      },
    });
  };

  const handleTextElementChange = (
    elementKey: 'title' | 'director' | 'dp' | 'text1' | 'text2',
    field: keyof TextElementSettings,
    value: string | number | boolean | TextElementSettings['position']
  ) => {
    updateSettings({
      [elementKey]: {
        ...(settings[elementKey] as TextElementSettings),
        [field]: value
      }
    });
  };

  const handleGenericSettingChange = <K extends keyof Omit<FrameLeaderSettings, 'title'|'director'|'dp'|'text1'|'text2'>>(
    key: K,
    value: FrameLeaderSettings[K]
  ) => {
    updateSettings({ [key]: value } as Partial<FrameLeaderSettings>);
  };
  
  const resetToDefaults = () => {
    const defaultSettings = getDefaultFrameLeaderSettings();
    resetSettings(defaultSettings);
    setExportFilename(sanitizeFilename(defaultSettings.title.text) || 'frame-leader');
    setIsFilenameManuallyEdited(false); // Reset manual edit flag
    alert('Settings have been reset to their defaults.');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({
          customLogoUrl: reader.result as string,
          customLogoEnabled: true, 
        });
      };
      reader.onerror = (error) => {
        console.error("Error reading file for custom logo:", error);
        alert("Error uploading logo. Please try a different file or check the console.");
        updateSettings({
          customLogoUrl: null,
          customLogoEnabled: false,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fontName = file.name.split('.')[0]; // Simple name from filename
    // Sanitize and make unique if needed, e.g., by appending a timestamp or counter
    const fontFamilyName = `user-${fontName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

    try {
      const fontDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newFont = new FontFace(fontFamilyName, `url(${fontDataUrl})`);
      await newFont.load();
      document.fonts.add(newFont);

      // Add to persistent store
      const customFont: CustomFont = {
        id: `font-${Date.now()}`,
        name: fontName,
        family: fontFamilyName,
        data: fontDataUrl,
        format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        originalFilename: file.name
      };
      addCustomFont(customFont);
      alert(`Font '${fontName}' uploaded and ready to use.`);

    } catch (error) {
      console.error("Error loading font:", error);
      alert(`Failed to load font '${fontName}'. Please try a different file or check console.`);
    }
    // Reset file input so the same file can be uploaded again if needed
    event.target.value = ''; 
  };

  const validIntents = (fdl.framing_intents || []).filter(i => i.aspect_ratio && i.aspect_ratio.width > 0 && i.aspect_ratio.height > 0);
  
  const getScaledCanvasDimensions = () => {
    if (!primaryCanvas || !primaryCanvas.dimensions) return null;
    let canvasWidthPx = primaryCanvas.dimensions.width;
    const canvasHeightPx = primaryCanvas.dimensions.height;
    if (canvasWidthPx <= 0 || canvasHeightPx <= 0) return null;

    if (settings.anamorphicDesqueezeInPreview && primaryCanvas.anamorphic_squeeze && primaryCanvas.anamorphic_squeeze > 1) {
      canvasWidthPx *= primaryCanvas.anamorphic_squeeze;
    }

    const canvasAspectRatio = canvasWidthPx / canvasHeightPx;
    let scaledCanvasWidth = svgPreviewViewBoxWidth * 0.9; 
    let scaledCanvasHeight = scaledCanvasWidth / canvasAspectRatio;

    if (scaledCanvasHeight > svgPreviewViewBoxHeight * 0.9) {
      scaledCanvasHeight = svgPreviewViewBoxHeight * 0.9;
      scaledCanvasWidth = scaledCanvasHeight * canvasAspectRatio;
    }
    
    const canvasRectX = (svgPreviewViewBoxWidth - scaledCanvasWidth) / 2;
    const canvasRectY = (svgPreviewViewBoxHeight - scaledCanvasHeight) / 2;
    const overallScale = scaledCanvasWidth / canvasWidthPx; 

    return {
      canvasWidthPx, 
      canvasHeightPx, 
      scaledCanvasWidth, 
      scaledCanvasHeight, 
      canvasRectX, 
      canvasRectY, 
      overallScale, 
    };
  };

  const renderFramelines = () => {
    const scaledDims = getScaledCanvasDimensions();
    if (!scaledDims || !primaryCanvas || !primaryCanvas.dimensions) return null;

    const {
      scaledCanvasWidth,
      scaledCanvasHeight,
      canvasRectX,
      canvasRectY,
      overallScale
    } = scaledDims;

    const intentsToRender: (FramingIntent & { color: string })[] = [];
    validIntents.forEach((intent, originalIndex) => {
        if (settings.intentVisibility[intent.id]) {
            intentsToRender.push({ ...intent, color: intentColors[originalIndex % intentColors.length] });
        }
    });

    return (
      <>
        <rect 
          x={canvasRectX} y={canvasRectY} 
          width={scaledCanvasWidth} height={scaledCanvasHeight} 
          fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1"
        />
        {intentsToRender.map((intent, idx) => {
          const originalCanvasWidthPxForIntent = primaryCanvas.dimensions.width; 
          const originalCanvasHeightPxForIntent = primaryCanvas.dimensions.height;
          
          // Use precise calculation method with ASC FDL rounding
          const frameDimensions = calculateExactFrameDimensions(
            originalCanvasWidthPxForIntent,
            originalCanvasHeightPxForIntent,
            intent.aspect_ratio.width,
            intent.aspect_ratio.height,
            DEFAULT_ROUNDING
          );
          
          let displayIntentWidthPx = frameDimensions.width;
          let displayIntentHeightPx = frameDimensions.height;
          let anchorOffsetX = 0; 
          let anchorOffsetY = 0;
          
          if (intent.protection && intent.protection > 0 && intent.protection < 100) {
            const protectionResult = calculateFrameWithProtection(
              frameDimensions.width,
              frameDimensions.height,
              intent.protection,
              DEFAULT_ROUNDING
            );
            displayIntentWidthPx = protectionResult.width;
            displayIntentHeightPx = protectionResult.height;
            anchorOffsetX = protectionResult.offsetX;
            anchorOffsetY = protectionResult.offsetY;
          }
          
          const intentBaseAnchorXPx = (originalCanvasWidthPxForIntent - frameDimensions.width) / 2;
          const intentBaseAnchorYPx = (originalCanvasHeightPxForIntent - frameDimensions.height) / 2;
          const finalIntentAnchorXPx = intentBaseAnchorXPx + anchorOffsetX;
          const finalIntentAnchorYPx = intentBaseAnchorYPx + anchorOffsetY;
          const scaledIntentWidth = displayIntentWidthPx * overallScale;
          const scaledIntentHeight = displayIntentHeightPx * overallScale;
          const intentRectX = canvasRectX + (finalIntentAnchorXPx * overallScale);
          const intentRectY = canvasRectY + (finalIntentAnchorYPx * overallScale);
          return (
            <rect
              key={`fl-intent-${intent.id || idx}`}
              x={intentRectX} y={intentRectY}
              width={scaledIntentWidth} height={scaledIntentHeight}
              fill="none" stroke={intent.color} strokeWidth={2}
            />
          );
        })}
      </>
    );
  };

  const renderCenterMarker = () => {
    if (!settings.centerMarkerEnabled || !primaryCanvas) return null;
    const scaledDims = getScaledCanvasDimensions();
    if (!scaledDims) return null;
    const { scaledCanvasWidth, scaledCanvasHeight, canvasRectX, canvasRectY } = scaledDims;
    const centerX = canvasRectX + scaledCanvasWidth / 2;
    const centerY = canvasRectY + scaledCanvasHeight / 2;
    const markerSize = settings.centerMarkerSize; 
    return (
      <>
        <line x1={centerX - markerSize / 2} y1={centerY} x2={centerX + markerSize / 2} y2={centerY} stroke="black" strokeWidth="1" />
        <line x1={centerX} y1={centerY - markerSize / 2} x2={centerX} y2={centerY + markerSize / 2} stroke="black" strokeWidth="1" />
      </>
    );
  };

  const renderSiemensStars = () => {
    if (!settings.siemensStarsEnabled || !primaryCanvas) return null;
    const scaledDims = getScaledCanvasDimensions();
    if (!scaledDims) return null;
    
    const { scaledCanvasWidth, scaledCanvasHeight, canvasRectX, canvasRectY, overallScale } = scaledDims;
    
    // Calculate star radius based on source resolution and scale for high quality
    const sourceWidth = primaryCanvas.dimensions?.width || 1920;
    const baseStarSize = settings.siemensStarsSize;
    const scaledStarRadius = (baseStarSize * overallScale) / 2;
    
    // Position stars with margin scaled to resolution
    const margin = Math.max(5, scaledStarRadius * 0.2);
    const positions = [
      { x: canvasRectX + scaledStarRadius + margin, y: canvasRectY + scaledStarRadius + margin },
      { x: canvasRectX + scaledCanvasWidth - scaledStarRadius - margin, y: canvasRectY + scaledStarRadius + margin },
      { x: canvasRectX + scaledStarRadius + margin, y: canvasRectY + scaledCanvasHeight - scaledStarRadius - margin },
      { x: canvasRectX + scaledCanvasWidth - scaledStarRadius - margin, y: canvasRectY + scaledCanvasHeight - scaledStarRadius - margin },
    ];
    
    // Higher segment count for better quality, especially at higher resolutions
    const numSegments = Math.max(24, Math.floor(sourceWidth / 100)); // More segments for higher resolution
    const strokeWidth = Math.max(0.5, scaledStarRadius / 50); // Scale stroke width
    
    return positions.map((pos, index) => (
      <g key={`siemens-star-${index}`} transform={`translate(${pos.x}, ${pos.y})`}>
        {Array.from({ length: numSegments }).map((_, i) => {
          const angle1 = (2 * Math.PI * i) / numSegments;
          const angle2 = (2 * Math.PI * (i + 0.5)) / numSegments;
          const x1 = scaledStarRadius * Math.cos(angle1);
          const y1 = scaledStarRadius * Math.sin(angle1);
          const x2 = scaledStarRadius * Math.cos(angle2);
          const y2 = scaledStarRadius * Math.sin(angle2);
          
          return (
            <path
              key={i}
              d={`M 0 0 L ${x1} ${y1} L ${x2} ${y2} Z`}
              fill={i % 2 === 0 ? 'black' : 'white'}
              stroke="none"
            />
          );
        })}
        <circle 
          cx="0" 
          cy="0" 
          r={scaledStarRadius} 
          stroke="black" 
          strokeWidth={strokeWidth} 
          fill="none" 
        />
      </g>
    ));
  };

  const renderCustomLogo = () => {
    const scaledDims = getScaledCanvasDimensions();
    if (!settings.customLogoEnabled || !settings.customLogoUrl || !scaledDims) return null;
    const { svgPreviewViewBoxWidth: previewWidth, svgPreviewViewBoxHeight: previewHeight } = { svgPreviewViewBoxWidth, svgPreviewViewBoxHeight }; 
    const logoSizePercent = settings.customLogoSize || 15;
    const logoHeight = (logoSizePercent / 100) * previewHeight;
    const logoWidth = logoHeight; 
    const positionXPercent = settings.customLogoPosition?.x || 50;
    const positionYPercent = settings.customLogoPosition?.y || 50;
    const x = (positionXPercent / 100) * previewWidth - logoWidth / 2;
    const y = (positionYPercent / 100) * previewHeight - logoHeight / 2;
    return (
      <image
        href={settings.customLogoUrl}
        x={x}
        y={y}
        height={logoHeight}
        width={logoWidth} 
        preserveAspectRatio="xMidYMid meet"
      />
    );
  };

  // Helper to render camera information
  const renderCameraInfo = () => {
    if (!settings?.showCameraInfo || !primaryCanvas) return null;
    
    const canvas = primaryCanvas;
    const dimensions = canvas.dimensions;
    if (!dimensions) return null;

    const cameraName = canvas.label || canvas.source_canvas_id || 'Camera';
    const sensorFormat = '';
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Calculate sensor dimensions (this is placeholder - would need actual sensor info)
    const pixelPitch = 0.00606; // Example for Alexa 35, would need camera-specific data
    const sensorWidthMm = (width * pixelPitch).toFixed(2);
    const sensorHeightMm = (height * pixelPitch).toFixed(2);
    
    const baseY = settings.cameraInfoPosition?.y || 120;
    const fontSize = settings.cameraInfoFontSize || 12;
    const lineHeight = fontSize * 1.4;
    
    let yOffset = 0;
    const elements = [];
    
    // Camera name and format
    elements.push(
      <text key="camera-name" x={settings.cameraInfoPosition?.x || 400} y={baseY + yOffset} 
            fontSize={fontSize + 2} fontFamily={PREDEFINED_FONTS[0].family} fill="black" textAnchor="middle">
        {`${cameraName}${sensorFormat ? ` | ${sensorFormat}` : ''}`}
      </text>
    );
    yOffset += lineHeight + 4;
    
    // Pixel dimensions
    if (settings.showPixelDimensions) {
      elements.push(
        <text key="pixel-dims" x={settings.cameraInfoPosition?.x || 400} y={baseY + yOffset} 
              fontSize={fontSize} fontFamily={PREDEFINED_FONTS[0].family} fill="black" textAnchor="middle">
          {`${width} x ${height}`}
        </text>
      );
      yOffset += lineHeight;
    }
    
    // Sensor dimensions
    if (settings.showSensorDimensions) {
      elements.push(
        <text key="sensor-dims" x={settings.cameraInfoPosition?.x || 400} y={baseY + yOffset} 
              fontSize={fontSize} fontFamily={PREDEFINED_FONTS[0].family} fill="black" textAnchor="middle">
          {`${sensorWidthMm} x ${sensorHeightMm} mm`}
        </text>
      );
      yOffset += lineHeight + 8;
    }
    
    // Format arrow and framing info (if framing intents exist)
    if (settings.showFormatArrow && validIntents.length > 0) {
      const primaryIntent = validIntents[0];
      if (primaryIntent.aspect_ratio) {
        const aspectRatio = primaryIntent.aspect_ratio.width / primaryIntent.aspect_ratio.height;
        const cropWidth = Math.round(height * aspectRatio);
        const cropHeight = height;
        const cropSensorWidthMm = (cropWidth * pixelPitch).toFixed(2);
        const cropSensorHeightMm = (cropHeight * pixelPitch).toFixed(2);
        
        // Format arrow (triangle)
        const x = settings.cameraInfoPosition?.x || 400;
        elements.push(
          <polygon key="format-arrow" 
                   points={`${x - 8},${baseY + yOffset - 2} ${x + 8},${baseY + yOffset - 2} ${x},${baseY + yOffset + 6}`}
                   fill="black" />
        );
        yOffset += 12;
        
        // Format line
        const formatText = `${aspectRatio.toFixed(2)}:1 (${cropWidth} x ${cropHeight}) [${cropSensorWidthMm} x ${cropSensorHeightMm} mm]`;
        elements.push(
          <text key="format-line" x={settings.cameraInfoPosition?.x || 400} y={baseY + yOffset} 
                fontSize={fontSize - 1} fontFamily={PREDEFINED_FONTS[0].family} fill="black" textAnchor="middle">
            {formatText}
          </text>
        );
      }
    }
    
    return <g key="camera-info">{elements}</g>;
  };

  // Helper to render all frame leader content (for reuse in preview and fullscreen)
  const renderFrameLeaderContent = () => (
    <>
      <rect x="0" y="0" width={svgPreviewViewBoxWidth} height={svgPreviewViewBoxHeight} fill="#f0f0f0" />
      {renderFramelines()}
      {renderCenterMarker()}
      {renderSiemensStars()}
      {renderCustomLogo()}
      {renderCameraInfo()}
      {renderTextElement('title')}
      {renderTextElement('director')}
      {renderTextElement('dp')}
      {renderTextElement('text1')}
      {renderTextElement('text2')}
    </>
  );

  // Helper to render individual text element in preview
  const renderTextElement = (elementKey: 'title' | 'director' | 'dp' | 'text1' | 'text2') => {
    const elSettings = settings[elementKey];
    if (!elSettings.text || !elSettings.visible) return null;
    return (
      <text 
        x={elSettings.position.x} 
        y={elSettings.position.y} 
        fontSize={elSettings.fontSize}
        fontFamily={elSettings.fontFamily}
        fontWeight={elSettings.bold ? 'bold' : 'normal'}
        fontStyle={elSettings.italic ? 'italic' : 'normal'}
        textDecoration={elSettings.underline ? 'underline' : 'none'}
        textAnchor="middle" 
        dominantBaseline="middle" 
        fill="black"
      >
        {elSettings.text}
      </text>
    );
  };

  const allAvailableFonts = [...PREDEFINED_FONTS, ...(settings?.customFonts || []).map(font => ({ name: font.name, family: font.family }))];

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSVG = () => {
    if (!svgRef.current) {
      alert('Preview SVG not available for export.');
      return;
    }
    const finalFilename = exportFilename.trim() || 'frame-leader';
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${finalFilename}.svg`);
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!svgRef.current) {
      alert('Preview SVG not available for export.');
      return;
    }
    const finalFilename = exportFilename.trim() || 'frame-leader';

    let exportWidth = primaryCanvas?.dimensions?.width;
    let exportHeight = primaryCanvas?.dimensions?.height;

    if (!exportWidth || !exportHeight) {
      alert('Canvas dimensions not found. Exporting at preview resolution (800x450).');
      exportWidth = svgPreviewViewBoxWidth;
      exportHeight = svgPreviewViewBoxHeight;
    }

    const clonedSvgNode = svgRef.current.cloneNode(true) as SVGSVGElement;
    clonedSvgNode.setAttribute('width', String(exportWidth));
    clonedSvgNode.setAttribute('height', String(exportHeight));
    // The viewBox should inherently be correct from the source svgRef.current

    const backgroundRect = clonedSvgNode.querySelector('rect[x="0"][y="0"]'); 

    if (format === 'png') {
      if (backgroundRect) backgroundRect.setAttribute('fill', 'transparent');
    } else { // jpeg
      if (backgroundRect && backgroundRect.getAttribute('fill') === 'transparent') {
        backgroundRect.setAttribute('fill', '#ffffff');
      } else if (!backgroundRect) {
        const newRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        newRect.setAttribute('x', '0');
        newRect.setAttribute('y', '0');
        newRect.setAttribute('width', String(exportWidth));
        newRect.setAttribute('height', String(exportHeight));
        newRect.setAttribute('fill', '#ffffff');
        clonedSvgNode.insertBefore(newRect, clonedSvgNode.firstChild);
      }
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvgNode);
    const img = new Image();
    // Setting img.width and img.height here might be redundant if SVG has width/height,
    // but it can help ensure the browser interprets the intended size before drawing to canvas.
    img.width = exportWidth; 
    img.height = exportHeight;
    
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth; 
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert('Could not create canvas context for export.');
        return;
      }
      ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpeg' ? 0.9 : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      triggerDownload(dataUrl, `${finalFilename}.${format}`);
      // No URL.revokeObjectURL needed for base64 svgUrl
    };
    img.onerror = () => {
      alert('Error loading SVG for image export.');
       // No URL.revokeObjectURL needed for base64 svgUrl
    };
    img.src = svgUrl;
  };

  const handleExportPDF = async () => {
    if (!svgRef.current) {
      alert('Preview SVG not available for PDF export.');
      return;
    }
    const finalFilename = exportFilename.trim() || 'frame-leader';

    let exportWidth = primaryCanvas?.dimensions?.width;
    let exportHeight = primaryCanvas?.dimensions?.height;

    if (!exportWidth || !exportHeight) {
      alert('Canvas dimensions not found. Exporting PDF at preview resolution (800x450).');
      exportWidth = svgPreviewViewBoxWidth;
      exportHeight = svgPreviewViewBoxHeight;
    }

    try {
      // Create a new jsPDF instance
      const options: jsPDFOptions = {
        orientation: exportWidth > exportHeight ? 'l' : 'p', // landscape or portrait
        unit: 'px',
        format: [exportWidth, exportHeight], // page size in pixels
        hotfixes: ['px_scaling'], // Recommended for px units
      };
      const pdf = new jsPDF(options);

      // Clone the SVG node to avoid modifying the live preview and to set explicit dimensions
      const clonedSvgNode = svgRef.current.cloneNode(true) as SVGSVGElement;
      clonedSvgNode.setAttribute('width', String(exportWidth));
      clonedSvgNode.setAttribute('height', String(exportHeight));
      // Ensure viewBox is present, which it should be from the original SVG
      if (!clonedSvgNode.getAttribute('viewBox')) {
        clonedSvgNode.setAttribute('viewBox', `0 0 ${svgPreviewViewBoxWidth} ${svgPreviewViewBoxHeight}`);
      }

      // Add SVG to PDF
      // The `svg2pdf.js` library extends jsPDF instances with the .svg() method.
      // It returns a promise that resolves when the SVG is added.
      // We need to tell TypeScript that the .svg method exists on jsPDF instance after svg2pdf.js import
      await (pdf as any).svg(clonedSvgNode, {
        x: 0,
        y: 0,
        width: exportWidth,
        height: exportHeight,
      });

      // Save the PDF
      pdf.save(`${finalFilename}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Check the console for details. Custom fonts might not be supported in PDF export.");
    }
  };

  if (!settings) {
    return <div>Loading settings...</div>; // Or a spinner
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-400 dark:border-gray-600 p-6 mt-8">
      <div 
        className="flex justify-between items-center cursor-pointer mb-4 border-b pb-3"
        onClick={() => setIsFrameLeaderSettingsVisible(!isFrameLeaderSettingsVisible)}
      >
        <div className="flex-grow text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 inline-block">
            Frame Leader Setting
          </h2>
        </div>
        <span className="text-xl text-gray-600 dark:text-gray-400">
          {isFrameLeaderSettingsVisible ? '\u25B2' : '\u25BC'} 
        </span>
      </div>

      {isFrameLeaderSettingsVisible && (
        <>
          {/* Section 1: Live Preview and Floating Controls Button */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Frame Leader Preview</h3>
              <button
                onClick={() => setShowFloatingControls(!showFloatingControls)}
                className="fdl-button-secondary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                {showFloatingControls ? 'Hide Controls' : 'Floating Controls'}
              </button>
            </div>

            <div 
              className="border border-gray-400 rounded-md p-2 bg-gray-100 dark:bg-gray-800 dark:border-gray-600 max-w-3xl mx-auto aspect-video cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
              style={{ aspectRatio: `${svgPreviewViewBoxWidth}/${svgPreviewViewBoxHeight}` }}
              onClick={() => setIsFullscreenPreview(true)}
              title="Click to view fullscreen"
            >
                <svg ref={svgRef} viewBox={`0 0 ${svgPreviewViewBoxWidth} ${svgPreviewViewBoxHeight}`} className="w-full h-full">
                  {renderFrameLeaderContent()}
                </svg>
            </div>
          </div>
          
          {/* Section 2: Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Text Element Controls */}
            <div className="md:col-span-2 space-y-4 pr-4 md:border-r border-gray-400 dark:border-gray-600">
              {( ['title', 'director', 'dp', 'text1', 'text2'] as const).map((key) => {
                const currentSettings = settings[key];
                let labelText = key.charAt(0).toUpperCase() + key.slice(1);
                let placeholderText = labelText;

                if (key === 'dp') {
                  labelText = 'DP';
                  placeholderText = 'Cinematographer Name';
                } else if (key === 'text1') {
                  labelText = 'Custom Text 1';
                  placeholderText = 'Custom Text 1';
                } else if (key === 'text2') {
                  labelText = 'Custom Text 2';
                  placeholderText = 'Custom Text 2';
                } else if (key === 'title') {
                  labelText = 'Production';
                  placeholderText = 'Production Title';
                } else if (key === 'director') {
                  placeholderText = 'Director Name';
                }
                
                return (
                  <div key={key} className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 space-y-2 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                                              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 text-left">{labelText}</h4>
                                              <label htmlFor={`fl-${key}-visible`} className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          id={`fl-${key}-visible`} 
                          checked={currentSettings.visible} 
                          onChange={e => handleTextElementChange(key, 'visible', e.target.checked)} 
                          className="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        Show
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-3 items-end">
                      <div className="sm:col-span-2">
                        <input type="text" id={`fl-${key}-text`} value={currentSettings.text} onChange={e => handleTextElementChange(key, 'text', e.target.value)} className="w-full fdl-input" placeholder={placeholderText}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`fl-${key}-fontsize`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">Size: {currentSettings.fontSize}px</label>
                        <input 
                          type="range" 
                          min="8" 
                          max="48" 
                          step="1" 
                          id={`fl-${key}-fontsize`} 
                          value={currentSettings.fontSize} 
                          onChange={e => handleTextElementChange(key, 'fontSize', Number(e.target.value))} 
                          className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-2 items-center sm:col-span-7 mt-1">
                        <div className="sm:col-span-2">
                            <label htmlFor={`fl-${key}-posx`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">X: {currentSettings.position.x}</label>
                            <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id={`fl-${key}-posx`} value={currentSettings.position.x} onChange={e => handleTextElementChange(key, 'position', { ...currentSettings.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor={`fl-${key}-posy`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Y: {currentSettings.position.y}</label>
                            <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id={`fl-${key}-posy`} value={currentSettings.position.y} onChange={e => handleTextElementChange(key, 'position', { ...currentSettings.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 items-start pt-2 mt-1">
                        <div>
                                                         <label htmlFor={`fl-${key}-fontfamily`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Font Family</label>
                            <select id={`fl-${key}-fontfamily`} value={currentSettings.fontFamily} onChange={e => handleTextElementChange(key, 'fontFamily', e.target.value)} className="w-full fdl-input text-sm py-1.5">
                                {allAvailableFonts.map(font => (<option key={font.family} value={font.family}>{font.name}</option>))}
                            </select>
                        </div>
                        <div className="relative">
                                                         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Text Style</label>
                            <button
                              type="button"
                              onClick={() => setOpenFormattingDropdown(openFormattingDropdown === `${key}` ? null : `${key}`)}
                              className="w-full fdl-input text-sm py-1.5 text-left flex items-center justify-between"
                            >
                              <span>
                                {[
                                  currentSettings.bold && 'Bold',
                                  currentSettings.italic && 'Italic', 
                                  currentSettings.underline && 'Underline'
                                ].filter(Boolean).join(', ') || 'Normal'}
                              </span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {openFormattingDropdown === `${key}` && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                <div className="py-1">
                                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={currentSettings.bold} 
                                      onChange={e => handleTextElementChange(key, 'bold', e.target.checked)} 
                                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-bold">Bold</span>
                                  </label>
                                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={currentSettings.italic} 
                                      onChange={e => handleTextElementChange(key, 'italic', e.target.checked)} 
                                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm italic">Italic</span>
                                  </label>
                                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={currentSettings.underline} 
                                      onChange={e => handleTextElementChange(key, 'underline', e.target.checked)} 
                                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm underline">Underline</span>
                                  </label>
                                </div>
                              </div>
                            )}
                        </div>
                    </div>
                  </div>
                )}
              )}
            </div>

            {/* Right Column: Other Controls in new order */}
            <div className="md:col-span-1 space-y-4 md:pl-4">
              {/* Framing Intents Visibility */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Framing Intents Display</h4>
                {validIntents.length > 0 ? (
                  validIntents.map((intent, idx) => (
                    <div key={intent.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        id={`intent-vis-${intent.id}`}
                        checked={settings.intentVisibility[intent.id] || false}
                        onChange={(e) => {
                          handleIntentVisibilityChange(intent.id, e.target.checked);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`intent-vis-${intent.id}`} className="ml-2 block text-sm text-gray-900" style={{ color: intentColors[idx % intentColors.length] }}>
                        {intent.label || `Intent ${idx + 1}`}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No valid framing intents defined in FDL.</p>
                )}
              </div>
              
              {/* Anamorphic Desqueeze Toggle */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <label htmlFor="fl-anamorphic-desqueeze" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Desqueeze Anamorphic in Preview
                </label>
                <input
                  type="checkbox"
                  id="fl-anamorphic-desqueeze"
                  checked={settings.anamorphicDesqueezeInPreview}
                  onChange={e => handleGenericSettingChange('anamorphicDesqueezeInPreview', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {/* Center Marker Controls */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fl-center-marker" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Center Marker
                  </label>
                  <input
                    type="checkbox"
                    id="fl-center-marker"
                    checked={settings.centerMarkerEnabled}
                    onChange={e => handleGenericSettingChange('centerMarkerEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                {settings.centerMarkerEnabled && (
                  <div className="ml-2">
                    <label htmlFor="fl-center-marker-size" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Size: {settings.centerMarkerSize}px</label>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      step="1"
                      id="fl-center-marker-size"
                      value={settings.centerMarkerSize}
                      onChange={e => handleGenericSettingChange('centerMarkerSize', Number(e.target.value))}
                      className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Siemens Stars Controls */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fl-siemens-stars" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Siemens Stars
                  </label>
                  <input
                    type="checkbox"
                    id="fl-siemens-stars"
                    checked={settings.siemensStarsEnabled}
                    onChange={e => handleGenericSettingChange('siemensStarsEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                {settings.siemensStarsEnabled && (
                  <div className="ml-2">
                    <label htmlFor="fl-siemens-stars-size" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Size: {settings.siemensStarsSize}px</label>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="10"
                      id="fl-siemens-stars-size"
                      value={settings.siemensStarsSize}
                      onChange={e => handleGenericSettingChange('siemensStarsSize', Number(e.target.value))}
                      className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Camera Information Controls */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="fl-camera-info" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Camera Information
                  </label>
                  <input
                    type="checkbox"
                    id="fl-camera-info"
                    checked={settings?.showCameraInfo || false}
                    onChange={e => handleGenericSettingChange('showCameraInfo', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                {settings?.showCameraInfo && (
                  <div className="ml-2 space-y-2">
                    <div className="space-y-1">
                      <label className="flex items-center text-xs text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings?.showPixelDimensions || false} 
                          onChange={e => handleGenericSettingChange('showPixelDimensions', e.target.checked)} 
                          className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        Show Pixel Dimensions
                      </label>
                      <label className="flex items-center text-xs text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings?.showSensorDimensions || false} 
                          onChange={e => handleGenericSettingChange('showSensorDimensions', e.target.checked)} 
                          className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        Show Sensor Dimensions
                      </label>
                      <label className="flex items-center text-xs text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings?.showFormatArrow || false} 
                          onChange={e => handleGenericSettingChange('showFormatArrow', e.target.checked)} 
                          className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        Show Format Arrow
                      </label>
                    </div>
                    <div>
                                              <label htmlFor="fl-camera-info-size" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Font Size: {settings?.cameraInfoFontSize || 12}px</label>
                        <input
                          type="range"
                          min="8"
                          max="20"
                          step="1"
                          id="fl-camera-info-size"
                          value={settings?.cameraInfoFontSize || 12}
                          onChange={e => handleGenericSettingChange('cameraInfoFontSize', Number(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label htmlFor="fl-camera-info-posx" className="block text-xs font-medium text-gray-600">X: {settings?.cameraInfoPosition?.x || 400}</label>
                        <input 
                          type="range" 
                          min="0" 
                          max={svgPreviewViewBoxWidth} 
                          step="1" 
                          id="fl-camera-info-posx" 
                          value={settings?.cameraInfoPosition?.x || 400} 
                          onChange={e => handleGenericSettingChange('cameraInfoPosition', { ...(settings?.cameraInfoPosition || {x:400,y:120}), x: Number(e.target.value)})} 
                          className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                      </div>
                      <div>
                        <label htmlFor="fl-camera-info-posy" className="block text-xs font-medium text-gray-600">Y: {settings?.cameraInfoPosition?.y || 120}</label>
                        <input 
                          type="range" 
                          min="0" 
                          max={svgPreviewViewBoxHeight} 
                          step="1" 
                          id="fl-camera-info-posy" 
                          value={settings?.cameraInfoPosition?.y || 120} 
                          onChange={e => handleGenericSettingChange('cameraInfoPosition', { ...(settings?.cameraInfoPosition || {x:400,y:120}), y: Number(e.target.value)})} 
                          className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Custom Logo Section */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Logo/Image</h4>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="fl-custom-logo-enabled" className="text-sm font-medium text-gray-700">
                    Show Custom Logo
                  </label>
                  <input
                    type="checkbox"
                    id="fl-custom-logo-enabled"
                    checked={settings.customLogoEnabled || false}
                    onChange={e => handleGenericSettingChange('customLogoEnabled', e.target.checked)}
                    disabled={!settings.customLogoUrl} 
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="mb-2">
                  <label htmlFor="fl-custom-logo-upload" className="block text-xs font-medium text-gray-600">Upload Image</label>
                  <input 
                    type="file" 
                    id="fl-custom-logo-upload" 
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleImageUpload}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {settings.customLogoUrl && settings.customLogoEnabled && (
                     <img src={settings.customLogoUrl} alt="Custom Logo Preview" className="mt-2 max-h-16 border rounded"/>
                  )}
                </div>
                {settings.customLogoEnabled && settings.customLogoUrl && (
                  <>
                    <div className="mb-2">
                      <label htmlFor="fl-custom-logo-size" className="block text-xs font-medium text-gray-600">Size: {settings.customLogoSize || 15}% of Preview Height</label>
                      <input
                        type="range"
                        min="1"
                        max="150"
                        step="1"
                        id="fl-custom-logo-size"
                        value={settings.customLogoSize || 15}
                        onChange={e => handleGenericSettingChange('customLogoSize', Number(e.target.value))}
                        className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="fl-custom-logo-posx" className="block text-xs font-medium text-gray-600">Position X (%)</label>
                        <input 
                            type="range" min="0" max="100" step="1" 
                            id="fl-custom-logo-posx" 
                            value={settings.customLogoPosition?.x || 50} 
                            onChange={e => handleGenericSettingChange('customLogoPosition', { ...(settings.customLogoPosition || {x:50,y:50}), x: Number(e.target.value)})} 
                            className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        <span className="text-xs text-gray-500">{(settings.customLogoPosition?.x || 50)}%</span>
                      </div>
                      <div>
                        <label htmlFor="fl-custom-logo-posy" className="block text-xs font-medium text-gray-600">Position Y (%)</label>
                        <input 
                            type="range" min="0" max="100" step="1" 
                            id="fl-custom-logo-posy" 
                            value={settings.customLogoPosition?.y || 50} 
                            onChange={e => handleGenericSettingChange('customLogoPosition', { ...(settings.customLogoPosition || {x:50,y:50}), y: Number(e.target.value)})} 
                            className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        <span className="text-xs text-gray-500">{(settings.customLogoPosition?.y || 50)}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Custom Font Upload Section */}
              <div className="border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Custom Font</h4>
                <div className="mb-2">
                  <label htmlFor="fl-custom-font-upload" className="block text-xs font-medium text-gray-600">Upload Font File (.ttf, .otf, .woff, .woff2)</label>
                  <input 
                    type="file" 
                    id="fl-custom-font-upload" 
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFontUpload}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {(settings?.customFonts?.length || 0) > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Uploaded fonts (persistent):</p>
                    <ul className="list-disc list-inside pl-2 text-xs text-gray-500">
                      {settings.customFonts.map(font => <li key={font.id}>{font.name}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Export Controls Section */}
              <div className="border-2 border-gray-500 dark:border-gray-500 rounded-lg p-4 bg-gray-100 dark:bg-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Export Frame Leader</h3>
                <div className="mb-3">
                  <label htmlFor="export-filename" className="block text-sm font-medium text-gray-700 mb-1">Filename</label>
                  <input 
                    type="text" 
                    id="export-filename"
                    value={exportFilename}
                    onChange={(e) => {
                      setExportFilename(e.target.value);
                      setIsFilenameManuallyEdited(true); // Mark as manually edited
                    }}
                    className="w-full fdl-input"
                    placeholder="frame-leader"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleExportSVG} className="fdl-button-secondary">Export SVG</button>
                  <button onClick={() => handleExportImage('png')} className="fdl-button-secondary">Export PNG (with Alpha)</button>
                  <button onClick={() => handleExportImage('jpeg')} className="fdl-button-secondary">Export JPEG</button>
                  <button
                    onClick={handleExportPDF}
                    className="fdl-button-secondary"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className="px-4 py-2 text-sm rounded-md bg-gray-200 text-red-700 font-bold hover:bg-gray-300 uppercase"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Floating Controls Panel */}
      {showFloatingControls && isFrameLeaderSettingsVisible && (
        <div className="fixed top-20 right-6 bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-2xl z-40 w-80 max-h-[80vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 border-b border-gray-300 dark:border-gray-600 pb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Controls</h3>
              <button
                onClick={() => setShowFloatingControls(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Logo Controls */}
              {settings.customLogoEnabled && settings.customLogoUrl && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Logo Controls</h4>
                  
                  {/* Logo Size */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Size: {settings.customLogoSize || 15}%</label>
                    <input
                      type="range"
                      min="1"
                      max="150"
                      step="1"
                      value={settings.customLogoSize || 15}
                      onChange={e => handleGenericSettingChange('customLogoSize', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  
                  {/* Logo Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">X Position: {settings.customLogoPosition?.x || 50}%</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1" 
                        value={settings.customLogoPosition?.x || 50} 
                        onChange={e => handleGenericSettingChange('customLogoPosition', { ...(settings.customLogoPosition || {x:50,y:50}), x: Number(e.target.value)})} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Y Position: {settings.customLogoPosition?.y || 50}%</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1" 
                        value={settings.customLogoPosition?.y || 50} 
                        onChange={e => handleGenericSettingChange('customLogoPosition', { ...(settings.customLogoPosition || {x:50,y:50}), y: Number(e.target.value)})} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Text Size Controls */}
              {(['title', 'director', 'dp', 'text1', 'text2'] as const).map((key) => {
                const currentSettings = settings[key];
                if (!currentSettings.visible) return null;
                
                let labelText = key.charAt(0).toUpperCase() + key.slice(1);
                if (key === 'dp') labelText = 'DP';
                else if (key === 'text1') labelText = 'Custom Text 1';
                else if (key === 'text2') labelText = 'Custom Text 2';
                else if (key === 'title') labelText = 'Production';
                
                return (
                  <div key={key} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{labelText} Size</h4>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Size: {currentSettings.fontSize}px</label>
                      <input 
                        type="range" 
                        min="8" 
                        max="48" 
                        step="1" 
                        value={currentSettings.fontSize} 
                        onChange={e => handleTextElementChange(key, 'fontSize', Number(e.target.value))} 
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>
                  </div>
                );
              })}

              {/* Siemens Stars Size Control */}
              {settings.siemensStarsEnabled && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Siemens Stars Size</h4>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Size: {settings.siemensStarsSize || 200}px</label>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="10"
                      value={settings.siemensStarsSize || 200}
                      onChange={e => handleGenericSettingChange('siemensStarsSize', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Center Marker Size Control */}
              {settings.centerMarkerEnabled && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Center Marker Size</h4>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Size: {settings.centerMarkerSize || 20}px</label>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      step="1"
                      value={settings.centerMarkerSize || 20}
                      onChange={e => handleGenericSettingChange('centerMarkerSize', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Quick Toggle Controls */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Toggles</h4>
                <div className="space-y-2">
                  {settings.customLogoUrl && (
                    <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.customLogoEnabled || false} 
                        onChange={e => handleGenericSettingChange('customLogoEnabled', e.target.checked)} 
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Show Logo
                    </label>
                  )}
                  <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.siemensStarsEnabled || false} 
                      onChange={e => handleGenericSettingChange('siemensStarsEnabled', e.target.checked)} 
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Show Siemens Stars
                  </label>
                  <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.centerMarkerEnabled || false} 
                      onChange={e => handleGenericSettingChange('centerMarkerEnabled', e.target.checked)} 
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Show Center Marker
                  </label>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setShowFloatingControls(false)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Close panel to access full settings below
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isFullscreenPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 dark:bg-black dark:bg-opacity-98 z-50 flex items-center justify-center"
          onClick={() => setIsFullscreenPreview(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setIsFullscreenPreview(false)}
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-200 backdrop-blur-sm"
              title="Close (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Instructions */}
            <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
              <p className="text-sm">Click anywhere or press ESC to close</p>
            </div>
            
            {/* Fullscreen SVG */}
            <div 
              className="w-full h-full flex items-center justify-center p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <svg 
                viewBox={`0 0 ${svgPreviewViewBoxWidth} ${svgPreviewViewBoxHeight}`} 
                className="max-w-full max-h-full border border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900 shadow-2xl"
                style={{ aspectRatio: `${svgPreviewViewBoxWidth}/${svgPreviewViewBoxHeight}` }}
              >
                {renderFrameLeaderContent()}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameLeaderEditor; 