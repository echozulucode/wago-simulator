import { cn } from '@/utils/cn';

export interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  labels?: {
    on?: string;
    off?: string;
  };
  className?: string;
}

export function ToggleSwitch({
  value,
  onChange,
  disabled,
  size = 'md',
  labels,
  className,
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {labels?.off && (
        <span
          className={cn(
            'text-xs transition-colors',
            !value ? 'text-panel-text' : 'text-panel-text-muted'
          )}
        >
          {labels.off}
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wago-orange focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sizeClasses[size].track,
          value ? 'bg-wago-orange' : 'bg-panel-active'
        )}
        data-testid="toggle-switch"
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
            sizeClasses[size].thumb,
            'absolute top-0.5 left-0.5',
            value && sizeClasses[size].translate
          )}
        />
      </button>

      {labels?.on && (
        <span
          className={cn(
            'text-xs transition-colors',
            value ? 'text-panel-text' : 'text-panel-text-muted'
          )}
        >
          {labels.on}
        </span>
      )}
    </div>
  );
}
