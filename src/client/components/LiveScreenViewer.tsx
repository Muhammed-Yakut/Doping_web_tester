import React, { useRef, useState } from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { Monitor, Eye, AlertTriangle, CheckCircle, Maximize2, RefreshCw } from 'lucide-react';

export const LiveScreenViewer: React.FC = () => {
  const { liveScreenshot, boundingBox, isRunning, runnerStatus } = useTestStore();
  const [showOverlay, setShowOverlay] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playwright viewport default: 1280 x 800
  const viewportWidth = 1280;
  const viewportHeight = 800;

  return (
    <div className="bg-surface-100 rounded-2xl border border-surface-border p-5 flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Canlı Ekran / DOM İzleyici (Live Feed)
          </h2>
          {isRunning && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>CANLI STREAM</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 border transition-all ${
              showOverlay
                ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                : 'bg-surface-200 border-surface-border text-gray-400'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Bounding Box</span>
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black rounded-xl overflow-hidden border border-surface-border/80 flex items-center justify-center min-h-[300px]"
      >
        {liveScreenshot ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* The Live Screenshot Frame */}
            <img
              src={liveScreenshot}
              alt="Doping Hafıza Live Preview"
              className="max-w-full max-h-full object-contain pointer-events-none select-none"
            />

            {/* Bounding Box Overlay for Target / Error / Actionability Inspection */}
            {showOverlay && boundingBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(boundingBox.x / viewportWidth) * 100}%`,
                  top: `${(boundingBox.y / viewportHeight) * 100}%`,
                  width: `${(boundingBox.width / viewportWidth) * 100}%`,
                  height: `${(boundingBox.height / viewportHeight) * 100}%`,
                }}
                className={`border-2 rounded transition-all animate-pulse pointer-events-none z-20 ${
                  runnerStatus === 'FAILED'
                    ? 'border-red-500 bg-red-500/20 shadow-glow-crimson'
                    : 'border-emerald-400 bg-emerald-400/20 shadow-glow-emerald'
                }`}
              >
                {/* Element Label Pill */}
                <div
                  className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-lg flex items-center space-x-1 ${
                    runnerStatus === 'FAILED' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {runnerStatus === 'FAILED' ? (
                    <AlertTriangle className="w-2.5 h-2.5 inline" />
                  ) : (
                    <CheckCircle className="w-2.5 h-2.5 inline" />
                  )}
                  <span>{boundingBox.label || 'Target Element'}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-200 border border-surface-border flex items-center justify-center mx-auto text-gray-500">
              <Monitor className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-300">Ekran Akışı Bekleniyor</div>
              <div className="text-[11px] text-gray-500 mt-1 max-w-xs">
                Test çalıştırıldığında Playwright oturumundan anlık kareler ve element çerçeveleri burada akacaktır.
              </div>
            </div>
          </div>
        )}

        {/* Actionability / Overlap Status Badge */}
        {liveScreenshot && (
          <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Actionability: OK (No Obscuring Overlap)</span>
          </div>
        )}
      </div>
    </div>
  );
};
