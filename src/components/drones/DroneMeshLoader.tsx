import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import type { BufferGeometry, Material, Mesh } from "three";

export type DroneMeshLoaderProps = {
  path: string;
  onLoad: (geo: BufferGeometry, mat: Material) => void;
};

// Component that suspends while loading the GLB
export const DroneMeshLoader = ({ path, onLoad }: DroneMeshLoaderProps) => {
  const { scene } = useGLTF(path);

  useEffect(() => {
    let foundGeo: BufferGeometry | null = null;
    let foundMat: Material | null = null;

    scene.traverse((child) => {
      if ((child as Mesh).isMesh && !foundGeo) {
        const mesh = child as Mesh;
        foundGeo = mesh.geometry;
        foundMat = mesh.material as Material;
      }
    });

    if (foundGeo && foundMat) {
      onLoad(foundGeo, foundMat);
    }
  }, [scene, onLoad]);

  return null;
};
