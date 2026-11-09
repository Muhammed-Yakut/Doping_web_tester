import React, { useState } from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { AppTargetMode } from '../../types/index.ts';
import { X, Sparkles, Monitor, Key, Check, Zap } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    targetAppMode,
    electronAppPath,
    cdpPort,
    saveConfig,
    hasApiKey,
    isRealCDPActive,
  } = useTestStore();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<AppTargetMode>(targetAppMode);
  const [appPathInput, setAppPathInput] = useState(electronAppPath);
  const [portInput, setPortInput] = useState(cdpPort || 9222);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    saveConfig(apiKeyInput, selectedMode, appPathInput, portInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-100 border border-surface-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Test Stüdyosu Ayarları</h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target App Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hedef Test Ortamı</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isRealCDPActive ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
              {isRealCDPActive ? '✓ Gerçek App (Port 9222) Algılandı' : 'CDP Portu Kapalı'}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMode('REAL_ELECTRON')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedMode === 'REAL_ELECTRON'
                  ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-500/50 text-white'
                  : 'bg-surface-200 border-surface-border text-gray-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold flex items-center space-x-1 text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Gerçek Masaüstü (.app)</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Açık Doping Hafıza oturumuna CDP (:9222) ile doğrudan bağlanır
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('SIMULATOR')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedMode === 'SIMULATOR'
                  ? 'bg-purple-950/40 border-purple-600 ring-1 ring-purple-500/50 text-white'
                  : 'bg-surface-200 border-surface-border text-gray-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold text-purple-300">1:1 Simülatör Modu</div>
              <div className="text-[10px] text-gray-400 mt-1">
                Kullanıcı girişi olmadan sıfır riskli mock test ortamı
              </div>
            </button>
          </div>
        </div>

        {/* Real App Configuration */}
        {selectedMode === 'REAL_ELECTRON' && (
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-200/50 border border-surface-border">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Masaüstü Uygulama Yolu (.app)</label>
              <input
                type="text"
                value={appPathInput}
                onChange={(e) => setAppPathInput(e.target.value)}
                className="w-full bg-surface-100 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Chrome DevTools Portu (CDP)</label>
              <input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(parseInt(e.target.value, 10) || 9222)}
                className="w-full bg-surface-100 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-gray-500">
                Uygulama açılırken DevTools otomatik açıldığı için port 9222 üzerinden Playwright tam yetkiyle bağlanır.
              </p>
            </div>
          </div>
        )}

        {/* Gemini API Key */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Google Gemini API Key</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${hasApiKey ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
              {hasApiKey ? '✓ Aktif' : 'Tanımlı Değil (Dahili Zeki NLP devrede)'}
            </span>
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy... (Boş bırakırsanız dahili zeki NLP motoru kullanılır)"
            className="w-full bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-surface-border">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 rounded-xl bg-surface-200 text-gray-300 text-xs font-semibold hover:bg-surface-border"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-purple-600/30"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Ayarları Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
