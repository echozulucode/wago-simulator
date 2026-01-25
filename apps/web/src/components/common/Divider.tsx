import { cn } from '@/utils/cn';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  return (
    <div
      className={cn(
        'bg-panel-border',
        orientation === 'horizontal' ? 'h-px w-full my-1' : 'w-px h-full mx-1',
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
}
