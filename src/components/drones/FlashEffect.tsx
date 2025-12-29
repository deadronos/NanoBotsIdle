import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useEffect, useRef } from "react";
import type { PointLight , Vector3 } from "three";

export interface FlashHandle {
  trigger: (pos: Vector3) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FlashEffectProps {}

export const FlashEffect = forwardRef<FlashHandle, FlashEffectProps>((props, ref) => {
  const lightsRef = useRef<(PointLight | null)[]>([]);

  const statesRef = useRef<{ active: boolean; age: number }[]>(
    new Array(10).fill(0).map(() => ({ active: false, age: 0 })),
  );

  const cursor = useRef(0);
  const poolSize = 10;

  useEffect(() => {
    const handle = ref as React.MutableRefObject<FlashHandle | null>;
    handle.current = {
      trigger: (pos: Vector3) => {
        const idx = cursor.current;
        cursor.current = (cursor.current + 1) % poolSize;

        const light = lightsRef.current[idx];
        if (light) {
          light.position.copy(pos);
          light.position.y += 0.5;
          light.visible = true;
          light.intensity = 10;
          statesRef.current[idx] = { active: true, age: 0 };
        }
      },
    };

    return () => {
      handle.current = null;
    };
  }, [ref]);

  useFrame((_, delta) => {
    statesRef.current.forEach((state, i) => {
      if (state.active) {
        state.age += delta;
        const duration = 0.4;

        if (state.age >= duration) {
          state.active = false;
          if (lightsRef.current[i]) lightsRef.current[i]!.visible = false;
        } else if (lightsRef.current[i]) {
          const t = 1 - state.age / duration;
          lightsRef.current[i]!.intensity = 10 * (t * t);
        }
      }
    });
  });

  return (
    <group>
      {Array.from({ length: poolSize }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lightsRef.current[i] = el;
          }}
          visible={false}
          color="#ffffaa"
          distance={6}
          decay={2}
        />
      ))}
    </group>
  );
});
FlashEffect.displayName = "FlashEffect";
