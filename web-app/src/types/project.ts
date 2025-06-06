import type { FDL } from './fdl';
import type { FrameLeaderSettings } from '../stores/frameLeaderSettingsStore';

export interface ProjectMetadata {
  version: string;           // App version that created this
  created: string;           // ISO timestamp
  modified: string;          // ISO timestamp
  creator: string;           // "ASC-DIT-FDL" + user info
  projectName: string;       // User-defined project name
  description?: string;      // Optional project description
}

export interface FDLProject {
  metadata: ProjectMetadata;
  fdl: FDL;
  frameLeaderSettings: FrameLeaderSettings;
}

export const createProjectMetadata = (projectName?: string): ProjectMetadata => {
  const now = new Date().toISOString();
  return {
    version: "1.0.0", // TODO: Get from package.json or env
    created: now,
    modified: now,
    creator: "ASC-DIT-FDL Jamie Metzger [415]515]2841 - Jamiemetzger@gmail.com",
    projectName: projectName || "Untitled Project",
  };
}; 