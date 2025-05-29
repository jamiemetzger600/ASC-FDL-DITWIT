import React from 'react';
import type { FDL } from '../types/fdl';
import type { ValidationResult } from '../validation/fdlValidator';

interface ValidationPanelProps {
  validationResult: ValidationResult;
  fdl: FDL;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ validationResult, fdl }) => {
  const { isValid, errors, schemaErrors, idTreeErrors } = validationResult;

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Validation Status</h2>
        
        <div className={`p-4 rounded-md ${
          isValid 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-4 h-4 rounded-full ${
              isValid ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {isValid ? 'Valid FDL' : 'Invalid FDL'}
              </h3>
              <p className={`text-sm ${
                isValid ? 'text-green-700' : 'text-red-700'
              }`}>
                {isValid 
                  ? 'Your FDL passes all validation checks.' 
                  : `${errors.length} validation error${errors.length !== 1 ? 's' : ''} found.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded border-l-4 border-red-400">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schema Errors Detail */}
        {schemaErrors && schemaErrors.length > 0 && (
          <div className="mt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-red-800">
                Schema Errors ({schemaErrors.length})
              </summary>
              <div className="mt-2 space-y-1">
                {schemaErrors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    <strong>Path:</strong> {error.instancePath || error.schemaPath}<br />
                    <strong>Message:</strong> {error.message}
                    {error.data && (
                      <>
                        <br />
                        <strong>Data:</strong> {JSON.stringify(error.data)}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* ID Tree Errors Detail */}
        {idTreeErrors && idTreeErrors.length > 0 && (
          <div className="mt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-red-800">
                ID Tree Errors ({idTreeErrors.length})
              </summary>
              <div className="mt-2 space-y-1">
                {idTreeErrors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* FDL Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">FDL Summary</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">UUID:</span>
            <span className="text-sm text-gray-900 font-mono text-right max-w-48 truncate">
              {fdl.uuid}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Version:</span>
            <span className="text-sm text-gray-900">
              {fdl.version.major}.{fdl.version.minor}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Creator:</span>
            <span className="text-sm text-gray-900 text-right max-w-32 truncate">
              {fdl.fdl_creator || 'Not specified'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Default Intent:</span>
            <span className="text-sm text-gray-900 text-right max-w-32 truncate">
              {fdl.default_framing_intent || 'None'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Framing Intents:</span>
            <span className="text-sm text-gray-900">
              {fdl.framing_intents?.length || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Contexts:</span>
            <span className="text-sm text-gray-900">
              {fdl.contexts?.length || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Canvas Templates:</span>
            <span className="text-sm text-gray-900">
              {fdl.canvas_templates?.length || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-600">Total Canvases:</span>
            <span className="text-sm text-gray-900">
              {fdl.contexts?.reduce((total, context) => total + (context.canvases?.length || 0), 0) || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(fdl.uuid);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
          >
            📋 Copy UUID
          </button>
          
          <button
            onClick={() => {
              const jsonStr = JSON.stringify(fdl, null, 2);
              navigator.clipboard.writeText(jsonStr);
            }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
          >
            📋 Copy JSON
          </button>
          
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              File size: {new Blob([JSON.stringify(fdl)]).size} bytes
            </div>
          </div>
        </div>
      </div>

      {/* Framing Intents Detail */}
      {fdl.framing_intents && fdl.framing_intents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Framing Intents Detail</h2>
          
          <div className="space-y-3">
            {fdl.framing_intents.map((intent) => (
              <div key={intent.id} className="border border-gray-200 rounded-md p-3">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {intent.label || intent.id}
                </div>
                <div className="text-xs text-gray-600">
                  ID: {intent.id}
                </div>
                <div className="text-xs text-gray-600">
                  Aspect Ratio: {intent.aspect_ratio.width}:{intent.aspect_ratio.height} 
                  ({(intent.aspect_ratio.width / intent.aspect_ratio.height).toFixed(2)}:1)
                </div>
                {intent.protection && (
                  <div className="text-xs text-gray-600">
                    Protection: {intent.protection}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel; 