import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  width = 'md',
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="dialog-backdrop"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full mx-4 bg-panel-bg border border-panel-border rounded-md shadow-panel-lg animate-scale-in',
          widthClasses[width],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <h2 id="dialog-title" className="text-sm font-medium text-panel-text">
            {title}
          </h2>
          <IconButton
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
            tooltip="Close"
            size="sm"
          />
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-panel-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
