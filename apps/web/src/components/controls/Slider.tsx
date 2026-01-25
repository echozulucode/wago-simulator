import { useRef, useCallback } from 'react';
import { cn } from '@/utils/cn';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  showValue = true,
  formatValue = (v) => v.toFixed(step < 1 ? Math.abs(Math.floor(Math.log10(step))) : 0),
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex-1" ref={trackRef}>
        {/* Track background */}
        <div className="absolute inset-0 h-1.5 rounded-full bg-panel-active top-1/2 -translate-y-1/2" />

        {/* Filled track */}
        <div
          className="absolute h-1.5 rounded-full bg-wago-orange top-1/2 -translate-y-1/2"
          style={{ width: `${percentage}%` }}
        />

        {/* Native input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'relative w-full h-5 appearance-none bg-transparent cursor-pointer',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Thumb styles
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
            '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-wago-orange',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
            // Firefox
            '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white',
            '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-wago-orange'
          )}
          data-testid="value-slider"
        />
      </div>

      {showValue && (
        <span className="text-xs font-mono text-panel-text min-w-[4rem] text-right">
          {formatValue(value)}
        </span>
      )}
    </div>
  );
}
