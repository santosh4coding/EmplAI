export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  static info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  static warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  static error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error ? {
      message: error.message,
      stack: error.stack,
      ...meta
    } : meta;
    console.error(this.formatMessage('error', message, errorMeta));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  static httpRequest(req: any, res: any, responseTime?: number): void {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };
    this.info(`${req.method} ${req.url} ${res.statusCode}`, meta);
  }
}