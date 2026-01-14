import { render } from "@testing-library/react";
import React from "react";

export function renderHook<T>(fn: () => T) {
  const result: { current: T } = { current: undefined as unknown as T };
  const Wrapper = () => {
    result.current = fn();
    return null;
  };
  render(React.createElement(Wrapper));
  return { result };
}
