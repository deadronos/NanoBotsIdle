import { useEffect, useRef } from "react";
import type { WebGLRenderer } from "three";

import type { OcclusionConfig, OcclusionCuller } from "../../../render/occlusionCuller";
import { createOcclusionCuller } from "../../../render/occlusionCuller";

export const useOcclusionCuller = (gl: WebGLRenderer, config: OcclusionConfig) => {
  const occlusionRef = useRef<OcclusionCuller | null>(null);

  useEffect(() => {
    const culler = createOcclusionCuller(gl, config);
    occlusionRef.current = culler;

    return () => {
      culler.dispose();
      occlusionRef.current = null;
    };
  }, [gl, config]);

  return occlusionRef;
};
