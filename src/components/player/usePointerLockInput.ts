import { type MutableRefObject, useEffect, useRef } from "react";

export type PointerLockInput = {
  keys: MutableRefObject<Record<string, boolean>>;
  cameraAngle: MutableRefObject<{ yaw: number; pitch: number }>;
};

import { debug, warn } from "../../utils/logger";

export const usePointerLockInput = (): PointerLockInput => {
  const keys = useRef<Record<string, boolean>>({});
  const cameraAngle = useRef({ yaw: 0, pitch: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if typing in an input
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      keys.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    // Unified move handler
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current || !lastPos.current) return;

      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;

      cameraAngle.current.yaw -= dx * 0.005;
      cameraAngle.current.pitch -= dy * 0.005;

      cameraAngle.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, cameraAngle.current.pitch),
      );

      lastPos.current = { x: clientX, y: clientY };
    };

    // MOUSE EVENTS
    const handleMouseDown = (e: MouseEvent) => {
      // Don't drag if clicking UI
      if (
        e.target instanceof Element &&
        (e.target.closest("button") ||
          e.target.closest("[data-no-orbit]") ||
          e.target.closest("a, input, textarea, select"))
      ) {
        return;
      }
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      lastPos.current = null;
    };

    // TOUCH EVENTS
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (
          touch.target instanceof Element &&
          (touch.target.closest("button") ||
            touch.target.closest("[data-no-orbit]") ||
            touch.target.closest("a, input, textarea, select"))
        ) {
          return;
        }
        isDragging.current = true;
        lastPos.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches.length > 0) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      lastPos.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    // Mouse
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseUp); // Stop drag if leaving window

    // Touch
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseUp);

      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  return { keys, cameraAngle };
};
