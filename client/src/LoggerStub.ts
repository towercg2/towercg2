export interface LoggerStub {
  info(...args: any[]): void;
  debug(...args: any[]): void;
  error(...args: any[]): void;
  trace(...args: any[]): void;
}
