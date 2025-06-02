import { useState } from 'react';
import { createEmptyFDL, validateFDL } from './validation/fdlValidator';
import type { FDL } from './types/fdl';
import './App.css';

// Component imports (we'll create these next)
import Header from './components/Header';
import FDLEditor from './components/FDLEditor';

function App() {
  const [fdl, setFdl] = useState<FDL>(createEmptyFDL());
  const [validationResult, setValidationResult] = useState(validateFDL(fdl));

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
        
        // Update the FDL state with the imported data
        setFdl(importedFdl);
        
        // Validate the imported FDL
        const currentValidationResult = validateFDL(importedFdl);
        // Update the global validationResult state
        setValidationResult(currentValidationResult);

        if (!currentValidationResult.isValid) {
          const errorMessages = currentValidationResult.errors.join('\n- ');
          alert(`Imported FDL has validation issues. Please address the following:\n- ${errorMessages}`);
        } else {
          alert('FDL imported successfully and is valid!'); // Optional: Or remove for less noise
        }
      } catch (error) {
        console.error('Error importing FDL file:', error);
        // This error typically means the file was not valid JSON or a FileReader issue occurred.
        alert('Error importing FDL file. Please ensure the file is a correctly formatted JSON FDL file.');
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
      />
      
      <main className="fdl-container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <FDLEditor 
              fdl={fdl}
              onChange={handleFDLChange}
            />
          </div>
          
          {/* Validation Panel - Temporarily Hidden */}
          {/* <div className="lg:col-span-1">
            <ValidationPanel 
              validationResult={validationResult}
              fdl={fdl}
            />
          </div> */}
        </div>
      </main>
    </div>
  );
}

export default App;
