import winston from 'winston';

export type LogBroadcaster = (logEntry: {
  level: string;
  message: string;
  timestamp: string;
  meta?: any;
}) => void;

class LoggerService {
  private logger: winston.Logger;
  private broadcaster: LogBroadcaster | null = null;
  private logBuffer: Array<{
    level: string;
    message: string;
    timestamp: string;
    meta?: any;
  }> = [];
  private maxBufferSize = 500;

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })
          ),
        }),
      ],
    });
  }

  public setBroadcaster(fn: LogBroadcaster) {
    this.broadcaster = fn;
  }

  public getRecentLogs() {
    return [...this.logBuffer];
  }

  public log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any) {
    const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    const entry = { level, message, timestamp, meta };

    this.logger.log(level, message, meta);

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    if (this.broadcaster) {
      try {
        this.broadcaster(entry);
      } catch (err) {
        // Broadcaster error ignored to avoid cascading
      }
    }
  }

  public info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  public debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }
}

export const logger = new LoggerService();
