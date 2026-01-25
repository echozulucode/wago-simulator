import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  suffix?: string;
  prefix?: string;
  showSpinner?: boolean;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision,
  disabled,
  suffix,
  prefix,
  showSpinner = true,
  className,
}: NumericInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate precision from step if not provided
  const effectivePrecision =
    precision ?? (step < 1 ? Math.abs(Math.floor(Math.log10(step))) : 0);

  // Sync input value with prop when not focused
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toFixed(effectivePrecision));
    }
  }, [value, isFocused, effectivePrecision]);

  const clampValue = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = clampValue(parsed);
      onChange(clamped);
      setInputValue(clamped.toFixed(effectivePrecision));
    } else {
      setInputValue(value.toFixed(effectivePrecision));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    inputRef.current?.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    } else if (e.key === 'Escape') {
      setInputValue(value.toFixed(effectivePrecision));
      inputRef.current?.blur();
    }
  };

  const increment = () => {
    const newValue = clampValue(value + step);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = clampValue(value - step);
    onChange(newValue);
  };

  return (
    <div
      className={cn(
        'flex items-center bg-panel-bg border border-panel-border rounded-sm overflow-hidden',
        'focus-within:border-wago-orange',
        disabled && 'opacity-50',
        className
      )}
      data-testid="numeric-input"
    >
      {prefix && (
        <span className="px-2 text-xs text-panel-text-muted border-r border-panel-border">
          {prefix}
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex-1 px-2 py-1 text-sm font-mono bg-transparent text-panel-text text-right',
          'focus:outline-none',
          'disabled:cursor-not-allowed'
        )}
      />

      {suffix && (
        <span className="px-2 text-xs text-panel-text-muted border-l border-panel-border">
          {suffix}
        </span>
      )}

      {showSpinner && (
        <div className="flex flex-col border-l border-panel-border">
          <button
            type="button"
            onClick={increment}
            disabled={disabled || value >= max}
            className={cn(
              'px-1 py-0.5 text-panel-text-muted hover:text-panel-text hover:bg-panel-hover',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            tabIndex={-1}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || value <= min}
            className={cn(
              'px-1 py-0.5 text-panel-text-muted hover:text-panel-text hover:bg-panel-hover',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            tabIndex={-1}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
