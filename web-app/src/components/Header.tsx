import React, { useRef } from 'react';

interface HeaderProps {
  onExport: () => void;
  onImport: (file: File) => void;
  // onToggleTestDataViewer: () => void;
  // isTestDataViewerVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="fdl-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              ASC-DIT-FDL
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* <button
              onClick={onToggleTestDataViewer}
              className="fdl-button-secondary"
            >
              {isTestDataViewerVisible ? 'Hide Test Data' : 'Test'}
            </button> */}

            <button
              onClick={handleImportClick}
              className="fdl-button-secondary"
            >
              Import FDL
            </button>
            
            <button
              onClick={onExport}
              className="fdl-button-primary px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
            >
              Export FDL
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".fdl,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 