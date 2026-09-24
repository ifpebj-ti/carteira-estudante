import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode; // 1. Adicionamos a tipagem do ícone
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className = '', id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        {}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-slate-400 flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`w-full rounded-lg border border-slate-300 bg-white ${
              icon ? 'pl-10 pr-4' : 'px-4'
            } py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${className}`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';