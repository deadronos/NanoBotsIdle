import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  debug,
  disableDebug,
  enableDebug,
  error,
  groupCollapsed,
  groupEnd,
  info,
  isDebugEnabled,
  warn,
} from "../src/utils/logger";

describe("logger utility", () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupCollapsedSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleGroupCollapsedSpy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleGroupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleGroupCollapsedSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
  });

  describe("in development environment", () => {
    it("should call console.debug when debug() is called with debug enabled", () => {
      enableDebug();
      // eslint-disable-next-line testing-library/no-debugging-utils
      debug("test message", 123);

      // In development, debug logs should be called
      if (process.env.NODE_ENV === "development") {
        expect(consoleDebugSpy).toHaveBeenCalledWith("test message", 123);
      }
    });

    it("should call console.info when info() is called with debug enabled", () => {
      enableDebug();
      info("info message");

      if (process.env.NODE_ENV === "development") {
        expect(consoleInfoSpy).toHaveBeenCalledWith("info message");
      }
    });

    it("should call console.warn when warn() is called with debug enabled", () => {
      enableDebug();
      warn("warning message");

      if (process.env.NODE_ENV === "development") {
        expect(consoleWarnSpy).toHaveBeenCalledWith("warning message");
      }
    });

    it("should always call console.error when error() is called", () => {
      error("error message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("error message");
    });

    it("should call console.groupCollapsed when groupCollapsed() is called with debug enabled", () => {
      enableDebug();
      groupCollapsed("group title");

      if (process.env.NODE_ENV === "development") {
        expect(consoleGroupCollapsedSpy).toHaveBeenCalledWith("group title");
      }
    });

    it("should call console.groupEnd when groupEnd() is called with debug enabled", () => {
      enableDebug();
      groupEnd();

      if (process.env.NODE_ENV === "development") {
        expect(consoleGroupEndSpy).toHaveBeenCalled();
      }
    });

    it("should not call console methods when debug is disabled", () => {
      disableDebug();
      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();
      consoleWarnSpy.mockClear();

      // eslint-disable-next-line testing-library/no-debugging-utils
      debug("test");
      info("test");
      warn("test");
      groupCollapsed("test");
      groupEnd();

      if (process.env.NODE_ENV === "development") {
        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
        expect(consoleGroupEndSpy).not.toHaveBeenCalled();
      }
    });

    it("should toggle debug state with enableDebug/disableDebug", () => {
      if (process.env.NODE_ENV === "development") {
        enableDebug();
        expect(isDebugEnabled()).toBe(true);

        disableDebug();
        expect(isDebugEnabled()).toBe(false);

        enableDebug();
        expect(isDebugEnabled()).toBe(true);
      }
    });
  });

  describe("in production environment", () => {
    it("isDebugEnabled should return false in production", () => {
      if (process.env.NODE_ENV === "production") {
        expect(isDebugEnabled()).toBe(false);
      }
    });
  });
});
