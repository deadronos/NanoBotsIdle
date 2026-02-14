import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";

type RenderedHook = {
  root: Root;
  container: HTMLDivElement;
};

const mountedHooks: RenderedHook[] = [];

afterEach(() => {
  for (const rendered of mountedHooks.splice(0, mountedHooks.length)) {
    act(() => {
      rendered.root.unmount();
    });
    rendered.container.remove();
  }
});

export function renderHook<T>(fn: () => T) {
  const result: { current: T } = { current: undefined as unknown as T };
  const Wrapper = () => {
    result.current = fn();
    return null;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(Wrapper));
  });
  mountedHooks.push({ root, container });

  return { result };
}
