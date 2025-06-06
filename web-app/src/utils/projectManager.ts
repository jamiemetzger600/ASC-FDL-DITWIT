import type { FDL } from '../types/fdl';
import type { FrameLeaderSettings } from '../stores/frameLeaderSettingsStore';
import type { FDLProject, ProjectMetadata } from '../types/project';
import { createProjectMetadata } from '../types/project';

export class ProjectManager {
  static exportProject(
    fdl: FDL, 
    frameLeaderSettings: FrameLeaderSettings, 
    projectName?: string
  ): void {
    const project: FDLProject = {
      metadata: createProjectMetadata(projectName),
      fdl,
      frameLeaderSettings
    };

    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const filename = `${project.metadata.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.fdlp`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', filename);
    linkElement.click();
  }

  static async importProject(
    file: File,
    setFdl: (fdl: FDL) => void,
    setSettings: (settings: FrameLeaderSettings) => void
  ): Promise<FDLProject> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          const project = JSON.parse(result) as FDLProject;
          
          // Validate project structure
          if (!project.metadata || !project.fdl || !project.frameLeaderSettings) {
            throw new Error('Invalid project file format');
          }

          // Restore FDL data
          setFdl(project.fdl);
          
          // Restore frame leader settings
          setSettings(project.frameLeaderSettings);
          
          // Restore custom fonts to document.fonts
          if (project.frameLeaderSettings.customFonts) {
            for (const font of project.frameLeaderSettings.customFonts) {
              try {
                // Check if font is already loaded
                const existingFont = Array.from(document.fonts).find(f => f.family === font.family);
                if (!existingFont) {
                  const newFont = new FontFace(font.family, `url(${font.data})`);
                  await newFont.load();
                  document.fonts.add(newFont);
                }
              } catch (error) {
                console.warn(`Failed to restore font ${font.name}:`, error);
              }
            }
          }
          
          resolve(project);
        } catch (error) {
          reject(new Error(`Error importing project file: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading project file'));
      };
      
      reader.readAsText(file);
    });
  }

  static getProjectInfo(file: File): Promise<ProjectMetadata> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const project = JSON.parse(result) as FDLProject;
          
          if (!project.metadata) {
            throw new Error('Invalid project file - no metadata found');
          }
          
          resolve(project.metadata);
        } catch (error) {
          reject(new Error(`Error reading project metadata: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading project file'));
      };
      
      reader.readAsText(file);
    });
  }
} 