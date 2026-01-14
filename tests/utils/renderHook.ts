import React from "react";
import { render } from "@testing-library/react";

export function renderHook<T>(fn: () => T) {
  let result: { current: T } = { current: undefined as unknown as T };
  const Wrapper = () => {
    result.current = fn();
    return null;
  };
  render(React.createElement(Wrapper));
  return { result };
}
