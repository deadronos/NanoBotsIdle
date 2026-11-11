import { useLoader } from "@react-three/fiber";
import { useEffect } from "react";
import { type BufferGeometry, LoadingManager, type Material, type Mesh } from "three";
import dracoJsUrl from "three/addons/libs/draco/gltf/draco_decoder.js?url&no-inline";
import dracoWasmUrl from "three/addons/libs/draco/gltf/draco_decoder.wasm?url&no-inline";
import dracoWrapperUrl from "three/addons/libs/draco/gltf/draco_wasm_wrapper.js?url&no-inline";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const decoderAssets: Record<string, string> = {
  "draco_decoder.js": dracoJsUrl,
  "draco_decoder.wasm": dracoWasmUrl,
  "draco_wasm_wrapper.js": dracoWrapperUrl,
};
const decoder = new DRACOLoader(
  new LoadingManager().setURLModifier((url) => decoderAssets[url] ?? url),
);

export type DroneMeshLoaderProps = {
  path: string;
  onLoad: (geo: BufferGeometry, mat: Material) => void;
};

// Component that suspends while loading the GLB
export const DroneMeshLoader = ({ path, onLoad }: DroneMeshLoaderProps) => {
  const { scene } = useLoader(GLTFLoader, path, (loader) => loader.setDRACOLoader(decoder));

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
