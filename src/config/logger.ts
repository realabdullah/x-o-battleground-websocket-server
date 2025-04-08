const getTimestamp = () => new Date().toISOString();

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',

  fgRed: '\x1b[31m',
  fgGreen: '\x1b[32m',
  fgYellow: '\x1b[33m',
  fgBlue: '\x1b[34m',
  fgCyan: '\x1b[36m',
  fgMagenta: '\x1b[35m',
};

export class Logger {
  static info(message: string) {
    console.log(`${COLORS.fgCyan}[INFO] ${getTimestamp()}${COLORS.reset} ${message}`);
  }

  static error(message: string) {
    console.error(`${COLORS.fgRed}[ERROR] ${getTimestamp()}${COLORS.reset} ${message}`);
  }

  static warn(message: string) {
    console.warn(`${COLORS.fgYellow}[WARN] ${getTimestamp()}${COLORS.reset} ${message}`);
  }

  static debug(message: string) {
    console.debug(`${COLORS.fgMagenta}[DEBUG] ${getTimestamp()}${COLORS.reset} ${message}`);
  }

  static success(message: string) {
    console.log(`${COLORS.fgGreen}[SUCCESS] ${getTimestamp()}${COLORS.reset} ${message}`);
  }
}
