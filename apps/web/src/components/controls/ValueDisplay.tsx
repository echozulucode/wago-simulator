import { cn } from '@/utils/cn';

export interface ValueDisplayProps {
  value: string | number;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'highlight' | 'muted';
  mono?: boolean;
  className?: string;
}

export function ValueDisplay({
  value,
  label,
  unit,
  size = 'md',
  variant = 'default',
  mono = true,
  className,
}: ValueDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const variantClasses = {
    default: 'text-panel-text',
    highlight: 'text-wago-orange',
    muted: 'text-panel-text-muted',
  };

  return (
    <div className={cn('flex items-baseline gap-1', className)}>
      {label && <span className="text-xs text-panel-text-muted">{label}:</span>}
      <span
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          mono && 'font-mono'
        )}
      >
        {value}
      </span>
      {unit && <span className="text-xs text-panel-text-muted">{unit}</span>}
    </div>
  );
}
