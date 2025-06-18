import type { FDL } from '../types/fdl';
import { generateFDLId, generateUUID } from '../validation/fdlValidator';

/**
 * Creates an ASC FDL compliant export structure with all required fields and proper formatting
 */
export function createExportableFDL(fdl: FDL): FDL {
  return {
    uuid: fdl.uuid || generateUUID(),
    version: fdl.version || { major: 1, minor: 1 },
    ...(fdl.fdl_creator && { fdl_creator: fdl.fdl_creator }),
    // Automatically set the first framing intent as the default
    ...(fdl.framing_intents && fdl.framing_intents.length > 0 && { default_framing_intent: fdl.framing_intents[0].id }),
    ...(fdl.framing_intents && fdl.framing_intents.length > 0 && { 
      framing_intents: fdl.framing_intents.map(intent => ({
        ...(intent.label && { label: intent.label }),
        id: intent.id,
        aspect_ratio: {
          width: intent.aspect_ratio.width,
          height: intent.aspect_ratio.height
        },
        ...(intent.protection !== undefined && { protection: intent.protection }),
        ...(intent.offset && (intent.offset.x !== 0 || intent.offset.y !== 0) && { 
          offset: { 
            x: intent.offset.x, 
            y: intent.offset.y 
          } 
        })
      }))
    }),
    ...(fdl.contexts && fdl.contexts.length > 0 && {
      contexts: fdl.contexts.map(context => ({
        ...(context.label && { label: context.label }),
        ...(context.context_creator && { context_creator: context.context_creator }),
        ...(context.rotation !== undefined && context.rotation !== 0 && { rotation: context.rotation }),
        canvases: context.canvases.map(canvas => ({
          ...(canvas.label && { label: canvas.label }),
          id: canvas.id,
          source_canvas_id: canvas.source_canvas_id,
          dimensions: {
            width: canvas.dimensions.width,
            height: canvas.dimensions.height
          },
          ...(canvas.effective_dimensions && {
            effective_dimensions: {
              width: canvas.effective_dimensions.width,
              height: canvas.effective_dimensions.height
            }
          }),
          ...(canvas.effective_anchor_point && {
            effective_anchor_point: {
              x: canvas.effective_anchor_point.x,
              y: canvas.effective_anchor_point.y
            }
          }),
          ...(canvas.photosite_dimensions && {
            photosite_dimensions: {
              width: canvas.photosite_dimensions.width,
              height: canvas.photosite_dimensions.height
            }
          }),
          ...(canvas.physical_dimensions && {
            physical_dimensions: {
              width: canvas.physical_dimensions.width,
              height: canvas.physical_dimensions.height
            }
          }),
          ...(canvas.anamorphic_squeeze !== undefined && { anamorphic_squeeze: canvas.anamorphic_squeeze }),
          ...(canvas.recording_codec && { recording_codec: canvas.recording_codec }),
          framing_decisions: canvas.framing_decisions.map(decision => ({
            ...(decision.label && { label: decision.label }),
            id: decision.id,
            framing_intent_id: decision.framing_intent_id,
            dimensions: {
              width: decision.dimensions.width,
              height: decision.dimensions.height
            },
            anchor_point: {
              x: decision.anchor_point.x,
              y: decision.anchor_point.y
            },
            ...(decision.protection_dimensions && {
              protection_dimensions: {
                width: decision.protection_dimensions.width,
                height: decision.protection_dimensions.height
              }
            }),
            ...(decision.protection_anchor_point && {
              protection_anchor_point: {
                x: decision.protection_anchor_point.x,
                y: decision.protection_anchor_point.y
              }
            })
          }))
        }))
      }))
    }),
    ...(fdl.canvas_templates && fdl.canvas_templates.length > 0 && {
      canvas_templates: fdl.canvas_templates.map(template => ({
        id: template.id,
        ...(template.label && { label: template.label }),
        target_dimensions: {
          width: template.target_dimensions.width,
          height: template.target_dimensions.height
        },
        target_anamorphic_squeeze: template.target_anamorphic_squeeze,
        fit_source: template.fit_source,
        fit_method: template.fit_method,
        ...(template.alignment_method_vertical && { alignment_method_vertical: template.alignment_method_vertical }),
        ...(template.alignment_method_horizontal && { alignment_method_horizontal: template.alignment_method_horizontal }),
        ...(template.preserve_from_source_canvas && { preserve_from_source_canvas: template.preserve_from_source_canvas }),
        ...(template.maximum_dimensions && {
          maximum_dimensions: {
            width: template.maximum_dimensions.width,
            height: template.maximum_dimensions.height
          }
        }),
        ...(template.pad_to_maximum !== undefined && { pad_to_maximum: template.pad_to_maximum }),
        ...(template.round && {
          round: {
            even: template.round.even,
            mode: template.round.mode
          }
        })
      }))
    })
  } as FDL;
}

/**
 * Sanitizes a filename by removing invalid characters and ensuring reasonable length
 */
export function sanitizeFilename(filename: string, fallback: string = 'framing-decision-list'): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove special characters except hyphens, underscores, and spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
    .toLowerCase() || fallback;
}

/**
 * Exports an FDL file with consistent formatting and naming
 */
export function exportFDLFile(fdl: FDL, customFilename?: string): void {
  const exportableFDL = createExportableFDL(fdl);
  
  // Generate filename
  const baseFilename = customFilename || `fdl_${new Date().toISOString().split('T')[0]}`;
  const sanitizedFilename = sanitizeFilename(baseFilename);
  const filename = `${sanitizedFilename}.fdl`;
  
  // Create and download file
  const fdlData = JSON.stringify(exportableFDL, null, 2);
  const blob = new Blob([fdlData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 