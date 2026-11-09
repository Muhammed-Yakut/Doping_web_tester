import React from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { TargetLevel } from '../../types/index.ts';
import { Activity, Sparkles, Settings, Monitor, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    targetAppMode,
    isRealCDPActive,
    latencyMs,
    hasApiKey,
    selectedLevel,
    setSelectedLevel,
    setIsSettingsOpen,
    connectRealApp,
  } = useTestStore();

  const levels: { key: TargetLevel; label: string }[] = [
    { key: 'PRIMARY', label: 'İlkokul' },
    { key: 'MIDDLE_LGS', label: 'Ortaokul / LGS' },
    { key: 'HIGH_YKS', label: '12. Sınıf / YKS' },
  ];

  return (
    <header className="h-16 border-b border-surface-border bg-[#090b12]/90 backdrop-blur-md px-6 flex items-center justify-between z-30 select-none">
      {/* Brand & Platform Identity */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-600/20">
            <div className="w-full h-full bg-[#0d101a] rounded-[11px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-cyan-300 text-lg">
              D
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm tracking-wide text-white uppercase">Doping Test Studio</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono font-semibold">
                Autonomous AI
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Gerçek Electron .app &amp; Playwright CDP Runner</p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-surface-border hidden md:block"></div>

        {/* Telemetry Pills */}
        <div className="hidden lg:flex items-center space-x-2.5 text-xs font-mono">
          {/* Target App Mode & Real Doping Hafıza Connection */}
          <div
            onClick={connectRealApp}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border cursor-pointer transition-all ${
              targetAppMode === 'REAL_ELECTRON' && isRealCDPActive
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 shadow-glow-emerald'
                : 'bg-surface-100 border-surface-border text-gray-300'
            }`}
            title="Tıklayarak gerçek uygulamayı doğrula"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400">Hedef:</span>
            <span className="text-white font-bold">
              {targetAppMode === 'REAL_ELECTRON' ? 'Gerçek Electron .app (CDP :9222)' : 'Simülatör'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>

          {/* Latency */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-100 border border-surface-border text-gray-300">
            <Activity className="w-3.5 h-3.5 text-brand-emerald" />
            <span className="text-gray-400">Latency:</span>
            <span className="text-emerald-400 font-bold">{latencyMs}ms</span>
          </div>

          {/* Gemini AI Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-100 border border-surface-border text-gray-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-gray-400">AI Brain:</span>
            <span className={hasApiKey ? 'text-purple-300 font-semibold' : 'text-amber-400 font-semibold'}>
              {hasApiKey ? 'Gemini 2.5 Flash' : 'NLP Fallback'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile / Grade Level Selector */}
      <div className="flex items-center space-x-4">
        <div className="bg-surface-200/90 p-1 rounded-xl border border-surface-border flex items-center space-x-1">
          {levels.map((lvl) => {
            const isActive = selectedLevel === lvl.key;
            return (
              <button
                key={lvl.key}
                onClick={() => setSelectedLevel(lvl.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-surface-100'
                }`}
              >
                <span>{lvl.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 rounded-xl bg-surface-100 border border-surface-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          title="Ayarlar (API Key, Electron Yolu, CDP Portu)"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
