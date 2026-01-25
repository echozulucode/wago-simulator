import { cn } from '@/utils/cn';

export interface LEDIndicatorProps {
  state: boolean | 'blink' | 'blink-slow';
  color?: 'green' | 'red' | 'yellow' | 'blue';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

export function LEDIndicator({
  state,
  color = 'green',
  size = 'sm',
  label,
  labelPosition = 'right',
  className,
}: LEDIndicatorProps) {
  const isOn = state === true || state === 'blink' || state === 'blink-slow';

  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    green: isOn ? 'bg-led-green shadow-led-green' : 'bg-led-off border border-led-off-border',
    red: isOn ? 'bg-led-red shadow-led-red' : 'bg-led-off border border-led-off-border',
    yellow: isOn ? 'bg-led-yellow shadow-led-yellow' : 'bg-led-off border border-led-off-border',
    blue: isOn ? 'bg-led-blue shadow-led-blue' : 'bg-led-off border border-led-off-border',
  };

  const animationClasses = {
    true: '',
    false: '',
    blink: 'animate-led-blink',
    'blink-slow': 'animate-led-blink-slow',
  };

  const containerClasses = {
    left: 'flex-row-reverse',
    right: 'flex-row',
    top: 'flex-col-reverse',
    bottom: 'flex-col',
  };

  const led = (
    <div
      className={cn(
        'rounded-full transition-all duration-100',
        sizeClasses[size],
        colorClasses[color],
        animationClasses[String(state) as keyof typeof animationClasses],
        className
      )}
      role="status"
      aria-label={`${color} LED ${isOn ? 'on' : 'off'}`}
    />
  );

  if (!label) return led;

  return (
    <div className={cn('flex items-center gap-1.5', containerClasses[labelPosition])}>
      {led}
      <span className="text-xs text-panel-text-muted">{label}</span>
    </div>
  );
}
