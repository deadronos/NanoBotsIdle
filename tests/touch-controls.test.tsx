// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import { TouchControls } from "../src/components/ui/TouchControls";

const noop = () => undefined;
const originalMatchMedia = typeof window !== "undefined" ? window.matchMedia : undefined;
let root: Root | null = null;
let container: HTMLDivElement | null = null;

const renderTouchControls = () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<TouchControls />);
  });
};

afterEach(() => {
  // reset nav
  try {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
  } catch {
    // ignore in environments where property is not configurable
  }
  // restore matchMedia to default
  if (originalMatchMedia) {
    window.matchMedia = originalMatchMedia;
  }

  if (root && container) {
    act(() => {
      root!.unmount();
    });
    container.remove();
  }
  root = null;
  container = null;
});

describe("TouchControls", () => {
  test("does not render on non-touch environments", () => {
    try {
      Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
    } catch {
      // ignore when immutably defined
    }
    try {
      // Ensure ontouchstart absent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).ontouchstart;
    } catch {
      /* ignore - some test environments disallow deleting globals */
    }
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener: noop,
        removeEventListener: noop,
      }) as unknown as MediaQueryList;

    renderTouchControls();
    const buttons = container?.querySelectorAll("button") ?? [];
    expect(buttons.length).toBe(0);
  });

  test("renders arrow buttons on touch-capable device", () => {
    try {
      Object.defineProperty(navigator, "maxTouchPoints", { value: 1, configurable: true });
    } catch {
      // ignore when immutably defined
    }
    window.matchMedia = () =>
      ({
        matches: true,
        addEventListener: noop,
        removeEventListener: noop,
      }) as unknown as MediaQueryList;

    renderTouchControls();
    const buttons = container?.querySelectorAll("button") ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });
});
