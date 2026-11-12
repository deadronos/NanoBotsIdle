import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { InstancedMesh, Vector3 } from "three";
import { AdditiveBlending, Color, DynamicDrawUsage, Object3D } from "three";

const CAPACITY = 10;
const DURATION = 0.22;
const WHITE = new Color(1, 1, 1);
// Peak flash brightness; values above 1 feed the bloom pass.
const INTENSITY = 3;

export interface FlashHandle {
  trigger: (pos: Vector3, color: Color) => void;
}

export const FlashEffect = forwardRef<FlashHandle>((_, ref) => {
  const meshRef = useRef<InstancedMesh>(null);
  const [slots] = useState(() =>
    Array.from({ length: CAPACITY }, () => ({
      age: DURATION,
      transform: new Object3D(),
      color: new Color(),
    })),
  );
  const cursor = useRef(0);
  const [flashColor] = useState(() => new Color());

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.setColorAt(0, flashColor);
    mesh.instanceColor?.setUsage(DynamicDrawUsage);
  }, [flashColor]);

  useImperativeHandle(
    ref,
    () => ({
      trigger(pos, color) {
        const slot = slots[cursor.current];
        cursor.current = (cursor.current + 1) % CAPACITY;
        slot.age = 0;
        slot.transform.position.copy(pos);
        slot.color.copy(color);
      },
    }),
    [slots],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let count = 0;
    for (const slot of slots) {
      if (slot.age >= DURATION) continue;
      const fade = 1 - slot.age / DURATION;
      slot.age += delta;
      slot.transform.scale.setScalar(0.55 + (1 - fade) * 0.65);
      slot.transform.updateMatrix();
      mesh.setMatrixAt(count, slot.transform.matrix);
      mesh.setColorAt(
        count,
        flashColor
          .copy(slot.color)
          .lerp(WHITE, 0.65)
          .multiplyScalar(INTENSITY * fade ** 2),
      );
      count++;
    }
    mesh.count = count;
    mesh.visible = count > 0;
    if (count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CAPACITY]}
      frustumCulled={false}
      visible={false}
    >
      <icosahedronGeometry args={[0.75, 0]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
        toneMapped={false}
      />
    </instancedMesh>
  );
});
FlashEffect.displayName = "FlashEffect";
