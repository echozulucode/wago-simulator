import { AppShell } from '@/components/layout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function App() {
  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  return <AppShell />;
}
