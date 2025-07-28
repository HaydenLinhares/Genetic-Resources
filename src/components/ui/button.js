// src/components/ui/button.js
import React from 'react';

export function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
