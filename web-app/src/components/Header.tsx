import React, { useRef } from 'react';
import { useFrameLeaderSettingsStore } from '../stores/frameLeaderSettingsStore';
import { useFdlStore } from '../stores/fdlStore';
import { ProjectManager } from '../utils/projectManager';

interface HeaderProps {
  onExport: () => void;
  onImport: (file: File) => void;
  // onToggleTestDataViewer: () => void;
  // isTestDataViewerVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const { settings, setSettings } = useFrameLeaderSettingsStore();
  const { fdl, setFdl } = useFdlStore();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset input so same file can be imported again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportProject = () => {
    if (settings) {
      const projectName = settings.title?.text || 'Untitled Project';
      ProjectManager.exportProject(fdl, settings, projectName);
    } else {
      alert('No project data to export!');
    }
  };

  const handleImportProjectClick = () => {
    projectFileInputRef.current?.click();
  };

  const handleProjectFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await ProjectManager.importProject(file, setFdl, setSettings);
        alert('Project imported successfully!');
      } catch (error) {
        console.error('Error importing project:', error);
        alert(`Error importing project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Reset input so same file can be imported again
    if (projectFileInputRef.current) {
      projectFileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = () => {
    // The store is already persisting on every change, so a manual save is for user assurance.
    // We can provide feedback that the settings are already being saved automatically.
    // Or, if we change the store to not persist automatically, this button would trigger it.
    // For now, let's just give the user some feedback.
    alert('Project data is saved automatically!');
  };

  return (
    <header className="bg-gray-50 dark:bg-gray-800 shadow-sm border-b border-gray-400 dark:border-gray-600 sticky top-0 z-50">
      <div className="fdl-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              ASC-DIT-FDL
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Import Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleImportClick}
                className="fdl-button-secondary text-sm px-3 py-2"
                title="Import FDL only (no custom assets)"
              >
                Import FDL
              </button>
              
              <button
                onClick={handleImportProjectClick}
                className="fdl-button-secondary text-sm px-3 py-2"
                title="Import complete project (FDL + frame leader + custom assets)"
              >
                Import Project
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={onExport}
                className="fdl-button-primary text-sm px-3 py-2"
                title="Export FDL only (standard format)"
              >
                Export FDL
              </button>

              <button
                onClick={handleExportProject}
                className="bg-blue-700 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                title="Export complete project (FDL + frame leader + custom assets)"
              >
                Export Project
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".fdl,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <input
              ref={projectFileInputRef}
              type="file"
              accept=".fdlp"
              onChange={handleProjectFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 