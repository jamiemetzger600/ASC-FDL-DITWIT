import React, { useState } from 'react';
import type { FDL, Canvas } from '../types/fdl';

interface FDLVisualizerProps {
  fdl: FDL;
  visualizedContextIndex: number | null;
}

const FDLVisualizer: React.FC<FDLVisualizerProps> = ({ fdl, visualizedContextIndex }) => {
  const [showTechInfo, setShowTechInfo] = useState(false);

  const mainContainerStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    backgroundColor: '#ffffff',
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
    width: '300px',
    flexShrink: 0,
    backgroundColor: '#1a1a1a',
    color: '#e0e0e0',
    padding: '1rem',
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    overflowY: 'auto',
    maxHeight: '500px',
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

  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.35rem',
    fontSize: '0.75rem',
  };

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
            
            const intentAr = intent.aspect_ratio.width / intent.aspect_ratio.height;
            
            let fullIntentWidthPx = canvasWidthPx;
            let fullIntentHeightPx = canvasWidthPx / intentAr;

            if (fullIntentHeightPx > canvasHeightPx) {
              fullIntentHeightPx = canvasHeightPx;
              fullIntentWidthPx = canvasHeightPx * intentAr;
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

            const intentBaseAnchorXPx = (canvasWidthPx - fullIntentWidthPx) / 2;
            const intentBaseAnchorYPx = (canvasHeightPx - fullIntentHeightPx) / 2;
            
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
      canvasDisplay = <p className="text-sm text-gray-500">Selected canvas dimensions are invalid (0 or less).</p>;
    }
  } else if (visualizedContextIndex === null && fdl.contexts && fdl.contexts.length > 0) {
    canvasDisplay = <p className="text-sm text-gray-500">Select a Camera Setup from the dropdown above to visualize.</p>;
  } else {
    canvasDisplay = <p className="text-sm text-gray-500">No Camera Setup selected or available to display intents.</p>;
  }

  const renderTechInfoPanel = () => {
    if (!primaryCanvas || visualizedContextIndex === null) {
      return <div style={{ ...techInfoPanelStyle, justifyContent: 'center', alignItems: 'center', display: 'flex' }}><p>No data to display.</p></div>;
    }

    const sensorActiveImageArea = {
      photosites: `${primaryCanvas.photosite_dimensions?.width || 'N/A'} x ${primaryCanvas.photosite_dimensions?.height || 'N/A'} photosites`,
      mm: `${primaryCanvas.physical_dimensions?.width?.toFixed(2) || 'N/A'} x ${primaryCanvas.physical_dimensions?.height?.toFixed(2) || 'N/A'} mm`,
      photositeCount: primaryCanvas.photosite_dimensions?.width && primaryCanvas.photosite_dimensions?.height ? (primaryCanvas.photosite_dimensions.width * primaryCanvas.photosite_dimensions.height).toLocaleString() : 'N/A',
    };
    
    const imageCircle = {
        mm: primaryCanvas.physical_dimensions?.width && primaryCanvas.physical_dimensions?.height ? 
            Math.sqrt(Math.pow(primaryCanvas.physical_dimensions.width, 2) + Math.pow(primaryCanvas.physical_dimensions.height, 2)).toFixed(2) + ' mm' 
            : 'N/A',
    };

    const recordingFileImageContent = `${primaryCanvas.dimensions?.width || 'N/A'} x ${primaryCanvas.dimensions?.height || 'N/A'} px`;

    return (
      <div style={techInfoPanelStyle}>
        <h4 style={techInfoHeaderStyle}>Technical Information</h4>
        
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
          const intentAr = intent.aspect_ratio.width / intent.aspect_ratio.height;
          
          let frameLineWidthPx = primaryCanvas.dimensions?.width || 0;
          let frameLineHeightPx = frameLineWidthPx / intentAr;
          if (frameLineHeightPx > (primaryCanvas.dimensions?.height || 0)) {
            frameLineHeightPx = primaryCanvas.dimensions?.height || 0;
            frameLineWidthPx = frameLineHeightPx * intentAr;
          }
          
          let displayWidth = frameLineWidthPx;
          let displayHeight = frameLineHeightPx;
          if(intent.protection && intent.protection > 0 && intent.protection < 100){
            const protectionFactor = 1 - (intent.protection / 100);
            displayWidth *= protectionFactor;
            displayHeight *= protectionFactor;
          }

          return (
            <div key={`tech-intent-${intent.id || index}`} style={{...techInfoSectionStyle, borderTop: '1px solid #333333', paddingTop: '0.75rem' }}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.3rem'}}>
                <span style={{ ...legendColorSwatchStyle, backgroundColor: `${strokeColor}B3`, borderColor: strokeColor }} />
                <span style={{...techInfoLabelStyle, color: strokeColor, marginBottom: 0 }}>Frame Line: {intent.label || intent.id || `Intent ${index + 1}`}</span>
              </div>
              <p style={techInfoValueStyle}>Size: {Math.round(displayWidth)} x {Math.round(displayHeight)} px</p>
              <p style={techInfoValueStyle}>Aspect Ratio: {intent.aspect_ratio.width}:{intent.aspect_ratio.height} ({intentAr.toFixed(2)}:1)</p>
              {intent.protection && <p style={techInfoValueStyle}>Protection: {intent.protection}%</p>}
            </div>
          );
        })}
        {(!fdl.framing_intents || fdl.framing_intents.filter(i => i.aspect_ratio && i.aspect_ratio.width > 0 && i.aspect_ratio.height > 0).length === 0) && (
           <p style={{...techInfoValueStyle, fontStyle: 'italic' }}>No valid framing intents.</p>
        )}
      </div>
    );
  };

  return (
    <div style={mainContainerStyle} className="fdl-visualizer-main-container">
      <div style={visualizerAreaStyle} className="fdl-visualizer-area">
        <h3 className="text-lg font-medium text-gray-900 mb-4 self-start">Frame Line Preview</h3>
        <button 
          onClick={() => setShowTechInfo(!showTechInfo)} 
          style={toggleButtonStyle}
          className="fdl-button-secondary text-sm mb-3"
        >
          {showTechInfo ? 'Hide' : 'Show'} Technical Info
        </button>
        {canvasDisplay}
        <div style={imageSelectionBarStyle}>
          Image Selection Bar (Placeholder)
        </div>
      </div>
      {showTechInfo && renderTechInfoPanel()}
    </div>
  );
};

export default FDLVisualizer; 