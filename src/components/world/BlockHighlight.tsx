import { useFrame, useThree } from "@react-three/fiber";
import React, { useRef } from "react";
import * as THREE from "three";

export const BlockHighlight: React.FC = () => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.LineSegments>(null);

  // We need to raycast against the world.
  // Since the world is procedurally generated in chunks, simple math is often faster/easier than physics raycasting if we just want "block looking at".
  // However, `getSimBridge()` doesn't expose a sync `raycast` method (it's async in worker).
  // A visual-only approach is to check intersection with the VoxelLayerMeshed if possible, but that's complex.
  //
  // Simplified approach: Raycast against an implicit ground plane or simple math for now,
  // OR better: use `raycaster` from `useThree` and intersect objects in scene.
  // But standard THREE.Raycaster needs meshes to intersect. The chunks are meshes.

  const raycaster = new THREE.Raycaster();
  raycaster.far = 10; // Max reach distance

  useFrame(() => {
    if (!meshRef.current) return;

    // Raycast from center of screen
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Find all meshes in the scene that are likely terrain chunks.
    // In VoxelLayerMeshed, chunks are added to the scene.
    // We can filter by name or parent.
    // This is expensive to do every frame if we search the whole scene.
    // But React Three Fiber scene graph is accessible.

    // const scene = camera.parent?.parent || camera.parent || null; // Heuristic to find scene root if camera is nested
    // Better: useThree().scene

    // Actually, we can just use `scene` from `useThree` in the component scope? No, `useThree` returns it.
  });

  // Re-implementation using `useThree` scene access
  return <BlockHighlightInner />;
};

const BlockHighlightInner: React.FC = () => {
  const { scene, camera } = useThree();
  const meshRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Hide by default
    meshRef.current.visible = false;

    const raycaster = new THREE.Raycaster();
    raycaster.far = 8; // 8 blocks reach
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Filter for terrain meshes.
    // Inspecting `VoxelLayerMeshed.tsx` (implied) or similar would show how chunks are named.
    // Let's assume they are meshes in the scene.
    // To optimize, we only intersect objects in the "world" group if we could find it.
    // For now, intersecting all meshes is the robust "dumb" way.

    const intersects = raycaster.intersectObjects(scene.children, true);

    // Find first non-highlight, non-player, non-drone intersection
    // We can assume terrain meshes don't have special names or we check for specific props.
    // Drones are InstancedMesh. Terrain chunks are likely Mesh.

    const hit = intersects.find(i => {
      // Filter out self (the highlight box)
      if (i.object === meshRef.current) return false;
      // Filter out helper objects (lines, etc)
      if (i.object.type === 'LineSegments' || i.object.type === 'Line') return false;
      // Filter out InstancedMesh (Drones) to prioritize blocks?
      // Actually we might want to highlight drones too, but let's stick to blocks.
      if (i.object.type === 'InstancedMesh') return false;
      // Filter out transparent/phantom objects if any
      if ((i.object as THREE.Mesh).material && ((i.object as THREE.Mesh).material as THREE.Material).transparent) {
         // Maybe ignore water? Water is transparent.
         // Let's assume opacity check or specific check.
         if (((i.object as THREE.Mesh).material as THREE.Material).opacity < 0.9) return false;
      }
      return true;
    });

    if (hit) {
      meshRef.current.visible = true;
      const x = Math.floor(hit.point.x + hit.face!.normal.x * -0.01);
      const y = Math.floor(hit.point.y + hit.face!.normal.y * -0.01);
      const z = Math.floor(hit.point.z + hit.face!.normal.z * -0.01);

      meshRef.current.position.set(x + 0.5, y + 0.5, z + 0.5);
    }
  });

  return (
    <lineSegments ref={meshRef}>
      <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
      <lineBasicMaterial color="white" opacity={0.5} transparent />
    </lineSegments>
  );
};
