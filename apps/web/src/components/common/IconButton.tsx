import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, variant = 'default', size = 'md', active, tooltip, ...props }, ref) => {
    const variantClasses = {
      default: 'text-panel-text hover:bg-panel-hover active:bg-panel-active',
      ghost: 'text-panel-text-muted hover:text-panel-text hover:bg-panel-hover',
      danger: 'text-panel-text hover:bg-status-error hover:text-white',
    };

    const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    };

    const iconSizeClasses = {
      sm: '[&>svg]:w-3.5 [&>svg]:h-3.5',
      md: '[&>svg]:w-4 [&>svg]:h-4',
      lg: '[&>svg]:w-5 [&>svg]:h-5',
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wago-orange',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          iconSizeClasses[size],
          active && 'bg-panel-active',
          className
        )}
        title={tooltip}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
