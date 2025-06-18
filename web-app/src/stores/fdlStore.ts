import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FDL } from '../types/fdl';
import { createEmptyFDL } from '../validation/fdlValidator';

interface FDLState {
  fdl: FDL;
  projectName: string;
  setFdl: (newFdl: FDL) => void;
  setProjectName: (name: string) => void;
  // We can add more specific update actions here later if needed
}

export const useFdlStore = create<FDLState>()(
  persist(
    (set) => ({
      fdl: createEmptyFDL(),
      projectName: '',
      setFdl: (newFdl) => set({ fdl: newFdl }),
      setProjectName: (name) => set({ projectName: name }),
    }),
    {
      name: 'fdl-project-storage', // The key for localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
); 