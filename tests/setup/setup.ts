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

export {};
