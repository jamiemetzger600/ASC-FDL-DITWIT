import React, { useState, useEffect, useRef } from 'react';
import type { FDL, FramingIntent, Canvas, FramingDecision } from '../types/fdl';
import { jsPDF, type jsPDFOptions } from 'jspdf';
import 'svg2pdf.js'; // Extends jsPDF. Must be imported after jsPDF
import { generateFDLId } from '../validation/fdlValidator';
import { calculateFramingDecisionGeometry } from '../utils/fdlGeometry'; // Import the function
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
    title: { text: 'PRODUCTION TITLE', fontSize: 20, position: { x: 400, y: 35 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false },
    director: { text: 'Director Name', fontSize: 14, position: { x: 400, y: 60 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false },
    dp: { text: 'DP Name', fontSize: 14, position: { x: 400, y: 80 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false }, 
    text1: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 40 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false },
    text2: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 25 }, fontFamily: PREDEFINED_FONTS[0].family, bold: false, italic: false, underline: false },
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
  
  // Initialize exportFilename based on the default title text
  const [exportFilename, setExportFilename] = useState<string>(
    () => sanitizeFilename(getDefaultFrameLeaderSettings().title.text) || 'frame-leader'
  );
  const [isFilenameManuallyEdited, setIsFilenameManuallyEdited] = useState<boolean>(false);

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
          const intentAr = intent.aspect_ratio.width / intent.aspect_ratio.height;
          let fullIntentWidthPx = originalCanvasWidthPxForIntent;
          let fullIntentHeightPx = originalCanvasWidthPxForIntent / intentAr;
          if (fullIntentHeightPx > originalCanvasHeightPxForIntent) {
            fullIntentHeightPx = originalCanvasHeightPxForIntent;
            fullIntentWidthPx = originalCanvasHeightPxForIntent * intentAr;
          }
          let displayIntentWidthPx = fullIntentWidthPx;
          let displayIntentHeightPx = fullIntentHeightPx;
          let anchorOffsetX = 0; 
          let anchorOffsetY = 0;
          if (intent.protection && intent.protection > 0 && intent.protection < 100) {
            const protectionPercent = intent.protection / 100;
            const horizontalReduction = fullIntentWidthPx * protectionPercent;
            const verticalReduction = fullIntentHeightPx * protectionPercent;
            displayIntentWidthPx = fullIntentWidthPx - horizontalReduction;
            displayIntentHeightPx = fullIntentHeightPx - verticalReduction;
            anchorOffsetX = horizontalReduction / 2;
            anchorOffsetY = verticalReduction / 2;
          }
          const intentBaseAnchorXPx = (originalCanvasWidthPxForIntent - fullIntentWidthPx) / 2;
          const intentBaseAnchorYPx = (originalCanvasHeightPxForIntent - fullIntentHeightPx) / 2;
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
    const { scaledCanvasWidth, scaledCanvasHeight, canvasRectX, canvasRectY } = scaledDims;
    const starRadius = settings.siemensStarsSize / 2; 
    const positions = [
      { x: canvasRectX + starRadius + 5, y: canvasRectY + starRadius + 5 }, 
      { x: canvasRectX + scaledCanvasWidth - starRadius - 5, y: canvasRectY + starRadius + 5 }, 
      { x: canvasRectX + starRadius + 5, y: canvasRectY + scaledCanvasHeight - starRadius - 5 }, 
      { x: canvasRectX + scaledCanvasWidth - starRadius - 5, y: canvasRectY + scaledCanvasHeight - starRadius - 5 }, 
    ];
    const numSegments = 16; 
    return positions.map((pos, index) => (
      <g key={`siemens-star-${index}`} transform={`translate(${pos.x}, ${pos.y})`}>
        {Array.from({ length: numSegments }).map((_, i) => (
          <path
            key={i}
            d={`M 0 0 L ${starRadius * Math.cos(2 * Math.PI * i / numSegments)} ${starRadius * Math.sin(2 * Math.PI * i / numSegments)} L ${starRadius * Math.cos(2 * Math.PI * (i + 0.5) / numSegments)} ${starRadius * Math.sin(2 * Math.PI * (i + 0.5) / numSegments)} Z`}
            fill={i % 2 === 0 ? 'black' : 'white'}
          />
        ))}
        <circle cx="0" cy="0" r={starRadius} stroke="black" strokeWidth="0.5" fill="none" />
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

  // Helper to render individual text element in preview
  const renderTextElement = (elementKey: 'title' | 'director' | 'dp' | 'text1' | 'text2') => {
    const elSettings = settings[elementKey];
    if (!elSettings.text) return null;
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
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <div 
        className="flex justify-between items-center cursor-pointer mb-4 border-b pb-3"
        onClick={() => setIsFrameLeaderSettingsVisible(!isFrameLeaderSettingsVisible)}
      >
        <div className="flex-grow text-center">
          <h2 className="text-xl font-semibold text-gray-900 inline-block">
            Frame Leader Setting
          </h2>
        </div>
        <span className="text-xl text-gray-600">
          {isFrameLeaderSettingsVisible ? '\u25B2' : '\u25BC'} 
        </span>
      </div>

      {isFrameLeaderSettingsVisible && (
        <>
          {/* Section 1: Live Preview and Reset Button (Top) */}
          <div className="mb-6">

            <div className="border rounded-md p-2 bg-gray-50 max-w-3xl mx-auto aspect-video" style={{ aspectRatio: `${svgPreviewViewBoxWidth}/${svgPreviewViewBoxHeight}` }}>
                <svg ref={svgRef} viewBox={`0 0 ${svgPreviewViewBoxWidth} ${svgPreviewViewBoxHeight}`} className="w-full h-full">
                <rect x="0" y="0" width={svgPreviewViewBoxWidth} height={svgPreviewViewBoxHeight} fill="#f0f0f0" />
                {renderFramelines()}
                {renderCenterMarker()}
                {renderSiemensStars()}
                {renderCustomLogo()}
                {renderTextElement('title')}
                {renderTextElement('director')}
                {renderTextElement('dp')}
                {renderTextElement('text1')}
                {renderTextElement('text2')}
                </svg>
            </div>
          </div>
          
          {/* Section 2: Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Text Element Controls */}
            <div className="md:col-span-2 space-y-3 pr-4 md:border-r border-gray-200">
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
                  placeholderText = 'Production Title';
                } else if (key === 'director') {
                  placeholderText = 'Director Name';
                }
                
                return (
                  <div key={key} className="space-y-2 pb-3 mb-3 border-b border-gray-100 last:border-b-0 last:pb-0 last:mb-0">
                    <h4 className="text-md font-semibold text-gray-800 text-left">{labelText}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-end">
                      <div className="sm:col-span-2">
                        <label htmlFor={`fl-${key}-text`} className="block text-sm font-medium text-gray-700 text-left">Text</label>
                        <input type="text" id={`fl-${key}-text`} value={currentSettings.text} onChange={e => handleTextElementChange(key, 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder={placeholderText}/>
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor={`fl-${key}-fontsize`} className="block text-sm font-medium text-gray-700 text-left">Size</label>
                        <input type="number" id={`fl-${key}-fontsize`} value={currentSettings.fontSize} onChange={e => handleTextElementChange(key, 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-2 items-center sm:col-span-7 mt-1">
                        <div className="sm:col-span-2">
                            <label htmlFor={`fl-${key}-posx`} className="block text-xs font-medium text-gray-600 whitespace-nowrap">X: {currentSettings.position.x}</label>
                            <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id={`fl-${key}-posx`} value={currentSettings.position.x} onChange={e => handleTextElementChange(key, 'position', { ...currentSettings.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor={`fl-${key}-posy`} className="block text-xs font-medium text-gray-600 whitespace-nowrap">Y: {currentSettings.position.y}</label>
                            <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id={`fl-${key}-posy`} value={currentSettings.position.y} onChange={e => handleTextElementChange(key, 'position', { ...currentSettings.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 items-center pt-2 mt-1">
                        <div className="sm:col-span-3">
                            <label htmlFor={`fl-${key}-fontfamily`} className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                            <select id={`fl-${key}-fontfamily`} value={currentSettings.fontFamily} onChange={e => handleTextElementChange(key, 'fontFamily', e.target.value)} className="w-full fdl-input text-sm py-1.5">
                                {allAvailableFonts.map(font => (<option key={font.family} value={font.family}>{font.name}</option>))}
                            </select>
                        </div>
                        <div className="sm:col-span-4 flex space-x-3 items-center pt-5">
                            <label htmlFor={`fl-${key}-bold`} className="flex items-center text-sm text-gray-700 cursor-pointer"><input type="checkbox" id={`fl-${key}-bold`} checked={currentSettings.bold} onChange={e => handleTextElementChange(key, 'bold', e.target.checked)} className="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>Bold</label>
                            <label htmlFor={`fl-${key}-italic`} className="flex items-center text-sm text-gray-700 cursor-pointer"><input type="checkbox" id={`fl-${key}-italic`} checked={currentSettings.italic} onChange={e => handleTextElementChange(key, 'italic', e.target.checked)} className="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>Italic</label>
                            <label htmlFor={`fl-${key}-underline`} className="flex items-center text-sm text-gray-700 cursor-pointer"><input type="checkbox" id={`fl-${key}-underline`} checked={currentSettings.underline} onChange={e => handleTextElementChange(key, 'underline', e.target.checked)} className="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>Underline</label>
                        </div>
                    </div>
                  </div>
                )}
              )}
            </div>

            {/* Right Column: Other Controls in new order */}
            <div className="md:col-span-1 space-y-4 md:pl-4">
              {/* Framing Intents Visibility */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Framing Intents Display</h4>
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
              <div className="flex items-center justify-between pt-2">
                <label htmlFor="fl-anamorphic-desqueeze" className="text-sm font-medium text-gray-700">
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
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fl-center-marker" className="text-sm font-medium text-gray-700">
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
                    <label htmlFor="fl-center-marker-size" className="block text-xs font-medium text-gray-600">Size (px)</label>
                    <input
                      type="number"
                      id="fl-center-marker-size"
                      value={settings.centerMarkerSize}
                      onChange={e => handleGenericSettingChange('centerMarkerSize', Number(e.target.value))}
                      className="mt-1 w-full fdl-input-sm"
                    />
                  </div>
                )}
              </div>

              {/* Siemens Stars Controls */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fl-siemens-stars" className="text-sm font-medium text-gray-700">
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
                    <label htmlFor="fl-siemens-stars-size" className="block text-xs font-medium text-gray-600">Size (px)</label>
                    <input
                      type="number"
                      id="fl-siemens-stars-size"
                      value={settings.siemensStarsSize}
                      onChange={e => handleGenericSettingChange('siemensStarsSize', Number(e.target.value))}
                      className="mt-1 w-full fdl-input-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Custom Logo Section */}
              <div className="pt-3 border-t mt-3">
                <h4 className="text-md font-medium text-gray-700 mb-2">Custom Logo/Image</h4>
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
                      <label htmlFor="fl-custom-logo-size" className="block text-xs font-medium text-gray-600">Size (% of Preview Height)</label>
                      <input
                        type="number"
                        id="fl-custom-logo-size"
                        value={settings.customLogoSize || 15}
                        onChange={e => handleGenericSettingChange('customLogoSize', Number(e.target.value))}
                        className="mt-1 w-full fdl-input-sm"
                        min="1" max="100"
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
              <div className="pt-3 border-t mt-3">
                <h4 className="text-md font-medium text-gray-700 mb-2">Upload Custom Font</h4>
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
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Export Frame Leader</h3>
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
    </div>
  );
};

export default FrameLeaderEditor; 