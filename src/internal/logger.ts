/**
 * Minimal logger for Valhalla WASM
 * No-op in production when not configured
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

interface LoggerConfig {
  level: LogLevel
  prefix: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
}

let config: LoggerConfig = {
  level: 'none',
  prefix: '[valhalla-wasm]',
}

/**
 * Configure the logger
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options }
}

/**
 * Check if a log level is enabled
 */
function isEnabled(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level]
}

/**
 * Create a log function for a specific level
 */
function createLogFn(level: LogLevel, consoleFn: (...args: unknown[]) => void) {
  return (...args: unknown[]): void => {
    if (isEnabled(level)) {
      consoleFn(config.prefix, ...args)
    }
  }
}

export const logger = {
  debug: createLogFn('debug', console.debug),
  info: createLogFn('info', console.info),
  warn: createLogFn('warn', console.warn),
  error: createLogFn('error', console.error),
  
  /** Set log level */
  setLevel(level: LogLevel): void {
    config.level = level
  },
  
  /** Get current log level */
  getLevel(): LogLevel {
    return config.level
  },
}
