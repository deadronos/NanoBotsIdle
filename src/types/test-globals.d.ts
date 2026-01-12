// Minimal globals for tests to satisfy TypeScript in environments where test types
// are not automatically available (e.g., when running tsc directly).
declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare function expect(actual: any): any;