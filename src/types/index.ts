import { PathStep } from '../shared/types/topology.ts';

export type TargetLevel = "PRIMARY" | "MIDDLE_LGS" | "HIGH_YKS";

export type ActionType = 
  | "NAVIGATE_TO" 
  | "VIDEO_CONTROL" 
  | "SOLVE_QUIZ" 
  | "DRAG_AND_DROP" 
  | "VERIFY_ELEMENT" 
  | "CHANGE_LEVEL"
  | "GO_HOME"
  | "DISMISS_POPUPS"
  | "WAIT";

export type QuizStrategy = "RANDOM" | "ALL_CORRECT" | "LEAVE_EMPTY" | "ALL_WRONG";

export type AssertionType = "VISIBLE" | "HIDDEN" | "NOT_CRASHED";

export interface StepParams {
  menu?: string;           // e.g. "İstatistikler", "Akıllı Değerlendirme Paneli", "Testler ve Denemeler"
  subTab?: string;         // e.g. "Bireysel Denemeler", "Tarama Testleri", "Geçmiş MEB Sınavları"
  testName?: string;       // e.g. "LGS 1.Deneme", "LGS TURBO Seviye Tespit Sınavı"
  subSection?: string;     // e.g. "WAY Startup Lab", "Görevlerim"
  subject?: string;        // e.g. "Matematik", "Fen Bilimleri"
  topic?: string;          // e.g. "Üslü Sayılar"
  targetGrade?: string;    // e.g. "8. Sınıf", "12. Sınıf", "4. Sınıf"
  level?: TargetLevel;     // e.g. "PRIMARY", "MIDDLE_LGS", "HIGH_YKS"
  speed?: number;          // e.g. 1.5, 2.0
  durationSec?: number;    // e.g. 15
  reWatch?: boolean;       // e.g. Tekrar/baştan izleme modu
  seekToEnd?: boolean;     // e.g. Videoyu son 2 saniyeye sararak tamamlama / soru çözme modu
  quizStrategy?: QuizStrategy;
  reSolve?: boolean;       // e.g. Tekrar/baştan çözme modu
  dragSource?: string;     // e.g. "2^3 Kartı"
  dropTarget?: string;     // e.g. "8 Hedef Kutusu"
  targetAssertion?: string;// e.g. "Analiz Paneli", "Net Grafiği"
  assertionType?: AssertionType;
  pathSequence?: PathStep[];
  returnSequence?: PathStep[];
  targetNodeId?: string;
  selector?: string;
  unitTitle?: string;
  contentItem?: string;    // e.g. "Konu Testi 1", "Pekiştirme Testi", "Çıkmış Sorular"
  isTopicTest?: boolean;   // e.g. Konu İçerikleri altındaki konu testine/sorularına gidilip çözüleceği
  leaveHalfway?: boolean;  // e.g. Testi tamamlamadan yarıda bırakıp 'Testi Yarıda Bırak' seçeneğiyle çıkma
  questionCount?: number | 'ALL'; // e.g. 1 (varsayılan), belirtilen soru sayısı veya 'ALL' (tüm sorular)
  maxQuestions?: number;   // e.g. Maksimum çözülecek soru adedi
}

export interface TestPlanStep {
  id: string;
  action: ActionType;
  params: StepParams;
  title?: string;
  description?: string;
}

export interface TestActionPlan {
  intent: string;
  targetLevel: TargetLevel;
  steps: TestPlanStep[];
}

export type StepStatus = "IDLE" | "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";

export interface StepExecutionResult {
  stepId: string;
  action: ActionType;
  status: StepStatus;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  error?: string;
  screenshotUrl?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  };
  details?: Record<string, any>;
}

export type AppTargetMode = "REAL_ELECTRON" | "SIMULATOR";

export interface RunnerState {
  status: "IDLE" | "PARSING" | "RUNNING" | "COMPLETED" | "FAILED" | "ABORTED";
  targetAppMode: AppTargetMode;
  electronAppPath: string;
  cdpPort: number;
  electronConnected: boolean;
  realAppUrl?: string;
  latencyMs: number;
  activePlan: TestActionPlan | null;
  stepResults: Record<string, StepExecutionResult>;
  currentStepId: string | null;
  totalDurationMs: number;
}

export interface WSMessage {
  type: 
    | "INIT_STATE"
    | "RUNNER_STATUS" 
    | "LOG" 
    | "STEP_STARTED" 
    | "STEP_UPDATED" 
    | "STEP_COMPLETED" 
    | "SCREENSHOT_FRAME" 
    | "BOUNDING_BOX" 
    | "PLAN_GENERATED"
    | "ERROR"
    | "HEARTBEAT";
  payload: any;
  timestamp: number;
}
