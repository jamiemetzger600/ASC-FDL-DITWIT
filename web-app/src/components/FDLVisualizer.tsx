import React, { useState } from 'react';
import type { FDL, Canvas } from '../types/fdl';
import { 
  calculateExactFrameDimensions, 
  calculateFrameWithProtection,
  calculateSensorInfo,
  formatNumberForDisplay,
  calculatePreciseAspectRatio,
  DEFAULT_ROUNDING,
  type RoundingConfig
} from '../utils/fdlGeometry';

interface FDLVisualizerProps {
  fdl: FDL;
  visualizedContextIndex: number | null;
}

const FDLVisualizer: React.FC<FDLVisualizerProps> = ({ fdl, visualizedContextIndex }) => {
  const [showTechInfo, setShowTechInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const mainContainerStyle: React.CSSProperties = {
    border: '2px solid #9ca3af',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    backgroundColor: 'var(--bg-color, #f9fafb)',
    display: 'flex',
    flexDirection: 'row',
    gap: '1.5rem',
    marginTop: '1.5rem',
  };

  const visualizerAreaStyle: React.CSSProperties = {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const svgContainerStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#f0f0f0',
    border: '1px solid #cccccc',
    borderRadius: '0.25rem',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  };

  const imageSelectionBarStyle: React.CSSProperties = {
    width: '100%',
    height: '60px',
    backgroundColor: '#e2e8f0',
    border: '1px solid #cbd5e1',
    borderRadius: '0.25rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontSize: '0.875rem',
  };

  const techInfoPanelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    width: '350px',
    maxHeight: '80vh',
    backgroundColor: '#1a1a1a',
    color: '#e0e0e0',
    padding: '1rem',
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    border: '2px solid #444444',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
  };

  const techInfoHeaderStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #444444',
  };

  const techInfoSectionStyle: React.CSSProperties = {
    marginBottom: '1rem',
  };

  const techInfoLabelStyle: React.CSSProperties = {
    fontWeight: '600',
    color: '#a0a0a0',
    display: 'block',
    marginBottom: '0.125rem',
  };

  const techInfoValueStyle: React.CSSProperties = {
    color: '#d0d0d0',
    marginBottom: '0.25rem',
  };

  /* // Removing unused legendItemStyle
  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.35rem',
    fontSize: '0.75rem',
  };
  */

  const legendColorSwatchStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    marginRight: '6px',
    border: '1px solid #777777',
    flexShrink: 0,
  };

  const toggleButtonStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    alignSelf: 'flex-start',
  };

  const activeContext = 
    visualizedContextIndex !== null && fdl.contexts && fdl.contexts[visualizedContextIndex]
      ? fdl.contexts[visualizedContextIndex]
      : null;
  const primaryCanvas: Canvas | null = 
    activeContext?.canvases && activeContext.canvases.length > 0 
      ? activeContext.canvases[0] 
      : null;

  let canvasDisplay;
  const svgViewportWidth = 600;
  const svgViewportHeight = (svgViewportWidth * 9) / 16;
  const intentColors = ["#f87171", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"];

  if (primaryCanvas && primaryCanvas.dimensions && visualizedContextIndex !== null) {
    const { width: canvasWidthPx, height: canvasHeightPx } = primaryCanvas.dimensions;

    if (canvasWidthPx > 0 && canvasHeightPx > 0) {
      const canvasAspectRatio = canvasWidthPx / canvasHeightPx;
      
      let scaledCanvasWidth = svgViewportWidth * 0.95;
      let scaledCanvasHeight = scaledCanvasWidth / canvasAspectRatio;

      if (scaledCanvasHeight > svgViewportHeight * 0.95) {
        scaledCanvasHeight = svgViewportHeight * 0.95;
        scaledCanvasWidth = scaledCanvasHeight * canvasAspectRatio;
      }
      
      const overallScale = scaledCanvasWidth / canvasWidthPx;

      const canvasRectX = (svgViewportWidth - scaledCanvasWidth) / 2;
      const canvasRectY = (svgViewportHeight - scaledCanvasHeight) / 2;
      
      const reversedIntents = [...(fdl.framing_intents || [])].reverse();

      canvasDisplay = (
        <svg
          viewBox={`0 0 ${svgViewportWidth} ${svgViewportHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={svgContainerStyle}
        >
          <rect
            x={canvasRectX}
            y={canvasRectY}
            width={scaledCanvasWidth}
            height={scaledCanvasHeight}
            fill="#d1d5db"
            stroke="#6b7280"
            strokeWidth="0.5"
          />

          {reversedIntents.map((intent) => {
            const originalIndex = (fdl.framing_intents || []).findIndex(i => i.id === intent.id);
            if (originalIndex === -1) return null; 

            if (!intent.aspect_ratio || intent.aspect_ratio.width <= 0 || intent.aspect_ratio.height <= 0) return null;
            
            // Use precise calculation method with ASC FDL rounding
            const frameDimensions = calculateExactFrameDimensions(
              canvasWidthPx,
              canvasHeightPx,
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

            const intentBaseAnchorXPx = (canvasWidthPx - frameDimensions.width) / 2;
            const intentBaseAnchorYPx = (canvasHeightPx - frameDimensions.height) / 2;
            
            const finalIntentAnchorXPx = intentBaseAnchorXPx + anchorOffsetX;
            const finalIntentAnchorYPx = intentBaseAnchorYPx + anchorOffsetY;

            const scaledIntentWidth = displayIntentWidthPx * overallScale;
            const scaledIntentHeight = displayIntentHeightPx * overallScale;
            const intentRectX = canvasRectX + (finalIntentAnchorXPx * overallScale);
            const intentRectY = canvasRectY + (finalIntentAnchorYPx * overallScale);

            const strokeColor = intentColors[originalIndex % intentColors.length];

            return (
              <g key={intent.id || `intent-${originalIndex}`}>
                <rect
                  x={intentRectX}
                  y={intentRectY}
                  width={scaledIntentWidth}
                  height={scaledIntentHeight}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                <text
                  x={intentRectX + scaledIntentWidth - 5}
                  y={intentRectY + 12}
                  fontSize="8"
                  fill={strokeColor}
                  textAnchor="end"
                  style={{ pointerEvents: 'none', fontWeight: 'bold' }}
                >
                  {intent.label || intent.id}{intent.protection ? ` (${intent.protection}% prot.)` : ''}
                </text>
              </g>
            );
          })}
        </svg>
      );
    } else {
      canvasDisplay = <p className="text-sm text-gray-500 dark:text-gray-400">Selected canvas dimensions are invalid (0 or less).</p>;
    }
  } else if (visualizedContextIndex === null && fdl.contexts && fdl.contexts.length > 0) {
    canvasDisplay = <p className="text-sm text-gray-500 dark:text-gray-400">Select a Camera Setup from the dropdown above to visualize.</p>;
  } else {
    canvasDisplay = <p className="text-sm text-gray-500 dark:text-gray-400">No Camera Setup selected or available to display intents.</p>;
  }

  const copyTechnicalInfo = async () => {
    if (!primaryCanvas || visualizedContextIndex === null) return;

    const sensorActiveImageArea = {
      photosites: `${primaryCanvas.photosite_dimensions?.width || 'N/A'} x ${primaryCanvas.photosite_dimensions?.height || 'N/A'} photosites`,
      mm: `${formatNumberForDisplay(primaryCanvas.physical_dimensions?.width || 0)} x ${formatNumberForDisplay(primaryCanvas.physical_dimensions?.height || 0)} mm`,
      photositeCount: primaryCanvas.photosite_dimensions?.width && primaryCanvas.photosite_dimensions?.height ? (primaryCanvas.photosite_dimensions.width * primaryCanvas.photosite_dimensions.height).toLocaleString() : 'N/A',
    };
    
    const imageCircle = {
        mm: primaryCanvas.physical_dimensions?.width && primaryCanvas.physical_dimensions?.height ? 
            formatNumberForDisplay(Math.sqrt(Math.pow(primaryCanvas.physical_dimensions.width, 2) + Math.pow(primaryCanvas.physical_dimensions.height, 2))) + ' mm' 
            : 'N/A',
    };

    const recordingFileImageContent = `${primaryCanvas.dimensions?.width || 'N/A'} x ${primaryCanvas.dimensions?.height || 'N/A'} px`;

    let techInfoText = `Technical Information\n\n`;
    techInfoText += `Displaying On: ${primaryCanvas.label || 'Primary Canvas'} (Context ${visualizedContextIndex + 1}`;
    if (activeContext?.label && activeContext.label !== `Camera Setup ${visualizedContextIndex + 1}`) {
      techInfoText += `: ${activeContext.label}`;
    }
    techInfoText += `)\n`;
    
    if (activeContext?.meta?.manufacturer) {
      techInfoText += `${activeContext.meta.manufacturer} ${activeContext.meta.model}\n`;
    }
    
    techInfoText += `\nSensor Active Image Area: ${sensorActiveImageArea.photosites}\n`;
    techInfoText += `${sensorActiveImageArea.mm}\n`;
    techInfoText += `Photosite Count: ${sensorActiveImageArea.photositeCount}\n`;
    techInfoText += `Image Circle: ${imageCircle.mm}\n`;
    techInfoText += `\nRecording File Image Content: ${recordingFileImageContent}\n`;

    const validIntents = (fdl.framing_intents || []).filter(intent => intent.aspect_ratio && intent.aspect_ratio.width > 0 && intent.aspect_ratio.height > 0);
    
    if (validIntents.length > 0) {
      techInfoText += `\nFraming Intents:\n`;
      validIntents.forEach((intent, index) => {
        const canvasWidth = primaryCanvas.dimensions?.width || 0;
        const canvasHeight = primaryCanvas.dimensions?.height || 0;
        
        // Use precise calculation method with ASC FDL rounding
        const frameDimensions = calculateExactFrameDimensions(
          canvasWidth,
          canvasHeight,
          intent.aspect_ratio.width,
          intent.aspect_ratio.height,
          DEFAULT_ROUNDING
        );
        
        let displayWidth = frameDimensions.width;
        let displayHeight = frameDimensions.height;
        
        if (intent.protection && intent.protection > 0 && intent.protection < 100) {
          const protectionResult = calculateFrameWithProtection(
            frameDimensions.width,
            frameDimensions.height,
            intent.protection,
            DEFAULT_ROUNDING
          );
          displayWidth = protectionResult.width;
          displayHeight = protectionResult.height;
        }

        const preciseAspectRatio = calculatePreciseAspectRatio(intent.aspect_ratio.width, intent.aspect_ratio.height);

        techInfoText += `• ${intent.label || intent.id || `Intent ${index + 1}`}\n`;
        techInfoText += `  Size: ${displayWidth} x ${displayHeight} px\n`;
        techInfoText += `  Aspect Ratio: ${intent.aspect_ratio.width}:${intent.aspect_ratio.height} (${formatNumberForDisplay(preciseAspectRatio)}:1)\n`;
        if (intent.protection) {
          techInfoText += `  Protection: ${intent.protection}%\n`;
        }
      });
    }

    try {
      await navigator.clipboard.writeText(techInfoText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const renderTechInfoPanel = () => {
    if (!primaryCanvas || visualizedContextIndex === null) {
      return <div style={{ ...techInfoPanelStyle, justifyContent: 'center', alignItems: 'center' }}><p>No data to display.</p></div>;
    }

    const sensorActiveImageArea = {
      photosites: `${primaryCanvas.photosite_dimensions?.width || 'N/A'} x ${primaryCanvas.photosite_dimensions?.height || 'N/A'} photosites`,
      mm: `${formatNumberForDisplay(primaryCanvas.physical_dimensions?.width || 0)} x ${formatNumberForDisplay(primaryCanvas.physical_dimensions?.height || 0)} mm`,
      photositeCount: primaryCanvas.photosite_dimensions?.width && primaryCanvas.photosite_dimensions?.height ? (primaryCanvas.photosite_dimensions.width * primaryCanvas.photosite_dimensions.height).toLocaleString() : 'N/A',
    };
    
    const imageCircle = {
        mm: primaryCanvas.physical_dimensions?.width && primaryCanvas.physical_dimensions?.height ? 
            formatNumberForDisplay(Math.sqrt(Math.pow(primaryCanvas.physical_dimensions.width, 2) + Math.pow(primaryCanvas.physical_dimensions.height, 2))) + ' mm' 
            : 'N/A',
    };

    const recordingFileImageContent = `${primaryCanvas.dimensions?.width || 'N/A'} x ${primaryCanvas.dimensions?.height || 'N/A'} px`;

    return (
      <div style={techInfoPanelStyle}>
        <div style={{...techInfoHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 'bold'}}>Technical Information</h4>
          <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
            <button
              onClick={() => setShowTechInfo(false)}
              style={{
                backgroundColor: '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                transition: 'background-color 0.2s'
              }}
              title="Close technical information panel"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Close
            </button>
            <button
              onClick={copyTechnicalInfo}
              style={{
                backgroundColor: copySuccess ? '#10b981' : '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                transition: 'background-color 0.2s'
              }}
              title="Copy technical information to clipboard"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div style={{flex: 1, overflowY: 'auto', paddingRight: '0.5rem'}}>
        
        <div style={techInfoSectionStyle}>
            <span style={techInfoLabelStyle}>Displaying On:</span>
            <p style={techInfoValueStyle}>
                {primaryCanvas.label || 'Primary Canvas'} (Context {visualizedContextIndex + 1}
                {activeContext?.label && activeContext.label !== `Camera Setup ${visualizedContextIndex + 1}` ? `: ${activeContext.label}` : ''})
            </p>
            {activeContext?.meta?.manufacturer && (
                 <p style={techInfoValueStyle}>{activeContext.meta.manufacturer} {activeContext.meta.model}</p>
            )}
        </div>

        <div style={techInfoSectionStyle}>
          <span style={techInfoLabelStyle}>Sensor Active Image Area:</span>
          <p style={techInfoValueStyle}>{sensorActiveImageArea.photosites}</p>
          <p style={techInfoValueStyle}>{sensorActiveImageArea.mm}</p>
          <span style={techInfoLabelStyle}>Photosite Count:</span>
          <p style={techInfoValueStyle}>{sensorActiveImageArea.photositeCount}</p>
          <span style={techInfoLabelStyle}>Image Circle:</span>
          <p style={techInfoValueStyle}>{imageCircle.mm}</p>
        </div>

        <div style={techInfoSectionStyle}>
          <span style={techInfoLabelStyle}>Recording File Image Content:</span>
          <p style={techInfoValueStyle}>{recordingFileImageContent}</p>
        </div>
        
        {(fdl.framing_intents || []).filter(intent => intent.aspect_ratio && intent.aspect_ratio.width > 0 && intent.aspect_ratio.height > 0).map((intent, index) => {
          const strokeColor = intentColors[index % intentColors.length];
          const canvasWidth = primaryCanvas.dimensions?.width || 0;
          const canvasHeight = primaryCanvas.dimensions?.height || 0;
          
                     // Use precise calculation method with ASC FDL rounding
           const frameDimensions = calculateExactFrameDimensions(
             canvasWidth,
             canvasHeight,
             intent.aspect_ratio.width,
             intent.aspect_ratio.height,
             DEFAULT_ROUNDING
           );
          
          let displayWidth = frameDimensions.width;
          let displayHeight = frameDimensions.height;
          
          if (intent.protection && intent.protection > 0 && intent.protection < 100) {
                         const protectionResult = calculateFrameWithProtection(
               frameDimensions.width,
               frameDimensions.height,
               intent.protection,
               DEFAULT_ROUNDING
             );
            displayWidth = protectionResult.width;
            displayHeight = protectionResult.height;
          }

          const preciseAspectRatio = calculatePreciseAspectRatio(intent.aspect_ratio.width, intent.aspect_ratio.height);

          return (
            <div key={`tech-intent-${intent.id || index}`} style={{...techInfoSectionStyle, borderTop: '1px solid #333333', paddingTop: '0.75rem' }}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.3rem'}}>
                <span style={{ ...legendColorSwatchStyle, backgroundColor: `${strokeColor}B3`, borderColor: strokeColor }} />
                <span style={{...techInfoLabelStyle, color: strokeColor, marginBottom: 0 }}>Frame Line: {intent.label || intent.id || `Intent ${index + 1}`}</span>
              </div>
              <p style={techInfoValueStyle}>Size: {displayWidth} x {displayHeight} px</p>
              <p style={techInfoValueStyle}>Aspect Ratio: {intent.aspect_ratio.width}:{intent.aspect_ratio.height} ({formatNumberForDisplay(preciseAspectRatio)}:1)</p>
              {intent.protection && <p style={techInfoValueStyle}>Protection: {intent.protection}%</p>}
            </div>
          );
        })}
        {(!fdl.framing_intents || fdl.framing_intents.filter(i => i.aspect_ratio && i.aspect_ratio.width > 0 && i.aspect_ratio.height > 0).length === 0) && (
           <p style={{...techInfoValueStyle, fontStyle: 'italic' }}>No valid framing intents.</p>
        )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 rounded-lg p-6 mt-6">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 self-center">Frame Line Preview</h3>
        <button 
          onClick={() => setShowTechInfo(!showTechInfo)} 
          className="fdl-button-secondary text-sm mb-3 self-start"
        >
          {showTechInfo ? 'Hide' : 'Show'} Technical Info
        </button>
        {canvasDisplay}
        <div className="w-full h-15 bg-gray-200 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded mt-4 flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm">
          Image Selection Bar (Placeholder)
        </div>
      </div>
      
      {/* Floating Technical Information Panel */}
      {showTechInfo && renderTechInfoPanel()}
    </div>
  );
};

export default FDLVisualizer; 