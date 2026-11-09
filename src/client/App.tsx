import React, { useEffect } from 'react';
import { useTestStore } from './store/useTestStore.ts';
import { Header } from './components/Header.tsx';
import { BentoGrid } from './components/BentoGrid.tsx';
import { MacroShortcuts } from './components/MacroShortcuts.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

export const App: React.FC = () => {
  const { initWebSocket } = useTestStore();

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  return (
    <div className="h-screen flex flex-col bg-background text-gray-100 overflow-hidden font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Header Bar */}
      <Header />

      {/* Main Bento Grid Workspace */}
      <BentoGrid />

      {/* Floating Macro Shortcuts Pill (CMD+1, CMD+2) */}
      <MacroShortcuts />

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
};

export default App;
