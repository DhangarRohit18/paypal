import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  raised = false,
  hoverable = false,
  bordered = true,
  ...props
}) => {
  return (
    <div
      className={`rounded-card transition-all duration-200 ${
        raised ? 'bg-surface-raised shadow-soft-md' : 'bg-surface shadow-soft'
      } ${bordered ? 'border border-border' : ''} ${
        hoverable ? 'hover:-translate-y-0.5 hover:shadow-soft-lg hover:border-border-strong' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 sm:p-6 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3
      className={`text-base sm:text-lg font-bold text-text tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-xs sm:text-sm text-text-muted mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 sm:p-6 pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-5 sm:p-6 pt-3 border-t border-border flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

