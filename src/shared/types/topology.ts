export type TopologyItemType = 
  | 'VIDEO' 
  | 'TEST' 
  | 'DRAG_DROP' 
  | 'INTERACTIVE' 
  | 'PANEL' 
  | 'TAB';

export type PathAction = 'CLICK' | 'SCROLL' | 'WAIT' | 'HOVER' | 'TYPE' | 'NAVIGATE' | 'GRADE' | 'BACK' | 'URL';

export interface PathStep {
  action: PathAction;
  target: string;
  selector?: string;
  timeoutMs?: number;
  value?: string;
}

export interface TopologyItem {
  id: string;
  title: string;
  type: TopologyItemType;
  selector?: string;
  urlState?: string;
  aliases?: string[];
  keywords?: string[];
  unitId?: string;
  unitTitle?: string;
  pathSequence: PathStep[];
  returnSequence?: PathStep[];
  metadata?: Record<string, any>;
}

export interface TopologyTopic {
  id: string;
  title: string;
  selector?: string;
  aliases?: string[];
  keywords?: string[];
  unitId?: string;
  unitTitle?: string;
  pathSequence?: PathStep[];
  returnSequence?: PathStep[];
  items: TopologyItem[];
}

export interface TopologySubject {
  id: string;
  title: string;
  selector?: string;
  aliases?: string[];
  keywords?: string[];
  pathSequence?: PathStep[];
  returnSequence?: PathStep[];
  topics: TopologyTopic[];
}

export interface GradeLevelData {
  gradeName: string; // e.g. "4. Sınıf", "8. Sınıf", "12. Sınıf", "YKS 2028"
  subjects: TopologySubject[];
}

export interface AppTopology {
  updatedAt: string;
  gradeLevels: {
    PRIMARY?: GradeLevelData;
    MIDDLE_LGS?: GradeLevelData;
    HIGH_YKS?: GradeLevelData;
    [key: string]: GradeLevelData | undefined;
  };
}

export interface SearchableNode {
  nodeId: string;
  title: string;
  type: TopologyItemType;
  levelKey: string;
  gradeName: string;
  subjectId: string;
  subjectTitle: string;
  unitId?: string;
  unitTitle?: string;
  topicId?: string;
  topicTitle?: string;
  selector?: string;
  urlState?: string;
  pathSequence: PathStep[];
  returnSequence?: PathStep[];
  aliases: string[];
  keywords: string[];
  isBundle?: boolean;
  bundleType?: 'YAZILI_PROVALARI' | 'KAMP' | 'EXAMS';
  isBundleSubItem?: boolean;
  isPrimarySubject?: boolean;
  discipline?: string;
}
