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
  visible: boolean; // New: visibility toggle for each text element
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
  // Camera information display options
  showCameraInfo: boolean;
  showPixelDimensions: boolean;
  showSensorDimensions: boolean;
  showFormatArrow: boolean;
  cameraInfoPosition: { x: number; y: number };
  cameraInfoFontSize: number;
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
      // Add migration for new camera info properties
      onRehydrateStorage: () => (state) => {
        if (state?.settings) {
          // Ensure new camera info properties exist with defaults
          const defaults = {
            showCameraInfo: true,
            showPixelDimensions: true,
            showSensorDimensions: true,
            showFormatArrow: true,
            cameraInfoPosition: { x: 400, y: 120 },
            cameraInfoFontSize: 12,
            visible: true // for text elements
          };
          
          // Migrate text elements to include visible property
          if (state.settings.title && state.settings.title.visible === undefined) {
            state.settings.title.visible = true;
          }
          if (state.settings.director && state.settings.director.visible === undefined) {
            state.settings.director.visible = true;
          }
          if (state.settings.dp && state.settings.dp.visible === undefined) {
            state.settings.dp.visible = true;
          }
          if (state.settings.text1 && state.settings.text1.visible === undefined) {
            state.settings.text1.visible = false;
          }
          if (state.settings.text2 && state.settings.text2.visible === undefined) {
            state.settings.text2.visible = false;
          }
          
          // Add missing camera info properties
          Object.keys(defaults).forEach(key => {
            if (key !== 'visible' && !(key in state.settings)) {
              (state.settings as any)[key] = (defaults as any)[key];
            }
          });
        }
      },
    }
  )
); 