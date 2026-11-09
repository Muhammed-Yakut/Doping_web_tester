import React from 'react';
import { useTestStore } from '../store/useTestStore.ts';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Compass, 
  Video, 
  HelpCircle, 
  Move, 
  CheckSquare, 
  Hourglass,
  Layers,
  GraduationCap,
  Home,
  ShieldCheck
} from 'lucide-react';
import { ActionType, StepStatus } from '../../types/index.ts';

export const ExecutionTimeline: React.FC = () => {
  const { activePlan, stepResults, currentStepId, isRunning, runnerStatus } = useTestStore();

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case 'NAVIGATE_TO':
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'CHANGE_LEVEL':
        return <GraduationCap className="w-4 h-4 text-pink-400" />;
      case 'GO_HOME':
        return <Home className="w-4 h-4 text-blue-400" />;
      case 'DISMISS_POPUPS':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'VIDEO_CONTROL':
        return <Video className="w-4 h-4 text-purple-400" />;
      case 'SOLVE_QUIZ':
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'DRAG_AND_DROP':
        return <Move className="w-4 h-4 text-indigo-400" />;
      case 'VERIFY_ELEMENT':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'WAIT':
        return <Hourglass className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: StepStatus = 'PENDING') => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>BAŞARILI</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[10px] font-bold flex items-center space-x-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
            <span>İŞLENİYOR</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/60 text-[10px] font-bold flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>HATA</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-surface-200 text-gray-500 border border-surface-border text-[10px] font-semibold">
            BEKLİYOR
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-100 rounded-2xl border border-surface-border p-5 flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Canlı Yürütme Akışı (Execution Timeline)
          </h2>
        </div>
        {activePlan && (
          <span className="text-[11px] font-mono text-gray-400">
            {Object.values(stepResults).filter((r) => r.status === 'SUCCESS').length} / {activePlan.steps.length} Tamamlandı
          </span>
        )}
      </div>

      {/* Plan Intent Summary */}
      {activePlan ? (
        <div className="mb-4 p-3 rounded-xl bg-purple-950/20 border border-purple-900/30">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">Hedef &amp; Niyet:</div>
          <div className="text-xs text-gray-200 font-medium mt-0.5 line-clamp-2">
            {activePlan.intent}
          </div>
          <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-gray-400">
            <span>Seviye: <strong className="text-purple-300">{activePlan.targetLevel}</strong></span>
            <span>•</span>
            <span>Toplam Adım: <strong className="text-white">{activePlan.steps.length}</strong></span>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-xl bg-surface-200/50 border border-surface-border/60 text-center text-xs text-gray-500">
          Henüz bir test başlatılmadı. Yukarıdaki komut kutusundan çalıştırabilirsiniz.
        </div>
      )}

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {activePlan?.steps.map((step, idx) => {
          const res = stepResults[step.id];
          const isCurrent = currentStepId === step.id;
          const status = res?.status || (isCurrent ? 'RUNNING' : 'PENDING');

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-purple-950/30 border-purple-600/70 shadow-lg shadow-purple-600/10 ring-1 ring-purple-500/50'
                  : status === 'SUCCESS'
                  ? 'bg-surface-200/90 border-surface-border hover:border-gray-700'
                  : status === 'FAILED'
                  ? 'bg-red-950/20 border-red-800/60'
                  : 'bg-surface-200/40 border-surface-border/40 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-100 border border-surface-border flex items-center justify-center shrink-0 mt-0.5">
                    {getActionIcon(step.action)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-gray-500">#{idx + 1}</span>
                      <span className="text-xs font-bold text-gray-200">
                        {step.title || step.action}
                      </span>
                    </div>
                    {step.description && (
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                        {step.description}
                      </p>
                    )}

                    {/* Progress / Video Timer if available */}
                    {res?.details?.progress && (
                      <div className="mt-2 text-[10px] font-mono text-purple-300 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>
                          İlerleme: {res.details.progress.currentSec} / {res.details.progress.totalSec} sn
                        </span>
                      </div>
                    )}

                    {/* Step Error Message */}
                    {res?.error && (
                      <div className="mt-2 p-2 rounded bg-red-950/60 border border-red-800/80 text-[11px] text-red-300 font-mono">
                        {res.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0 ml-2">
                  {getStatusBadge(status)}
                  {res?.durationMs !== undefined && (
                    <span className="text-[10px] font-mono text-gray-500">
                      {res.durationMs}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
