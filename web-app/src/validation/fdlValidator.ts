import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schema from './ascfdl.schema.json';
import type { FDL } from '../types/fdl';

// Initialize AJV with format support
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Compile the FDL schema
const validateSchema = ajv.compile(schema);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  schemaErrors?: any[];
  idTreeErrors?: string[];
}

// Validate ID tree consistency (ported from Python fdlchecker.py)
function validateIdTree(fdl: FDL): string[] {
  const errors: string[] = [];
  const fiIds = new Set<string>();

  // Validate framing intent IDs
  if (fdl.framing_intents) {
    for (const fi of fdl.framing_intents) {
      if (fiIds.has(fi.id)) {
        errors.push(`Framing Intent ${fi.id} (${fi.label || ''}): ID duplicated`);
      }
      fiIds.add(fi.id);
    }
  }

  // Validate default framing intent reference
  if (fdl.default_framing_intent && !fiIds.has(fdl.default_framing_intent)) {
    errors.push(`Default Framing Intent ${fdl.default_framing_intent}: Not in framing_intents`);
  }

  if (fdl.contexts) {
    const cvIds = new Set<string>();
    const cvSourceCanvasIds = new Set<string>();
    const fdIds = new Set<string>();

    for (const cx of fdl.contexts) {
      const cxLabel = cx.label || '';

      if (cx.canvases) {
        for (const cv of cx.canvases) {
          const cvLabel = cv.label || '';
          
          cvSourceCanvasIds.add(cv.source_canvas_id);

          if (cvIds.has(cv.id)) {
            errors.push(`Context (${cxLabel}) > Canvas ${cv.id} (${cvLabel}): ID duplicated`);
          }
          cvIds.add(cv.id);

          if (cv.framing_decisions) {
            for (const fd of cv.framing_decisions) {
              if (fdIds.has(fd.id)) {
                errors.push(`Context (${cxLabel}) > Canvas ${cv.id} (${cvLabel}) > Framing Decision ${fd.id}: ID duplicated`);
              }
              fdIds.add(fd.id);

              if (!fiIds.has(fd.framing_intent_id)) {
                errors.push(`Context (${cxLabel}) > Canvas ${cv.id} (${cvLabel}) > Framing Decision ${fd.id}: Framing Intent ID ${fd.framing_intent_id} not in framing_intents`);
              }

              const expectedFdId = `${cv.id}-${fd.framing_intent_id}`;
              if (fd.id !== expectedFdId) {
                errors.push(`Context (${cxLabel}) > Canvas ${cv.id} (${cvLabel}) > Framing Decision ${fd.id}: ID doesn't match expected ${expectedFdId}`);
              }
            }
          }
        }
      }
    }

    // Check for unrecognized source canvas IDs
    const unrecognizedCvIds = Array.from(cvSourceCanvasIds).filter(id => !cvIds.has(id));
    if (unrecognizedCvIds.length > 0) {
      errors.push(`Source Canvas IDs [${unrecognizedCvIds.join(', ')}] not in canvases`);
    }
  }

  // Validate canvas template IDs
  if (fdl.canvas_templates) {
    const ctIds = new Set<string>();
    for (const ct of fdl.canvas_templates) {
      if (ctIds.has(ct.id)) {
        errors.push(`Canvas Template ${ct.id} (${ct.label || ''}): ID duplicated`);
      }
      ctIds.add(ct.id);
    }
  }

  return errors;
}

// Main validation function
export function validateFDL(fdl: FDL): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    schemaErrors: [],
    idTreeErrors: []
  };

  // Schema validation
  const isSchemaValid = validateSchema(fdl);
  if (!isSchemaValid) {
    result.isValid = false;
    result.schemaErrors = validateSchema.errors || [];
    result.errors.push(...(validateSchema.errors || []).map(err => 
      `Schema Error: ${err.instancePath || err.schemaPath} ${err.message}`
    ));
  }

  // ID tree validation
  const idTreeErrors = validateIdTree(fdl);
  if (idTreeErrors.length > 0) {
    result.isValid = false;
    result.idTreeErrors = idTreeErrors;
    result.errors.push(...idTreeErrors.map(err => `ID Tree Error: ${err}`));
  }

  return result;
}

// Utility function to generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Utility function to generate valid FDL ID
export function generateFDLId(base: string): string {
  return base.replace(/[^A-Za-z0-9_]/g, '_').substring(0, 32);
}

// Create a default/empty FDL structure
export function createEmptyFDL(): FDL {
  return {
    uuid: generateUUID(),
    version: {
      major: 1,
      minor: 0
    },
    fdl_creator: '',
    framing_intents: [],
    contexts: [],
    canvas_templates: []
  };
} 