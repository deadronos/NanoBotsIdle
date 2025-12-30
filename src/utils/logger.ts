export const isDev = process.env.NODE_ENV === "development";

export const debug = (...args: unknown[]) => {
  if (isDev) console.debug(...args);
};

export const info = (...args: unknown[]) => {
  if (isDev) console.info(...args);
};

export const warn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

// Errors should always be visible
export const error = (...args: unknown[]) => {
  console.error(...args);
};

// Group helpers for dev-time verbose debugging
export const groupCollapsed = (...args: unknown[]) => {
  if (isDev) console.groupCollapsed(...args);
};

export const groupEnd = () => {
  if (isDev) console.groupEnd();
};
