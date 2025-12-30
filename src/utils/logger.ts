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
