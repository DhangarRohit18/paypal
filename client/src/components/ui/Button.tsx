import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.98]';

    // Size variants
    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12 font-semibold',
    }[size];

    // Color variants
    const variantStyles = {
      primary:
        'bg-brand-blue hover:bg-brand-blue-600 text-white shadow-soft hover:shadow-soft-md',
      gradient:
        'bg-gradient-to-r from-brand-blue to-brand-violet hover:opacity-95 text-white shadow-soft-md shadow-brand-blue/20 hover:shadow-glow-blue',
      secondary:
        'bg-surface hover:bg-bg-subtle text-text border border-border shadow-soft-sm hover:border-border-strong',
      outline:
        'bg-transparent hover:bg-surface text-text border border-border hover:border-border-strong',
      ghost:
        'bg-transparent hover:bg-surface/80 text-text-muted hover:text-text',
      danger:
        'bg-status-danger hover:bg-status-danger/90 text-white shadow-soft',
      success:
        'bg-status-success hover:bg-status-success/90 text-white shadow-soft',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

