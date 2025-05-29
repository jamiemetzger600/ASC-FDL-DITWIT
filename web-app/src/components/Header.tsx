import React, { useRef } from 'react';

interface HeaderProps {
  onExport: () => void;
  onImport: (file: File) => void;
  isValid: boolean;
}

const Header: React.FC<HeaderProps> = ({ onExport, onImport, isValid }) => {
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="fdl-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              ASC FDL Editor
            </h1>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              isValid 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isValid ? 'Valid' : 'Invalid'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleImportClick}
              className="fdl-button-secondary"
            >
              Import FDL
            </button>
            
            <button
              onClick={onExport}
              disabled={!isValid}
              className={`${
                isValid 
                  ? 'fdl-button-primary' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
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