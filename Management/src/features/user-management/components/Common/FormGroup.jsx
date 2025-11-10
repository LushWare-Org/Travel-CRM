import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormGroup = ({ 
  label, 
  required = false, 
  error = null, 
  children,
  helperText = null 
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <div className={error ? 'relative' : ''}>
        {children}
        {error && (
          <div className="absolute -right-1 top-1 bg-red-500 rounded-full p-1 shadow-lg">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </p>
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default FormGroup;
