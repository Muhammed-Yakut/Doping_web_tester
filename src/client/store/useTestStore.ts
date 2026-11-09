import { create } from 'zustand';
import { TestActionPlan, StepExecutionResult, TargetLevel, AppTargetMode, WSMessage } from '../../types/index.ts';

export interface LogItem {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  meta?: any;
}

interface TestStoreState {
  wsConnected: boolean;
  latencyMs: number;
  electronConnected: boolean;
  isRealCDPActive: boolean;
  targetAppMode: AppTargetMode;
  electronAppPath: string;
  cdpPort: number;
  hasApiKey: boolean;

  selectedLevel: TargetLevel;
  promptText: string;
  isParsing: boolean;
  isRunning: boolean;
  runnerStatus: 'IDLE' | 'PARSING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  activePlan: TestActionPlan | null;
  stepResults: Record<string, StepExecutionResult>;
  currentStepId: string | null;

  liveScreenshot: string | null;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  } | null;

  logs: LogItem[];
  isSettingsOpen: boolean;

  // Actions
  setPromptText: (text: string) => void;
  setSelectedLevel: (level: TargetLevel) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setTargetAppMode: (mode: AppTargetMode) => void;
  setElectronAppPath: (path: string) => void;

  initWebSocket: () => void;
  parsePrompt: (prompt?: string) => Promise<TestActionPlan | null>;
  runTest: (customPrompt?: string) => Promise<void>;
  connectRealApp: () => Promise<void>;
  stopTest: () => Promise<void>;
  saveConfig: (apiKey: string, mode: AppTargetMode, path: string, port?: number) => Promise<void>;
  triggerMacro: (macroAction: string) => Promise<void>;
  clearLogs: () => void;
}

let wsInstance: WebSocket | null = null;
let pingInterval: NodeJS.Timeout | null = null;

