import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FDL } from '../types/fdl';
import { createEmptyFDL } from '../validation/fdlValidator';

interface FDLState {
  fdl: FDL;
  setFdl: (newFdl: FDL) => void;
  // We can add more specific update actions here later if needed
}

export const useFdlStore = create<FDLState>()(
  persist(
    (set) => ({
      fdl: createEmptyFDL(),
      setFdl: (newFdl) => set({ fdl: newFdl }),
    }),
    {
      name: 'fdl-project-storage', // The key for localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
); 