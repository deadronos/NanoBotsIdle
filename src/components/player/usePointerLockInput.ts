import { type MutableRefObject, useEffect, useRef } from "react";

export type PointerLockInput = {
  keys: MutableRefObject<Record<string, boolean>>;
  cameraAngle: MutableRefObject<{ yaw: number; pitch: number }>;
};

import { debug, warn } from "../../utils/logger";

export const usePointerLockInput = (): PointerLockInput => {
  const keys = useRef<Record<string, boolean>>({});
  const cameraAngle = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== document.body) return;

      cameraAngle.current.yaw -= e.movementX * 0.002;
      cameraAngle.current.pitch -= e.movementY * 0.002;

      cameraAngle.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, cameraAngle.current.pitch),
      );
    };

    const handleClick = (event: MouseEvent) => {
      if (document.pointerLockElement === document.body) return;
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest("[data-ui-overlay]")) return;
        if (target.closest("[role='dialog']")) return;
        if (target.closest("button, a, input, textarea, select, [role='button']")) return;
      }

      try {
        const result = document.body.requestPointerLock() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === "function") {
          result.catch((err: unknown) => {
            if (err instanceof Error) {
              if (err.name === "NotSupportedError" || err.message?.includes("exited the lock"))
                return;
              debug("Pointer lock interrupted:", err);
            }
          });
        }
      } catch (e) {
        warn("Pointer lock error:", e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("click", handleClick);
    };
  }, []);

  return { keys, cameraAngle };
};
