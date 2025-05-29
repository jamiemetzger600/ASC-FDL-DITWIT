import { useState } from 'react';
import { createEmptyFDL, validateFDL } from './validation/fdlValidator';
import type { FDL } from './types/fdl';
import './App.css';

// Component imports (we'll create these next)
import Header from './components/Header';
import FDLEditor from './components/FDLEditor';
import ValidationPanel from './components/ValidationPanel.tsx';
import ExampleCameraDataViewer from './components/ExampleCameraDataViewer';

function App() {
  const [fdl, setFdl] = useState<FDL>(createEmptyFDL());
  const [validationResult, setValidationResult] = useState(validateFDL(fdl));
  const [showTestDataViewer, setShowTestDataViewer] = useState(false);

  const handleFDLChange = (newFdl: FDL) => {
    setFdl(newFdl);
    setValidationResult(validateFDL(newFdl));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(fdl, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `fdl_${new Date().toISOString().split('T')[0]}.fdl`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedFdl = JSON.parse(result) as FDL;
        handleFDLChange(importedFdl);
      } catch (error) {
        console.error('Error importing FDL file:', error);
        alert('Error importing FDL file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onExport={handleExport}
        onImport={handleImport}
        isValid={validationResult.isValid}
        onToggleTestDataViewer={() => setShowTestDataViewer(prev => !prev)}
        isTestDataViewerVisible={showTestDataViewer}
      />
      
      {showTestDataViewer ? (
        <ExampleCameraDataViewer />
      ) : (
        <main className="fdl-container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Editor */}
            <div className="lg:col-span-2">
              <FDLEditor 
                fdl={fdl}
                onChange={handleFDLChange}
              />
            </div>
            
            {/* Validation Panel */}
            <div className="lg:col-span-1">
              <ValidationPanel 
                validationResult={validationResult}
                fdl={fdl}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
