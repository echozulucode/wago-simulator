import { useEffect } from 'react';
import { AppShell } from '@/components/layout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRackStore } from '@/stores/rackStore';

export default function App() {
  const initStore = useRackStore(state => state.init);

  useEffect(() => {
    initStore();
  }, [initStore]);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  return <AppShell />;
}