export const useTestStore = create<TestStoreState>((set, get) => ({
  wsConnected: false,
  latencyMs: 18,
  electronConnected: true,
  isRealCDPActive: true,
  targetAppMode: 'REAL_ELECTRON',
  electronAppPath: '/Applications/Doping Hafıza Desktop.app',
  cdpPort: 9222,
  hasApiKey: false,

  selectedLevel: 'HIGH_YKS',
  promptText: '12. sınıf mat üslü sayılara gir, videoyu 2x yapıp 15 saniye izle, mini testi full salla, analiz ekranı çöküyor mu bak',
  isParsing: false,
  isRunning: false,
  runnerStatus: 'IDLE',

  activePlan: null,
  stepResults: {},
  currentStepId: null,

  liveScreenshot: null,
  boundingBox: null,
  logs: [],
  isSettingsOpen: false,

  setPromptText: (text) => set({ promptText: text }),
  setSelectedLevel: (level) => set({ selectedLevel: level }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setTargetAppMode: (mode) => set({ targetAppMode: mode }),
  setElectronAppPath: (path) => set({ electronAppPath: path }),

  clearLogs: () => set({ logs: [] }),

  initWebSocket: () => {
    if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsInstance = new WebSocket(wsUrl);

      wsInstance.onopen = () => {
        set({ wsConnected: true });
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }
        }, 3000);
      };

      wsInstance.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'PONG') {
            const now = Date.now();
            const rtt = Math.max(1, now - (msg.clientSentTime || now));
            set({ latencyMs: rtt });
            return;
          }

          if (msg.type === 'INIT_STATE') {
            const { recentLogs, targetMode, isRealCDPActive, hasApiKey } = msg.payload;
            if (recentLogs) {
              set({
                logs: recentLogs.map((l: any, i: number) => ({
                  id: `init_${i}_${Date.now()}`,
                  ...l,
                })),
              });
            }
            if (targetMode) {
              set({
                targetAppMode: targetMode.targetAppMode,
                electronAppPath: targetMode.electronAppPath,
                electronConnected: targetMode.electronConnected,
                cdpPort: targetMode.cdpPort || 9222,
              });
            }
            if (isRealCDPActive !== undefined) {
              set({ isRealCDPActive });
            }
            if (hasApiKey !== undefined) {
              set({ hasApiKey });
            }
          }

          if (msg.type === 'LOG') {
            const logEntry: LogItem = {
              id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              level: msg.payload.level,
              message: msg.payload.message,
              timestamp: msg.payload.timestamp,
              meta: msg.payload.meta,
            };
            set((state) => ({
              logs: [...state.logs.slice(-300), logEntry],
            }));
          }

          if (msg.type === 'PLAN_GENERATED') {
            set({ activePlan: msg.payload, isParsing: false });
          }

          if (msg.type === 'RUNNER_STATUS') {
            const { status, plan } = msg.payload;
            if (plan) set({ activePlan: plan });
            if (status === 'RUNNING') {
              set({ isRunning: true, runnerStatus: 'RUNNING' });
            } else if (status === 'COMPLETED') {
              set({ isRunning: false, runnerStatus: 'COMPLETED', currentStepId: null });
            } else if (status === 'FAILED') {
              set({ isRunning: false, runnerStatus: 'FAILED', currentStepId: null });
            }
          }

          if (msg.type === 'STEP_STARTED') {
            const { stepId, step } = msg.payload;
            set((state) => ({
              currentStepId: stepId,
              stepResults: {
                ...state.stepResults,
                [stepId]: {
                  stepId,
                  action: step.action,
                  status: 'RUNNING',
                  startTime: Date.now(),
                },
              },
            }));
          }

          if (msg.type === 'STEP_UPDATED') {
            const { stepId, progress } = msg.payload;
            set((state) => {
              const prev = state.stepResults[stepId];
              if (!prev) return state;
              return {
                stepResults: {
                  ...state.stepResults,
                  [stepId]: {
                    ...prev,
                    details: { ...prev.details, progress },
                  },
                },
              };
            });
          }

          if (msg.type === 'STEP_COMPLETED') {
            const { stepId, result } = msg.payload;
            set((state) => ({
              stepResults: {
                ...state.stepResults,
                [stepId]: result,
              },
              boundingBox: result.boundingBox || null,
            }));
          }

          if (msg.type === 'SCREENSHOT_FRAME') {
            set({ liveScreenshot: msg.payload.image });
          }

          if (msg.type === 'BOUNDING_BOX') {
            set({ boundingBox: msg.payload });
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      wsInstance.onclose = () => {
        set({ wsConnected: false });
        if (pingInterval) clearInterval(pingInterval);
        setTimeout(() => get().initWebSocket(), 3000);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  },

  connectRealApp: async () => {
    try {
      const res = await fetch('/api/connect-real', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        set({ isRealCDPActive: true, targetAppMode: 'REAL_ELECTRON' });
      }
    } catch (err) {
      console.error('Connect real app error:', err);
    }
  },

  parsePrompt: async (prompt) => {
    const p = prompt || get().promptText;
    set({ isParsing: true });
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      set({ activePlan: data, isParsing: false });
      return data;
    } catch (err) {
      console.error('Parse error:', err);
      set({ isParsing: false });
      return null;
    }
  },

  runTest: async (customPrompt) => {
    const prompt = customPrompt || get().promptText;
    const mode = get().targetAppMode;

    set({
      isRunning: true,
      runnerStatus: 'RUNNING',
      stepResults: {},
      boundingBox: null,
    });

    try {
      await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, targetMode: mode }),
      });
    } catch (err) {
      console.error('Run test error:', err);
      set({ isRunning: false, runnerStatus: 'FAILED' });
    }
  },

  stopTest: async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
      set({ isRunning: false, runnerStatus: 'IDLE' });
    } catch (err) {
      console.error('Stop error:', err);
    }
  },

  saveConfig: async (apiKey, mode, path, port) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          targetAppMode: mode,
          electronAppPath: path,
          cdpPort: port || 9222,
        }),
      });
      const data = await res.json();
      set({
        targetAppMode: data.targetAppMode,
        electronAppPath: data.electronAppPath,
        hasApiKey: data.hasApiKey,
        cdpPort: data.cdpPort || 9222,
        isSettingsOpen: false,
      });
    } catch (err) {
      console.error('Config save error:', err);
    }
  },

  triggerMacro: async (macroAction) => {
    try {
      await fetch('/api/macro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: macroAction }),
      });
    } catch (err) {
      console.error('Macro error:', err);
    }
  },
}));
