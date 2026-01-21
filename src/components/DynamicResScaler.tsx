import { useFrame, useThree } from "@react-three/fiber";
import type { FC } from "react";
import { useEffect, useRef } from "react";

import { useConfig } from "../config/useConfig";
import { getTelemetryCollector } from "../telemetry";
import { computeNextDpr, initDpr, MAX_DPR } from "../utils/dynamicResScaler";
import { debug } from "../utils/logger";

const CHECK_INTERVAL = 500; // ms

export const DynamicResScaler: FC = () => {
  const { setDpr, gl } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(0);
  const dprRef = useRef(MAX_DPR);
  const config = useConfig();
  const telemetry = getTelemetryCollector();

  useEffect(() => {
    // initialize timing reference and DPR once on mount
    lastTime.current = performance.now();
    initDpr(setDpr, dprRef.current);

    // Update telemetry enabled state based on config
    telemetry.setEnabled(config.telemetry.enabled);
  }, [setDpr, config.telemetry.enabled, telemetry]);

  useFrame(() => {
    frameCount.current += 1;
    const time = performance.now();
    const elapsed = time - lastTime.current;

    if (elapsed >= CHECK_INTERVAL) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      const frameTime = elapsed / frameCount.current;

      frameCount.current = 0;
      lastTime.current = time;

      // Record telemetry if enabled
      if (config.telemetry.enabled) {
        telemetry.recordFps(fps);
        telemetry.recordFrameTime(frameTime);
        telemetry.recordDrawCalls(gl.info.render.calls);
      }

      const nextDpr = computeNextDpr(fps, dprRef.current);

      if (nextDpr !== dprRef.current) {
        dprRef.current = nextDpr;
        setDpr(nextDpr);

        // Record DPR change in telemetry
        if (config.telemetry.enabled) {
          telemetry.recordDprChange(nextDpr);
        }

        debug(`[DynamicResScaler] FPS: ${fps}, DPR: ${nextDpr.toFixed(2)}`);
      }
    }
  });

  // This component does not render any DOM; it only side-effects via hooks
  return null;
};
