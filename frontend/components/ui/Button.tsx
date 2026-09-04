import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', fullWidth, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    const variants = {
      primary: "border border-transparent text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 shadow-sm",
      outline: "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-500 shadow-sm",
      ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-500"
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
