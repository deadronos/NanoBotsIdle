// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { TouchControls } from '../src/components/ui/TouchControls';

const noop = () => undefined;
const originalMatchMedia = typeof window !== 'undefined' ? window.matchMedia : undefined;

afterEach(() => {
  // reset nav
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  } catch {
    // ignore in environments where property is not configurable
  }
  // restore matchMedia to default
  if (originalMatchMedia) {
    window.matchMedia = originalMatchMedia;
  }
});

describe('TouchControls', () => {
  test('does not render on non-touch environments', () => {
    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
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
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop } as MediaQueryList);

    render(<TouchControls />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  test('renders arrow buttons on touch-capable device', () => {
    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });
    } catch {
      // ignore when immutably defined
    }
    window.matchMedia = () => ({ matches: true, addEventListener: noop, removeEventListener: noop } as MediaQueryList);

    render(<TouchControls />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });
});
