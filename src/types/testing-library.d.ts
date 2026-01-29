declare module "@testing-library/react" {
  import type React from "react";
  export function render(ui: React.ReactElement): { container: HTMLElement };
  export const screen: any;
  export function cleanup(): void;
}

declare module "@testing-library/jest-dom" {
  // jest-dom augmentations; minimal placeholder so types compile
  // (runtime matchers come from the package during actual test runs)
  export {};
}
