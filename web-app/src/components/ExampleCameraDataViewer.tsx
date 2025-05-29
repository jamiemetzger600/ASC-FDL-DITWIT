// web-app/src/components/ExampleCameraDataViewer.tsx
// This is an example component to display the structured camera data.
// It's for demonstration purposes and is NOT part of the active application code
// unless you explicitly integrate it.

import React from 'react';
import COMBINED_CAMERA_DATA_EXAMPLE from '../data_example/camera-data-importer-example';
import type { CameraManufacturer } from '../data_example/camera_data/arri-example'; // Assuming structure is consistent

const ExampleCameraDataViewer: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Example Camera Data Structure</h1>
      <p>This page demonstrates how camera data, loaded from separate files per manufacturer, could be structured and displayed.</p>
      
      {(COMBINED_CAMERA_DATA_EXAMPLE as CameraManufacturer[]).map((manufacturer, index) => (
        <div key={index} style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
          <h2>{manufacturer.name}</h2>
          {manufacturer.models.map((model, modelIndex) => (
            <div key={modelIndex} style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <h3>{model.name}</h3>
              {model.resolutions && model.resolutions.length > 0 ? (
                <ul style={{ listStyleType: 'disc', marginLeft: '20px' }}>
                  {model.resolutions.map((res, resIndex) => (
                    <li key={resIndex}>
                      {res.name} ({res.width} x {res.height})
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginLeft: '20px', fontStyle: 'italic' }}>No resolutions listed for this model.</p>
              )}
            </div>
          ))}
        </div>
      ))}
      <hr />
      <p><strong>Note:</strong> To integrate this data structure into your main application, you would replace the example data import with your actual structured data and use it within your existing FDL Editor or relevant components.</p>
    </div>
  );
};

export default ExampleCameraDataViewer; 