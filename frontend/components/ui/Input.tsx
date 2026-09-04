import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, label, error, id, ...props }, ref) => {
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor={id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-lg border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500'} focus:ring-2 focus:outline-none transition-colors ${className}`}
            {...props}
          />
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
