import React from 'react';
import type { FDL, Canvas, FramingIntent, FDLDimensions, FDLPoint } from '../types/fdl';

interface FDLVisualizerProps {
  fdl: FDL;
  visualizedContextIndex: number | null;
}

const FDLVisualizer: React.FC<FDLVisualizerProps> = ({ fdl, visualizedContextIndex }) => {
  const containerStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    padding: '1rem',
    minHeight: '350px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: '1.5rem',
  };

  const svgContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    aspectRatio: '16 / 9',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '0.25rem',
    overflow: 'hidden',
  };

  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.25rem',
  };

  const legendColorSwatchStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    marginRight: '8px',
    border: '1px solid #777',
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
  const svgViewportWidth = 500;
  const svgViewportHeight = 300;
  const intentColors = ["#fbbf24", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb7185"];

  if (primaryCanvas && primaryCanvas.dimensions && visualizedContextIndex !== null) {
    const { width: canvasWidthPx, height: canvasHeightPx } = primaryCanvas.dimensions;

    if (canvasWidthPx > 0 && canvasHeightPx > 0) {
      const scaleX = svgViewportWidth / canvasWidthPx;
      const scaleY = svgViewportHeight / canvasHeightPx;
      const overallScale = Math.min(scaleX, scaleY) * 0.9;

      const scaledCanvasWidth = canvasWidthPx * overallScale;
      const scaledCanvasHeight = canvasHeightPx * overallScale;

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
            fill="#e2e8f0"
            stroke="#94a3b8"
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
                  fill={`${strokeColor}30`}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={intentRectX + 5} 
                  y={intentRectY + 12} 
                  fontSize="8" 
                  fill={strokeColor}
                  style={{ pointerEvents: 'none' }}
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

  return (
    <div style={containerStyle}>
      <h3 className="text-lg font-medium text-gray-800 mb-3 self-start">Frameline Visualizer</h3>
      {canvasDisplay}
      
      {primaryCanvas && visualizedContextIndex !== null && (
        <div className="mt-3 text-xs text-left bg-white p-3 border rounded w-full max-w-md shadow-sm">
          <p><strong>Displaying on:</strong> {primaryCanvas.label || 'N/A'} 
            (Context {visualizedContextIndex + 1}{activeContext?.label && activeContext.label !== `Camera Setup ${visualizedContextIndex + 1}` ? `: ${activeContext.label}` : ''} - Canvas 1)
          </p>
          <p><strong>Canvas Dimensions:</strong> {primaryCanvas.dimensions?.width || 'N/A'}x{primaryCanvas.dimensions?.height || 'N/A'} px</p>
          
          <h4 className="font-semibold mt-2 mb-1">Legend:</h4>
          <div style={legendItemStyle}>
            <span style={{ ...legendColorSwatchStyle, backgroundColor: '#e2e8f0' }} />
            <span>Primary Canvas</span>
          </div>
          {(fdl.framing_intents || []).filter(intent => intent.aspect_ratio && intent.aspect_ratio.width > 0 && intent.aspect_ratio.height > 0).map((intent, index) => {
            const strokeColor = intentColors[index % intentColors.length];
            return (
              <div key={`legend-${intent.id || index}`} style={legendItemStyle}>
                <span style={{ ...legendColorSwatchStyle, backgroundColor: `${strokeColor}30`, borderColor: strokeColor }} />
                <span>{intent.label || intent.id || `Intent ${index + 1}`}{intent.protection ? ` (${intent.protection}% prot.)` : ''}</span>
              </div>
            );
          })}
          {(!fdl.framing_intents || fdl.framing_intents.filter(i => i.aspect_ratio && i.aspect_ratio.width > 0 && i.aspect_ratio.height > 0).length === 0) && (
             <p className="italic text-gray-500">No valid framing intents to display.</p>
          )}
        </div>
      )}
      {(visualizedContextIndex === null && fdl.contexts && fdl.contexts.length > 0) &&
         <p className="mt-2 text-sm text-gray-500">Select a Camera Setup from the dropdown to visualize its primary canvas.</p>
      }
      {(!fdl.contexts || fdl.contexts.length === 0) && (
         <p className="mt-2 text-sm text-gray-500">Define a Camera Setup to begin visualization.</p>
      )}
    </div>
  );
};

export default FDLVisualizer; 