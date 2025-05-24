import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({ className, children, onClick, hoverable }) => {
  const baseStyles = 'bg-white rounded-lg shadow-sm overflow-hidden';
  const hoverStyles = hoverable ? 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-md' : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={twMerge(baseStyles, hoverStyles, clickableStyles, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div className={twMerge('px-6 py-4 border-b border-neutral-200', className)}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

const CardBody: React.FC<CardBodyProps> = ({ className, children }) => {
  return (
    <div className={twMerge('px-6 py-4', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div className={twMerge('px-6 py-4 border-t border-neutral-200', className)}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardBody, CardFooter };