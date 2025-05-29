// ASC Framing Decision List TypeScript Types
// Based on ASC FDL Specification v1.1

export interface FDLDimensions {
  width: number;
  height: number;
}

export interface FDLPoint {
  x: number;
  y: number;
}

export interface FDLVersion {
  major: 1;
  minor: 0;
}

export interface FramingIntent {
  id: string;
  label?: string;
  aspect_ratio: FDLDimensions;
  protection?: number;
}

export interface FramingDecision {
  id: string;
  label?: string;
  framing_intent_id: string;
  dimensions: FDLDimensions;
  anchor_point: FDLPoint;
  protection_dimensions?: FDLDimensions;
  protection_anchor_point?: FDLPoint;
}

export interface Canvas {
  id: string;
  label?: string;
  source_canvas_id: string;
  dimensions: FDLDimensions;
  effective_dimensions?: FDLDimensions;
  effective_anchor_point?: FDLPoint;
  photosite_dimensions?: FDLDimensions;
  physical_dimensions?: FDLDimensions;
  anamorphic_squeeze?: number;
  framing_decisions: FramingDecision[];
}

export interface Context {
  label?: string;
  context_creator?: string;
  canvases: Canvas[];
  meta?: {
    manufacturer?: string;
    model?: string;
    // Add other meta fields as needed, e.g., selectedResolutionName
  };
}

export type FitSource = 
  | 'framing_decision.dimensions'
  | 'framing_decision.protection_dimensions'
  | 'canvas.dimensions'
  | 'canvas.effective_dimensions';

export type FitMethod = 'width' | 'height' | 'fit_all' | 'fill';

export type AlignmentMethodVertical = 'top' | 'center' | 'bottom';
export type AlignmentMethodHorizontal = 'left' | 'center' | 'right';

export type PreserveFromSourceCanvas = 
  | 'none'
  | 'framing_decision.dimensions'
  | 'framing_decision.protection_dimensions'
  | 'canvas.dimensions'
  | 'canvas.effective_dimensions';

export type RoundEven = 'whole' | 'even';
export type RoundMode = 'up' | 'down' | 'round';

export interface CanvasTemplateRound {
  even: RoundEven;
  mode: RoundMode;
}

export interface CanvasTemplate {
  id: string;
  label?: string;
  target_dimensions: FDLDimensions;
  target_anamorphic_squeeze: number;
  fit_source: FitSource;
  fit_method: FitMethod;
  alignment_method_vertical?: AlignmentMethodVertical;
  alignment_method_horizontal?: AlignmentMethodHorizontal;
  preserve_from_source_canvas?: PreserveFromSourceCanvas;
  maximum_dimensions?: FDLDimensions;
  pad_to_maximum?: boolean;
  round?: CanvasTemplateRound;
}

export interface FDL {
  uuid: string;
  version: FDLVersion;
  fdl_creator?: string;
  default_framing_intent?: string;
  framing_intents?: FramingIntent[];
  contexts?: Context[];
  canvas_templates?: CanvasTemplate[];
}

// Form state interfaces for UI
export interface FDLFormState {
  fdl: FDL;
  isValid: boolean;
  validationErrors: string[];
}

export interface FormErrors {
  [key: string]: string | FormErrors;
}

// Common aspect ratios for quick selection
export const COMMON_ASPECT_RATIOS = [
  { label: '16:9 (1.78:1)', ratio: { width: 16, height: 9 } },
  { label: '4:3 (1.33:1)', ratio: { width: 4, height: 3 } },
  { label: '21:9 (2.35:1)', ratio: { width: 21, height: 9 } },
  { label: '1.85:1', ratio: { width: 185, height: 100 } },
  { label: '2.39:1', ratio: { width: 239, height: 100 } },
  { label: '1:1 (Square)', ratio: { width: 1, height: 1 } },
  { label: '9:16 (Portrait)', ratio: { width: 9, height: 16 } },
] as const;

// Common canvas templates
export const COMMON_CANVAS_TEMPLATES = [
  { label: 'HD 1080p', dimensions: { width: 1920, height: 1080 } },
  { label: '4K UHD', dimensions: { width: 3840, height: 2160 } },
  { label: 'HD 720p', dimensions: { width: 1280, height: 720 } },
  { label: 'SD NTSC', dimensions: { width: 720, height: 480 } },
  { label: 'SD PAL', dimensions: { width: 720, height: 576 } },
  { label: 'iPhone Portrait', dimensions: { width: 1080, height: 1920 } },
  { label: 'Instagram Square', dimensions: { width: 1080, height: 1080 } },
] as const; 