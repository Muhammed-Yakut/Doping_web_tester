export * from '../../types/index.ts';

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  meta?: any;
}
