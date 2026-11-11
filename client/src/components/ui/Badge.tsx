import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'sample' | 'outline' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-mono',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
  }[size];

  const variantStyles = {
    neutral:
      'bg-bg-subtle text-text-muted border border-border',
    brand:
      'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 dark:text-brand-blue-500 font-semibold',
    success:
      'bg-status-success-bg text-status-success-text border border-status-success-border font-semibold',
    warning:
      'bg-status-warning-bg text-status-warning-text border border-status-warning-border font-semibold',
    danger:
      'bg-status-danger-bg text-status-danger-text border border-status-danger-border font-semibold',
    outline:
      'bg-transparent text-text-muted border border-border',
    sample:
      'bg-brand-violet/10 text-brand-violet border border-brand-violet/25 font-mono font-medium',
    blue:
      'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-semibold',
    purple:
      'bg-brand-violet/10 text-brand-violet border border-brand-violet/25 font-mono font-medium',
  }[variant];

  const dotColors = {
    neutral: 'bg-text-subtle',
    brand: 'bg-brand-blue',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    outline: 'bg-text-muted',
    sample: 'bg-brand-violet',
    blue: 'bg-brand-blue',
    purple: 'bg-brand-violet',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} flex-shrink-0`} />}
      {children}
    </span>
  );
};

