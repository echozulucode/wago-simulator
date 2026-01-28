import { useRef, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useRackStore } from '@/stores/rackStore';
import { RackView } from '@/components/rack/RackView';
import { FilePlus } from 'lucide-react';
import { Button } from '@/components/common';

function EmptyState() {
  const { createRack } = useRackStore();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-24 h-24 mb-6 rounded-full bg-panel-active flex items-center justify-center">
        <FilePlus className="w-12 h-12 text-panel-text-muted" />
      </div>
      <h2 className="text-xl font-medium text-panel-text mb-2">No Rack Loaded</h2>
      <p className="text-sm text-panel-text-muted mb-6 max-w-md">
        Create a new rack configuration to start simulating WAGO 750 series I/O modules.
        Drag modules from the catalog to build your rack.
      </p>
      <Button
        variant="primary"
        onClick={() => createRack('New Rack')}
        icon={<FilePlus className="w-4 h-4" />}
      >
        Create New Rack
      </Button>
    </div>
  );
}

export function WorkArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom } = useUIStore();
  const { config, addModule, getModulesSorted, createRack } = useRackStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      const moduleNumber =
        e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');

      if (!moduleNumber) {
        return;
      }

      // Create rack if needed, then add module
      if (!config) {
        await createRack('New Rack');
      }

      // Get fresh module list from store (not from closure)
      const modules = getModulesSorted();
      const nextSlot =
        modules.length > 0 ? Math.max(...modules.map(m => m.slotPosition)) + 1 : 0;

      await addModule(moduleNumber, nextSlot);
    },
    [config, addModule, getModulesSorted, createRack]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 overflow-auto bg-[#0d0d0d] relative',
        isDragOver && 'ring-2 ring-inset ring-wago-orange/50'
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="work-area"
    >
      {/* Grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #333 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div
        className="relative min-h-full flex items-center justify-center p-8"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {config ? <RackView /> : <EmptyState />}
      </div>

      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 bg-wago-orange text-white rounded-lg shadow-lg text-sm font-medium">
            Drop to add module
          </div>
        </div>
      )}
    </div>
  );
}
