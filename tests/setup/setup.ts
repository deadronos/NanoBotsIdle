// Mock localStorage
if (typeof localStorage === "undefined") {
  const makeMockStorage = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => (map.has(k) ? (map.get(k) ?? null) : null),
      setItem: (k: string, v: string) => {
        map.set(String(k), String(v));
      },
      removeItem: (k: string) => {
        map.delete(String(k));
      },
      clear: () => {
        map.clear();
      },
      get length() {
        return map.size;
      },
      key: (i: number) => Array.from(map.keys())[i] ?? null,
    } as unknown as Storage;
  };

  global.localStorage = makeMockStorage();
}

// Ensure React's testing 'act' environment flag is set for jsdom tests.
// React 18+ requires globalThis.IS_REACT_ACT_ENVIRONMENT = true for act() to work without errors.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

if (typeof globalThis.IS_REACT_ACT_ENVIRONMENT === "undefined") {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

// jsdom does not implement navigation triggered by `<a download>.click()` or
// `window.location.reload()`. A handful of tests legitimately exercise those
// paths (export-save download anchor, saveUtils.resetGame reload). Filter the
// well-known jsdom warning so the test output stays clean without silencing
// real errors that consumers should still see.
//
// We patch `process.stderr.write` because vitest's jsdom env wires jsdom's
// VirtualConsole to Node's built-in console before setupFiles run, so console
// overrides here wouldn't intercept. Filtering at the stream level catches
// the warning regardless of how it was emitted.
const NAV_WARNING_PREFIX = "Not implemented: navigation";
if (typeof process !== "undefined" && process.stderr) {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: typeof process.stderr.write }).write = ((
    chunk: string | Uint8Array,
    ...rest: unknown[]
  ) => {
    if (typeof chunk === "string" && chunk.startsWith(NAV_WARNING_PREFIX)) {
      return true;
    }
    return (originalStderrWrite as unknown as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stderr.write;
}

export {};
