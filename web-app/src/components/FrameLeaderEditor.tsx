import React, { useState, useEffect } from 'react';
import type { FDL, FramingIntent, Canvas } from '../types/fdl';

export interface TextElementSettings {
  text: string;
  fontSize: number;
  position: { x: number; y: number };
  // Future: color, fontFamily, etc.
}

export interface FrameLeaderSettings {
  title: TextElementSettings;
  director: TextElementSettings;
  dop: TextElementSettings;
  text1: TextElementSettings;
  text2: TextElementSettings;

  // showFrameLinesA: boolean; // To be replaced by dynamic intent visibility
  // showFrameLinesB: boolean;
  intentVisibility: { [intentId: string]: boolean };

  centerMarkerEnabled: boolean;
  centerMarkerSize: number;
  siemensStarsEnabled: boolean;
  siemensStarsSize: number;
  anamorphicDesqueezeInPreview: boolean;
}

const intentColors = ["#f87171", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"];

interface FrameLeaderEditorProps {
  fdl: FDL;
  visualizedContextIndex: number | null;
}

const FrameLeaderEditor: React.FC<FrameLeaderEditorProps> = ({ fdl, visualizedContextIndex }) => {
  const createInitialIntentVisibility = () => {
    const visibility: { [intentId: string]: boolean } = {};
    (fdl.framing_intents || []).forEach((intent, idx) => {
      visibility[intent.id] = idx < 2; // Default to showing first two intents
    });
    return visibility;
  };

  // Define constants used in initial state BEFORE useState
  const svgPreviewViewBoxWidth = 800;
  const svgPreviewViewBoxHeight = 450;

  const [settings, setSettings] = useState<FrameLeaderSettings>({
    title: { text: '', fontSize: 20, position: { x: 400, y: 35 } },
    director: { text: '', fontSize: 14, position: { x: 400, y: 60 } },
    dop: { text: '', fontSize: 14, position: { x: 400, y: 80 } },
    text1: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 40 } },
    text2: { text: '', fontSize: 12, position: { x: 400, y: svgPreviewViewBoxHeight - 25 } },
    intentVisibility: createInitialIntentVisibility(),
    centerMarkerEnabled: true,
    centerMarkerSize: 28,
    siemensStarsEnabled: true,
    siemensStarsSize: 28,
    anamorphicDesqueezeInPreview: false,
  });

  useEffect(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      intentVisibility: createInitialIntentVisibility()
    }));
  }, [fdl.framing_intents]); // Re-run if fdl.framing_intents itself changes

  const handleTextElementChange = (
    elementKey: 'title' | 'director' | 'dop' | 'text1' | 'text2',
    field: keyof TextElementSettings,
    value: string | number | TextElementSettings['position'] // Updated value type
  ) => {
    setSettings(prev => ({
      ...prev,
      [elementKey]: {
        ...(prev[elementKey] as TextElementSettings),
        [field]: value // Value is now correctly typed for 'position' or string/number
      }
    }));
  };

  const handleGenericSettingChange = <K extends keyof Omit<FrameLeaderSettings, 'title'|'director'|'dop'|'text1'|'text2'>>(
    key: K,
    value: FrameLeaderSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const activeContext = 
    visualizedContextIndex !== null && fdl.contexts && fdl.contexts[visualizedContextIndex]
      ? fdl.contexts[visualizedContextIndex]
      : null;
  const primaryCanvas: Canvas | null = 
    activeContext?.canvases && activeContext.canvases.length > 0 
      ? activeContext.canvases[0] 
      : null;

  // Define validIntents here so it's accessible by the UI rendering part
  const validIntents = (fdl.framing_intents || []).filter(i => i.aspect_ratio && i.aspect_ratio.width > 0 && i.aspect_ratio.height > 0);

  const renderFramelines = () => {
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
          const originalCanvasWidthPx = primaryCanvas.dimensions.width;
          const originalCanvasHeightPx = primaryCanvas.dimensions.height;
          const intentAr = intent.aspect_ratio.width / intent.aspect_ratio.height;
          let fullIntentWidthPx = originalCanvasWidthPx;
          let fullIntentHeightPx = originalCanvasWidthPx / intentAr;
          if (fullIntentHeightPx > originalCanvasHeightPx) {
            fullIntentHeightPx = originalCanvasHeightPx;
            fullIntentWidthPx = originalCanvasHeightPx * intentAr;
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
          const intentBaseAnchorXPx = (originalCanvasWidthPx - fullIntentWidthPx) / 2;
          const intentBaseAnchorYPx = (originalCanvasHeightPx - fullIntentHeightPx) / 2;
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

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-3">Frame Leader & Lens Illumination Settings</h2>
      <div className="mb-6">
        <span className="px-4 py-2 bg-yellow-400 text-gray-800 font-medium rounded-md text-sm">Frame Leader</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-end max-w-3xl mx-auto">
            <div className="sm:col-span-2">
              <label htmlFor="fl-title-text" className="block text-sm font-medium text-gray-700 text-center">Title</label>
              <input type="text" id="fl-title-text" value={settings.title.text} onChange={e => handleTextElementChange('title', 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder="Production Title"/>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="fl-title-fontsize" className="block text-xs font-medium text-gray-600 text-center">Size</label>
              <input type="number" id="fl-title-fontsize" value={settings.title.fontSize} onChange={e => handleTextElementChange('title', 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 gap-x-2 items-center">
              <div>
                <label htmlFor="fl-title-posx" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">X: {settings.title.position.x}</label>
                <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id="fl-title-posx" value={settings.title.position.x} onChange={e => handleTextElementChange('title', 'position', { ...settings.title.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label htmlFor="fl-title-posy" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">Y: {settings.title.position.y}</label>
                <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id="fl-title-posy" value={settings.title.position.y} onChange={e => handleTextElementChange('title', 'position', { ...settings.title.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-end max-w-3xl mx-auto">
            <div className="sm:col-span-2">
              <label htmlFor="fl-director-text" className="block text-sm font-medium text-gray-700 text-center">Director</label>
              <input type="text" id="fl-director-text" value={settings.director.text} onChange={e => handleTextElementChange('director', 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder="Director Name"/>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="fl-director-fontsize" className="block text-xs font-medium text-gray-600 text-center">Size</label>
              <input type="number" id="fl-director-fontsize" value={settings.director.fontSize} onChange={e => handleTextElementChange('director', 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 gap-x-2 items-center">
              <div>
                <label htmlFor="fl-director-posx" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">X: {settings.director.position.x}</label>
                <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id="fl-director-posx" value={settings.director.position.x} onChange={e => handleTextElementChange('director', 'position', { ...settings.director.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label htmlFor="fl-director-posy" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">Y: {settings.director.position.y}</label>
                <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id="fl-director-posy" value={settings.director.position.y} onChange={e => handleTextElementChange('director', 'position', { ...settings.director.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-end max-w-3xl mx-auto">
            <div className="sm:col-span-2">
              <label htmlFor="fl-dop-text" className="block text-sm font-medium text-gray-700 text-center">DoP</label>
              <input type="text" id="fl-dop-text" value={settings.dop.text} onChange={e => handleTextElementChange('dop', 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder="Cinematographer Name"/>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="fl-dop-fontsize" className="block text-xs font-medium text-gray-600 text-center">Size</label>
              <input type="number" id="fl-dop-fontsize" value={settings.dop.fontSize} onChange={e => handleTextElementChange('dop', 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 gap-x-2 items-center">
              <div>
                <label htmlFor="fl-dop-posx" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">X: {settings.dop.position.x}</label>
                <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id="fl-dop-posx" value={settings.dop.position.x} onChange={e => handleTextElementChange('dop', 'position', { ...settings.dop.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label htmlFor="fl-dop-posy" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">Y: {settings.dop.position.y}</label>
                <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id="fl-dop-posy" value={settings.dop.position.y} onChange={e => handleTextElementChange('dop', 'position', { ...settings.dop.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-end max-w-3xl mx-auto">
            <div className="sm:col-span-2">
              <label htmlFor="fl-text1-text" className="block text-sm font-medium text-gray-700 text-center">Text1</label>
              <input type="text" id="fl-text1-text" value={settings.text1.text} onChange={e => handleTextElementChange('text1', 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder="Additional Text Line 1"/>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="fl-text1-fontsize" className="block text-xs font-medium text-gray-600 text-center">Size</label>
              <input type="number" id="fl-text1-fontsize" value={settings.text1.fontSize} onChange={e => handleTextElementChange('text1', 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 gap-x-2 items-center">
              <div>
                <label htmlFor="fl-text1-posx" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">X: {settings.text1.position.x}</label>
                <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id="fl-text1-posx" value={settings.text1.position.x} onChange={e => handleTextElementChange('text1', 'position', { ...settings.text1.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label htmlFor="fl-text1-posy" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">Y: {settings.text1.position.y}</label>
                <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id="fl-text1-posy" value={settings.text1.position.y} onChange={e => handleTextElementChange('text1', 'position', { ...settings.text1.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-x-4 gap-y-2 items-end max-w-3xl mx-auto">
            <div className="sm:col-span-2">
              <label htmlFor="fl-text2-text" className="block text-sm font-medium text-gray-700 text-center">Text2</label>
              <input type="text" id="fl-text2-text" value={settings.text2.text} onChange={e => handleTextElementChange('text2', 'text', e.target.value)} className="mt-1 w-full fdl-input" placeholder="Additional Text Line 2"/>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="fl-text2-fontsize" className="block text-xs font-medium text-gray-600 text-center">Size</label>
              <input type="number" id="fl-text2-fontsize" value={settings.text2.fontSize} onChange={e => handleTextElementChange('text2', 'fontSize', Number(e.target.value))} className="mt-1 w-full fdl-input-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 gap-x-2 items-center">
              <div>
                <label htmlFor="fl-text2-posx" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">X: {settings.text2.position.x}</label>
                <input type="range" min="0" max={svgPreviewViewBoxWidth} step="1" id="fl-text2-posx" value={settings.text2.position.x} onChange={e => handleTextElementChange('text2', 'position', { ...settings.text2.position, x: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label htmlFor="fl-text2-posy" className="block text-xs font-medium text-gray-600 whitespace-nowrap text-center">Y: {settings.text2.position.y}</label>
                <input type="range" min="0" max={svgPreviewViewBoxHeight} step="1" id="fl-text2-posy" value={settings.text2.position.y} onChange={e => handleTextElementChange('text2', 'position', { ...settings.text2.position, y: Number(e.target.value) })} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
          </div>

          <div className="pt-4 max-w-3xl mx-auto">
            <button type="button" className="w-full fdl-button-secondary">Reset to Defaults</button>
          </div>

          <div className="space-y-3 pt-6 border-t max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <label htmlFor="fl-centerMarker" className="flex items-center text-sm font-medium text-gray-700">
                <input type="checkbox" id="fl-centerMarker" checked={settings.centerMarkerEnabled} onChange={e => handleGenericSettingChange('centerMarkerEnabled', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                Center Marker
              </label>
              {settings.centerMarkerEnabled && (
                <input type="number" value={settings.centerMarkerSize} onChange={e => handleGenericSettingChange('centerMarkerSize', parseInt(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="fl-siemensStars" className="flex items-center text-sm font-medium text-gray-700">
                <input type="checkbox" id="fl-siemensStars" checked={settings.siemensStarsEnabled} onChange={e => handleGenericSettingChange('siemensStarsEnabled', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                Siemens Stars
              </label>
              {settings.siemensStarsEnabled && (
                <input type="number" value={settings.siemensStarsSize} onChange={e => handleGenericSettingChange('siemensStarsSize', parseInt(e.target.value))} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm" />
              )}
            </div>

            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Show Framing Intents:</h4>
              {validIntents.map((intent, idx) => (
                <div key={intent.id} className="flex items-center">
                  <input 
                    type="checkbox" 
                    id={`fl-showIntent-${intent.id}`}
                    checked={settings.intentVisibility[intent.id] || false}
                    onChange={e => {
                      const newVisibility = { ...settings.intentVisibility, [intent.id]: e.target.checked };
                      handleGenericSettingChange('intentVisibility', newVisibility);
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor={`fl-showIntent-${intent.id}`} className="text-sm font-medium text-gray-700">
                    {intent.label || `Intent ${idx + 1}`} (Color {idx + 1})
                  </label>
              </div>
              ))}
              {validIntents.length === 0 && <p className="text-xs text-gray-500">No framing intents defined in FDL.</p>}
            </div>
          </div>
          
          <div className="pt-3 border-t max-w-3xl mx-auto">
            <label className="block text-sm font-medium text-gray-700">Upload Custom Logo</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">or drag 'n' drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Frame Leader Preview</h3>
        <div className="mb-3">
          <label htmlFor="fl-anamorphicDesqueeze" className="flex items-center text-sm font-medium text-gray-700">
            <input type="checkbox" id="fl-anamorphicDesqueeze" checked={settings.anamorphicDesqueezeInPreview} onChange={e => handleGenericSettingChange('anamorphicDesqueezeInPreview', e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded" />
            Anamorphic Desqueeze
          </label>
        </div>
        <div 
            className="w-full bg-gray-100 border border-gray-300 rounded overflow-hidden shadow-inner"
            style={{ minHeight: '400px' }}
        >
          <svg 
            width="100%" height="100%" 
            viewBox={`${0} ${0} ${svgPreviewViewBoxWidth} ${svgPreviewViewBoxHeight}`} 
            preserveAspectRatio="xMidYMid meet"
          >
            <rect width="100%" height="100%" fill="white" />
            {primaryCanvas && renderFramelines()}
            {(!primaryCanvas || validIntents.length === 0) && (
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fill="#888">
                Frame Leader Preview Area
                {(!primaryCanvas) && " (No canvas selected)"}
                {(primaryCanvas && validIntents.length === 0) && " (No framelines defined)"}
              </text>
            )}
            {settings.title.text && (
            <text x={settings.title.position.x} y={settings.title.position.y} fontSize={settings.title.fontSize} dominantBaseline="middle" textAnchor="middle" fill="#333">
                {settings.title.text}
            </text>
            )}
            {settings.director.text && (
              <text x={settings.director.position.x} y={settings.director.position.y} fontSize={settings.director.fontSize} dominantBaseline="middle" textAnchor="middle" fill="#444">
                  {`Director: ${settings.director.text}`}
              </text>
            )}
            {settings.dop.text && (
              <text x={settings.dop.position.x} y={settings.dop.position.y} fontSize={settings.dop.fontSize} dominantBaseline="middle" textAnchor="middle" fill="#444">
                  {`DoP: ${settings.dop.text}`}
              </text>
            )}
            {settings.text1.text && (
              <text x={settings.text1.position.x} y={settings.text1.position.y} fontSize={settings.text1.fontSize} dominantBaseline="middle" textAnchor="middle" fill="#555">
                  {settings.text1.text}
              </text>
            )}
            {settings.text2.text && (
              <text x={settings.text2.position.x} y={settings.text2.position.y} fontSize={settings.text2.fontSize} dominantBaseline="middle" textAnchor="middle" fill="#555">
                  {settings.text2.text}
              </text>
            )}
            {settings.siemensStarsEnabled && (
              <>
                <circle cx="50" cy="50" r={settings.siemensStarsSize / 2} fill="black" /> 
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FrameLeaderEditor; 