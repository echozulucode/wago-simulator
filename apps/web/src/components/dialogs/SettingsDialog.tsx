import { Dialog } from '@/components/common/Dialog';
import { Button } from '@/components/common/Button';
import { ToggleSwitch } from '@/components/controls/ToggleSwitch';
import { useUIStore } from '@/stores/uiStore';
import { Monitor, Palette } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const {
    theme,
    showChannelNumbers,
    showRawValues,
    animateChanges,
    toggleShowChannelNumbers,
    toggleShowRawValues,
    toggleAnimateChanges,
  } = useUIStore();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      width="md"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Display Settings */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-panel-text-muted" />
            <h3 className="text-sm font-medium text-panel-text">Display</h3>
          </div>
          <div className="space-y-3 pl-6">
            <SettingRow
              label="Show Channel Numbers"
              description="Display channel numbers on module cards"
            >
              <ToggleSwitch
                value={showChannelNumbers}
                onChange={toggleShowChannelNumbers}
                size="sm"
              />
            </SettingRow>
            <SettingRow
              label="Show Raw Values"
              description="Display raw register values alongside formatted values"
            >
              <ToggleSwitch
                value={showRawValues}
                onChange={toggleShowRawValues}
                size="sm"
              />
            </SettingRow>
            <SettingRow
              label="Animate Changes"
              description="Animate value changes on module cards"
            >
              <ToggleSwitch
                value={animateChanges}
                onChange={toggleAnimateChanges}
                size="sm"
              />
            </SettingRow>
          </div>
        </section>

        {/* Appearance Settings */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-panel-text-muted" />
            <h3 className="text-sm font-medium text-panel-text">Appearance</h3>
          </div>
          <div className="space-y-3 pl-6">
            <SettingRow
              label="Theme"
              description="Color theme for the application"
            >
              <span className="text-xs text-panel-text-muted capitalize">
                {theme} (coming soon)
              </span>
            </SettingRow>
          </div>
        </section>

        {/* Info note */}
        <div className="pt-2 border-t border-panel-border">
          <p className="text-xs text-panel-text-muted">
            Modbus server settings (port, unit ID) are configured per-rack in the rack configuration file.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-panel-text">{label}</div>
        <div className="text-xs text-panel-text-muted">{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
