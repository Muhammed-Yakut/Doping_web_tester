import React, { useState, useRef, useEffect } from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { Terminal, ChevronDown, ChevronUp, Trash2, Filter, Code2 } from 'lucide-react';

export const LogConsole: React.FC = () => {
  const { logs, clearLogs, activePlan } = useTestStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PLAYWRIGHT' | 'GEMINI_PLAN'>('ALL');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level.toUpperCase() !== filterLevel) {
      return false;
    }
    if (activeTab === 'PLAYWRIGHT') {
      return log.message.includes('Playwright') || log.message.includes('SmartRouter') || log.message.includes('Video') || log.message.includes('Quiz');
    }
    return true;
  });

  return (
    <div className="bg-surface-100 rounded-2xl border border-surface-border flex flex-col shadow-xl transition-all">
      {/* Console Header Bar */}
      <div className="h-11 px-4 border-b border-surface-border flex items-center justify-between select-none">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-xs font-bold text-gray-300 hover:text-white"
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Sistem Konsolu &amp; Log Akışı</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {/* Console View Tabs */}
          <div className="flex items-center space-x-1 bg-surface-200 p-0.5 rounded-lg border border-surface-border text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'ALL' ? 'bg-surface-100 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Winston Logları ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('PLAYWRIGHT')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'PLAYWRIGHT' ? 'bg-surface-100 text-cyan-300 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Playwright Adımları
            </button>
            <button
              onClick={() => setActiveTab('GEMINI_PLAN')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                activeTab === 'GEMINI_PLAN' ? 'bg-surface-100 text-purple-300 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Gemini JSON Planı</span>
            </button>
          </div>
        </div>

        {/* Filter & Clear Controls */}
        <div className="flex items-center space-x-2">
          {activeTab !== 'GEMINI_PLAN' && (
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              <Filter className="w-3 h-3 text-gray-500" />
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-0.5 rounded ${
                    filterLevel === lvl
                      ? 'bg-purple-900/60 text-purple-200 border border-purple-700'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={clearLogs}
            className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
            title="Logları Temizle"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Content Area */}
      {isExpanded && (
        <div ref={scrollRef} className="h-52 overflow-y-auto p-4 bg-black/40 font-mono text-[11px] space-y-1.5">
          {activeTab === 'GEMINI_PLAN' ? (
            <pre className="text-purple-300 bg-surface-200/40 p-3 rounded-lg border border-purple-900/30 overflow-x-auto leading-relaxed">
              {activePlan ? JSON.stringify(activePlan, null, 2) : '// Henüz bir plan oluşturulmadı.'}
            </pre>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === 'error'
                  ? 'text-red-400 font-bold'
                  : log.level === 'warn'
                  ? 'text-amber-400 font-bold'
                  : log.level === 'debug'
                  ? 'text-gray-500'
                  : 'text-cyan-400 font-semibold';

              return (
                <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`uppercase shrink-0 w-12 ${levelColor}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-300 break-words flex-1">
                    {log.message}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <span className="text-gray-500 ml-1">{JSON.stringify(log.meta)}</span>
                    )}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-gray-600 text-center py-8">Log kaydı bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  );
};
