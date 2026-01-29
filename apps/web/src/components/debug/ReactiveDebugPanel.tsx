import { useEffect } from 'react';
import { ChevronDown, ChevronRight, Zap, AlertCircle, Clock, Lock, Hand } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useReactiveScenarioStore } from '@/stores/reactiveScenarioStore';
import { useUIStore } from '@/stores/uiStore';
import type { BehaviorDebug, ValidationError } from '@wago/shared';

function BehaviorRow({ behavior }: { behavior: BehaviorDebug }) {
  const hasDelay = behavior.delayMs > 0;
  const isPending = behavior.pendingUntilTick !== undefined;
  const isBlocked = !!behavior.blockedBy;

  return (
    <div
      className={cn(
        'px-2 py-1.5 text-xs border-b border-panel-border last:border-b-0',
        isBlocked && 'bg-red-900/10',
        isPending && !isBlocked && 'bg-yellow-900/10'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap
            size={12}
            className={cn(
              behavior.enabled ? 'text-status-warning' : 'text-panel-text-muted'
            )}
          />
          <span className="font-medium">{behavior.behaviorId}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasDelay && (
            <span className="flex items-center gap-0.5 text-[10px] text-panel-text-muted">
              <Clock size={10} />
              {behavior.delayMs}ms
            </span>
          )}
          {isPending && (
            <span className="px-1 py-0.5 text-[10px] bg-yellow-600/30 text-yellow-300 rounded">
              Pending
            </span>
          )}
          {isBlocked && (
            <span className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] bg-red-600/30 text-red-300 rounded">
              {behavior.blockedBy === 'Force' ? <Lock size={10} /> : <Hand size={10} />}
              {behavior.blockedBy}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 text-[10px] text-panel-text-muted font-mono">
        {behavior.sourceModule !== undefined ? (
          <span>
            [{behavior.sourceModule}:{behavior.sourceChannel}]
            {' -> '}
            <span className="text-panel-text">{behavior.mapping}</span>
            {' -> '}
            [{behavior.targetModule}:{behavior.targetChannel}]
          </span>
        ) : (
          <span>
            <span className="text-panel-text">{behavior.mapping}</span>
            {' -> '}
            [{behavior.targetModule}:{behavior.targetChannel}]
          </span>
        )}
        {behavior.lastSourceValue !== undefined && (
          <span className="ml-2 text-blue-400">
            src={behavior.lastSourceValue.toFixed(2)}
          </span>
        )}
        {behavior.pendingValue !== undefined && (
          <span className="ml-2 text-yellow-400">
            pending={behavior.pendingValue.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

function ValidationErrorRow({ error }: { error: ValidationError }) {
  const isError = error.severity === 'error';

  return (
    <div
      className={cn(
        'px-2 py-1.5 text-xs border-b border-panel-border last:border-b-0',
        isError ? 'bg-red-900/20' : 'bg-yellow-900/20'
      )}
    >
      <div className="flex items-center gap-1.5">
        <AlertCircle
          size={12}
          className={isError ? 'text-red-400' : 'text-yellow-400'}
        />
        <span className={cn('font-medium', isError ? 'text-red-300' : 'text-yellow-300')}>
          {error.severity.toUpperCase()}
        </span>
        <span className="text-panel-text-muted">in {error.scenario}</span>
        {error.behaviorId && (
          <span className="text-panel-text-muted">/ {error.behaviorId}</span>
        )}
      </div>
      <div className="mt-1 text-panel-text">
        {error.message}
      </div>
      <div className="mt-0.5 text-[10px] text-panel-text-muted font-mono">
        {error.path}
      </div>
    </div>
  );
}

export function ReactiveDebugPanel() {
  const { debugState, validationErrors, activeScenario, fetchDebugState, fetchValidationErrors } =
    useReactiveScenarioStore();
  const { reactiveDebugExpanded, toggleReactiveDebug } = useUIStore();

  // Fetch data on mount
  useEffect(() => {
    fetchDebugState();
    fetchValidationErrors();
  }, [fetchDebugState, fetchValidationErrors]);

  const hasErrors = validationErrors.filter((e) => e.severity === 'error').length > 0;
  const hasWarnings = validationErrors.filter((e) => e.severity === 'warning').length > 0;
  const pendingCount = debugState.filter((b) => b.pendingUntilTick !== undefined).length;
  const blockedCount = debugState.filter((b) => b.blockedBy).length;

  return (
    <div className="border-t border-panel-border">
      {/* Header */}
      <button
        onClick={toggleReactiveDebug}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-panel-text hover:bg-panel-hover"
      >
        <div className="flex items-center gap-2">
          {reactiveDebugExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Zap size={14} className="text-status-warning" />
          <span>Reactive Debug</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasErrors && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-600/30 text-red-300 rounded">
              {validationErrors.filter((e) => e.severity === 'error').length} errors
            </span>
          )}
          {hasWarnings && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-600/30 text-yellow-300 rounded">
              {validationErrors.filter((e) => e.severity === 'warning').length} warnings
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-600/30 text-blue-300 rounded">
              {pendingCount} pending
            </span>
          )}
          {blockedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-600/30 text-red-300 rounded">
              {blockedCount} blocked
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {reactiveDebugExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="border-b border-panel-border">
              <div className="px-3 py-1 text-[10px] font-medium text-panel-text-muted uppercase bg-panel-bg-secondary">
                Validation Issues
              </div>
              {validationErrors.map((error, index) => (
                <ValidationErrorRow key={index} error={error} />
              ))}
            </div>
          )}

          {/* Active Behaviors */}
          {activeScenario && debugState.length > 0 ? (
            <div>
              <div className="px-3 py-1 text-[10px] font-medium text-panel-text-muted uppercase bg-panel-bg-secondary">
                Active Behaviors ({debugState.length})
              </div>
              {debugState.map((behavior, index) => (
                <BehaviorRow key={behavior.behaviorId || index} behavior={behavior} />
              ))}
            </div>
          ) : !activeScenario ? (
            <div className="px-3 py-4 text-xs text-panel-text-muted text-center">
              No reactive scenario active
            </div>
          ) : (
            <div className="px-3 py-4 text-xs text-panel-text-muted text-center">
              No behaviors defined
            </div>
          )}
        </div>
      )}
    </div>
  );
}
