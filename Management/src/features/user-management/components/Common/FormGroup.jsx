import React from 'react';

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
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          ⚠ {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default FormGroup;
