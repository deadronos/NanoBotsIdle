import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { FC } from "react";
import { computeNextDpr, initDpr, MAX_DPR } from "../utils/dynamicResScaler";

const CHECK_INTERVAL = 500; // ms

export const DynamicResScaler: FC = () => {
  const setDpr = useThree((state) => state.setDpr);
  const frameCount = useRef(0);
  const lastTime = useRef(0);
  const dprRef = useRef(MAX_DPR);

  useEffect(() => {
    // initialize timing reference and DPR once on mount
    lastTime.current = performance.now();
    initDpr(setDpr, dprRef.current);
  }, [setDpr]);

  useFrame(() => {
    frameCount.current += 1;
    const time = performance.now();
    const elapsed = time - lastTime.current;

    if (elapsed >= CHECK_INTERVAL) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      frameCount.current = 0;
      lastTime.current = time;

      const nextDpr = computeNextDpr(fps, dprRef.current);

      if (nextDpr !== dprRef.current) {
        dprRef.current = nextDpr;
        setDpr(nextDpr);
        if (process.env.NODE_ENV === "development") {
          console.debug(`[DynamicResScaler] FPS: ${fps}, DPR: ${nextDpr.toFixed(2)}`);
        }
      }
    }
  });

  // This component does not render any DOM; it only side-effects via hooks
  return null;
};
