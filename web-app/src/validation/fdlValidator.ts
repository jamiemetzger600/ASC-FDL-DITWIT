import type { FDL } from '../types/fdl';

// Utility function to generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Utility function to generate valid FDL ID (slugify)
export function generateFDLId(base: string): string {
  return base.replace(/[^A-Za-z0-9_]/g, '_').substring(0, 32);
}

// Create a default/empty FDL structure
export function createEmptyFDL(): FDL {
  return {
    uuid: generateUUID(),
    version: {
      major: 1,
      minor: 1
    },
    fdl_creator: '',
    framing_intents: [],
    contexts: [],
    canvas_templates: []
  };
} 