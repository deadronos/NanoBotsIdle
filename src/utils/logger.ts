/**
 * Logger utility for consistent, environment-aware logging.
 * 
 * Debug logs are:
 * - Enabled in development (NODE_ENV === 'development')
 * - Can be toggled at runtime via enableDebug()/disableDebug()
 * - Automatically stripped from production builds via Vite's dead-code elimination
 * 
 * Production builds only include error logs; all debug/info/warn are removed at build time.
 */

const isDev = process.env.NODE_ENV === "development";

// Runtime debug toggle (only affects development; production always has debug disabled)
let debugEnabled = isDev;

/**
 * Enable debug logging at runtime (development only).
 * In production builds, debug logs are stripped entirely.
 */
export const enableDebug = () => {
  if (isDev) {
    debugEnabled = true;
  }
};

/**
 * Disable debug logging at runtime (development only).
 */
export const disableDebug = () => {
  if (isDev) {
    debugEnabled = false;
  }
};

/**
 * Check if debug logging is currently enabled.
 * Always returns false in production builds.
 */
export const isDebugEnabled = (): boolean => {
  if (isDev) {
    return debugEnabled;
  }
  return false;
};

/**
 * Log debug messages (development only).
 * Stripped from production builds.
 */
export const debug = (...args: unknown[]) => {
  if (isDev && debugEnabled) {
    console.debug(...args);
  }
};

/**
 * Log informational messages (development only).
 * Stripped from production builds.
 */
export const info = (...args: unknown[]) => {
  if (isDev && debugEnabled) {
    console.info(...args);
  }
};

/**
 * Log warning messages (development only).
 * Stripped from production builds.
 */
export const warn = (...args: unknown[]) => {
  if (isDev && debugEnabled) {
    console.warn(...args);
  }
};

/**
 * Log error messages (always visible in all environments).
 * This is the only log level that appears in production builds.
 */
export const error = (...args: unknown[]) => {
  console.error(...args);
};

/**
 * Start a collapsible log group (development only).
 * Stripped from production builds.
 */
export const groupCollapsed = (...args: unknown[]) => {
  if (isDev && debugEnabled) {
    console.groupCollapsed(...args);
  }
};

/**
 * End a log group (development only).
 * Stripped from production builds.
 */
export const groupEnd = () => {
  if (isDev && debugEnabled) {
    console.groupEnd();
  }
};
