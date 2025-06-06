import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types moved from FrameLeaderEditor.tsx
export interface TextElementSettings {
  text: string;
  fontSize: number;
  position: { x: number; y: number };
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface CustomFont {
  id: string;
  name: string;
  family: string;
  data: string; // base64 data URI
  format: string;
  originalFilename: string;
}

export interface CustomImage {
  id: string;
  name: string;
  data: string; // base64 data URI
  format: string;
  originalFilename: string;
  usage: 'logo' | 'custom';
}

export interface FrameLeaderSettings {
  title: TextElementSettings;
  director: TextElementSettings;
  dp: TextElementSettings;
  text1: TextElementSettings;
  text2: TextElementSettings;
  intentVisibility: { [intentId: string]: boolean };
  centerMarkerEnabled: boolean;
  centerMarkerSize: number;
  siemensStarsEnabled: boolean;
  siemensStarsSize: number;
  anamorphicDesqueezeInPreview: boolean;
  customLogoEnabled?: boolean;
  customLogoUrl?: string | null;
  customLogoSize?: number;
  customLogoPosition?: { x: number; y: number };
  // New persistent custom assets
  customFonts: CustomFont[];
  customImages: CustomImage[];
}

// Store definition
interface FrameLeaderSettingsState {
  settings: FrameLeaderSettings;
  setSettings: (newSettings: FrameLeaderSettings) => void;
  updateSettings: (updates: Partial<FrameLeaderSettings>) => void;
  resetSettings: (defaultSettings: FrameLeaderSettings) => void;
  // Asset management methods
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (fontId: string) => void;
  addCustomImage: (image: CustomImage) => void;
  removeCustomImage: (imageId: string) => void;
}

export const useFrameLeaderSettingsStore = create<FrameLeaderSettingsState>()(
  persist(
    (set, get) => ({
      // State will be initialized by the component that first uses the store,
      // as the default settings depend on component props.
      // We provide a placeholder default here.
      settings: null as any, 
      setSettings: (newSettings) => set({ settings: newSettings }),
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
      resetSettings: (defaultSettings) => set({ settings: defaultSettings }),
      // Asset management implementations
      addCustomFont: (font) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          customFonts: [...(state.settings.customFonts || []), font] 
        } 
      })),
      removeCustomFont: (fontId) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          customFonts: (state.settings.customFonts || []).filter(f => f.id !== fontId) 
        } 
      })),
      addCustomImage: (image) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          customImages: [...(state.settings.customImages || []), image] 
        } 
      })),
      removeCustomImage: (imageId) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          customImages: (state.settings.customImages || []).filter(i => i.id !== imageId) 
        } 
      })),
    }),
    {
      name: 'fdl-frameleader-settings', // Local storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the settings object
      partialize: (state) => ({ settings: state.settings }),
    }
  )
); 