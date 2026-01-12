import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { TouchControls } from "../src/components/ui/TouchControls";

afterEach(() => {
  cleanup();
  // reset nav
  (navigator as any).maxTouchPoints = 0;
  // restore matchMedia to default
  (window as any).matchMedia = undefined;
});

describe("TouchControls", () => {
  test("does not render on non-touch environments", () => {
    (navigator as any).maxTouchPoints = 0;
    (window as any).matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    const { container } = render(<TouchControls />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders arrow buttons on touch-capable device", () => {
    (navigator as any).maxTouchPoints = 1;
    (window as any).matchMedia = () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    render(<TouchControls />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });
});
