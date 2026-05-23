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

  useFrame((_, delta) => {
    if (texts.length === 0) return;

    setTexts((prev) =>
      prev
        .map((t) => ({
          ...t,
          life: t.life - delta,
          y: t.y + delta * 1.5,
        }))
        .filter((t) => t.life > 0),
    );
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
