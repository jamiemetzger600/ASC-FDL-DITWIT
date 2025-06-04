import type { FramingIntent, Canvas, FramingDecision, FDLPoint, FDLDimensions } from '../types/fdl';

export function calculateFramingDecisionGeometry(
  intent: FramingIntent,
  canvas: Canvas
): Omit<FramingDecision, 'id' | 'label' | 'framing_intent_id'> | null {
  if (!canvas.dimensions || canvas.dimensions.width <= 0 || canvas.dimensions.height <= 0) {
    return null;
  }
  if (!intent.aspect_ratio || intent.aspect_ratio.width <= 0 || intent.aspect_ratio.height <= 0) {
    return null;
  }

  const canvasWidth = canvas.dimensions.width;
  const canvasHeight = canvas.dimensions.height;
  const canvasAR = canvasWidth / canvasHeight;

  const intentAR = intent.aspect_ratio.width / intent.aspect_ratio.height;

  let decisionWidth: number;
  let decisionHeight: number;
  let decisionX: number;
  let decisionY: number;

  // Calculate dimensions to fit intentAR within canvasAR
  if (canvasAR > intentAR) { // Canvas is wider than intent (e.g., 16:9 canvas, 4:3 intent) -> Pillarbox
    decisionHeight = canvasHeight;
    decisionWidth = Math.round(canvasHeight * intentAR);
    decisionX = Math.round((canvasWidth - decisionWidth) / 2);
    decisionY = 0;
  } else if (canvasAR < intentAR) { // Canvas is narrower than intent (e.g., 4:3 canvas, 16:9 intent) -> Letterbox
    decisionWidth = canvasWidth;
    decisionHeight = Math.round(canvasWidth / intentAR);
    decisionX = 0;
    decisionY = Math.round((canvasHeight - decisionHeight) / 2);
  } else { // Canvas and intent have the same aspect ratio
    decisionWidth = canvasWidth;
    decisionHeight = canvasHeight;
    decisionX = 0;
    decisionY = 0;
  }

  const geometry: Omit<FramingDecision, 'id' | 'label' | 'framing_intent_id'> = {
    dimensions: { width: decisionWidth, height: decisionHeight },
    anchor_point: { x: decisionX, y: decisionY },
  };

  // Handle protection if defined (e.g., 10 for 10%)
  if (intent.protection !== undefined && intent.protection > 0 && intent.protection < 100) {
    const protectionPercent = intent.protection / 100.0; // e.g., 19 -> 0.19
    const scaleFactor = 1.0 - protectionPercent; // e.g., 1.0 - 0.19 = 0.81

    geometry.protection_dimensions = {
      width: Math.round(decisionWidth * scaleFactor),
      height: Math.round(decisionHeight * scaleFactor),
    };
    // Anchor point of the protection area is relative to the canvas origin.
    // It's the decision's anchor point plus half of the removed border.
    // The removed border on one side is (decisionWidth * protectionPercent / 2)
    geometry.protection_anchor_point = {
      x: Math.round(decisionX + (decisionWidth * protectionPercent) / 2),
      y: Math.round(decisionY + (decisionHeight * protectionPercent) / 2),
    };
  }

  return geometry;
} 