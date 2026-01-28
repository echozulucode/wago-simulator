import { useUIStore } from '@/stores/uiStore';
import { MenuBar } from './MenuBar';
import { Toolbar } from './Toolbar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { WorkArea } from './WorkArea';
import { StatusBar } from './StatusBar';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';

export function AppShell() {
  const { leftPanelOpen, rightPanelOpen, statusBarVisible, settingsDialogOpen, closeSettingsDialog } = useUIStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-panel-bg text-panel-text">
      {/* Menu Bar */}
      <MenuBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {leftPanelOpen && <LeftPanel />}

        {/* Work Area */}
        <WorkArea />

        {/* Right Panel */}
        {rightPanelOpen && <RightPanel />}
      </div>

      {/* Status Bar */}
      {statusBarVisible && <StatusBar />}

      {/* Dialogs */}
      <SettingsDialog open={settingsDialogOpen} onClose={closeSettingsDialog} />
    </div>
  );
}
