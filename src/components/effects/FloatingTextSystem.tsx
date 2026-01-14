import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import type { Vector3 } from "three";

export interface FloatingTextHandle {
  spawn: (pos: Vector3, text: string, color?: string) => void;
}

type TextInstance = {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  life: number;
  color: string;
};

export const FloatingTextSystem = forwardRef<FloatingTextHandle>((_, ref) => {
  const [texts, setTexts] = useState<TextInstance[]>([]);
  const nextId = React.useRef(0);

  useImperativeHandle(ref, () => ({
    spawn: (pos: Vector3, text: string, color = "#ffffff") => {
      const id = nextId.current++;
      setTexts((prev) => [
        ...prev,
        {
          id,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          text,
          life: 1.5, // 1.5 seconds duration
          color,
        },
      ]);
    },
  }));

  useFrame((state, delta) => {
    if (texts.length === 0) return;

    setTexts((prev) => {
      const next: TextInstance[] = [];
      let changed = false;
      for (const t of prev) {
        t.life -= delta;
        t.y += delta * 1.5; // Float up speed
        if (t.life > 0) {
          next.push(t);
        } else {
          changed = true;
        }
      }

      // If we only updated positions (mutation), we usually need to force re-render or let React handle state update.
      // Since we are mutating 't.y' inside the loop on the previous state objects (which is bad practice in React strict mode but fast here),
      // we should be careful. Better to return new objects if we rely on React re-render.
      // However, for high frequency updates, we might want to avoid React state for position and use Refs,
      // but Html component needs React state or props to move unless we target its div ref.

      // For simplicity/correctness, let's map to new objects if we want smooth updates via React state, but this might be lagging.
      // Actually, standard HTML overlay component from Drei tracks the 3D position automatically if we wrap it in a group or mesh.
      // So we just need to update the list of active texts.
      return changed ? next : prev;
    });
  });

  return (
    <>
      {texts.map((t) => (
        <group key={t.id} position={[t.x, t.y, t.z]}>
          <Html center style={{ pointerEvents: "none" }} zIndexRange={[100, 0]}>
            <div
              style={{
                color: t.color,
                fontWeight: "bold",
                fontSize: "16px",
                textShadow: "1px 1px 2px black",
                opacity: Math.min(1, t.life * 2),
                transform: `translateY(0px)`, // Just for potential CSS animations
                whiteSpace: "nowrap",
              }}
            >
              {t.text}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
});

FloatingTextSystem.displayName = "FloatingTextSystem";
