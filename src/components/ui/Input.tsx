import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    helperText, 
    error, 
    leftIcon, 
    rightIcon, 
    fullWidth = false, 
    className, 
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = !!error;
    
    const inputBaseStyles = 'block rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
    const inputStateStyles = hasError 
      ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20 pr-10' 
      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20';
    const inputPaddingStyles = leftIcon ? 'pl-10' : 'pl-4';
    const inputWidthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              inputBaseStyles,
              inputStateStyles,
              inputPaddingStyles,
              inputWidthStyles,
              'py-2 pr-4',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...props}
          />
          
          {(rightIcon || hasError) && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {hasError ? (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-error-500" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                    clipRule="evenodd" 
                  />
                </svg>
              ) : rightIcon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <p 
            id={hasError ? `${inputId}-error` : undefined}
            className={`mt-1 text-sm ${hasError ? 'text-error-500' : 'text-neutral-500'}`}
          >
            {hasError ? error : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;