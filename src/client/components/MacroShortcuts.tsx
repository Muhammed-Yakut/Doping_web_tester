import React, { useEffect } from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { Zap, Camera, ShieldAlert } from 'lucide-react';

export const MacroShortcuts: React.FC = () => {
  const { triggerMacro, isRunning } = useTestStore();

  // Handle global CMD+1 and CMD+2 keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          triggerMacro('SEED_MOCK_DATA');
        } else if (e.key === '2') {
          e.preventDefault();
          triggerMacro('TRIGGER_BUG_SNAPSHOT');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerMacro]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-surface-100/95 backdrop-blur-md p-1.5 rounded-2xl border border-surface-border shadow-2xl">
      {/* Macro 1: Seed Test Data */}
      <button
        onClick={() => triggerMacro('SEED_MOCK_DATA')}
        disabled={isRunning}
        className="px-3 py-1.5 rounded-xl bg-surface-200 hover:bg-purple-950/60 hover:border-purple-800/80 border border-surface-border text-xs font-semibold text-gray-300 hover:text-purple-300 transition-all flex items-center space-x-2 group disabled:opacity-50"
        title="CMD+1: Hızlı Smoke Test Başlat"
      >
        <Zap className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
        <span>Hızlı Smoke</span>
        <kbd className="px-1.5 py-0.2 rounded bg-surface-300 text-[10px] text-gray-400 font-mono">⌘1</kbd>
      </button>

      {/* Macro 2: Bug Snapshot */}
      <button
        onClick={() => triggerMacro('TRIGGER_BUG_SNAPSHOT')}
        className="px-3 py-1.5 rounded-xl bg-surface-200 hover:bg-red-950/60 hover:border-red-800/80 border border-surface-border text-xs font-semibold text-gray-300 hover:text-red-300 transition-all flex items-center space-x-2 group"
        title="CMD+2: Anlık Hata Ekranı ve Bounding Box Yakala"
      >
        <Camera className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
        <span>Hata Snapshot</span>
        <kbd className="px-1.5 py-0.2 rounded bg-surface-300 text-[10px] text-gray-400 font-mono">⌘2</kbd>
      </button>
    </div>
  );
};
