/* eslint-disable no-console */
export const warnUnimplemented = (message: string, ...args: unknown[]): void => {
  console.warn(`[GameState] ${message}`, ...args);
};
