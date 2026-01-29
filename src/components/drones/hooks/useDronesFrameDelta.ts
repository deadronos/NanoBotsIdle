import { useEffect, useRef } from "react";

import type { DepositEvent } from "../../../shared/protocol";
import type { SimBridge } from "../../../simBridge/simBridge";

export const useDronesFrameDelta = (bridge: SimBridge) => {
  const positionsRef = useRef<Float32Array | null>(null);
  const targetsRef = useRef<Float32Array | null>(null);
  const statesRef = useRef<Uint8Array | null>(null);
  const rolesRef = useRef<Uint8Array | null>(null);
  const minedPositionsRef = useRef<Float32Array | null>(null);
  const depositEventsRef = useRef<DepositEvent[] | null>(null);

  useEffect(() => {
    return bridge.onFrame((frame) => {
      positionsRef.current = frame.delta.entities ?? null;
      targetsRef.current = frame.delta.entityTargets ?? null;
      statesRef.current = frame.delta.entityStates ?? null;
      rolesRef.current = frame.delta.entityRoles ?? null;
      minedPositionsRef.current = frame.delta.minedPositions ?? null;
      depositEventsRef.current = frame.delta.depositEvents ?? null;
    });
  }, [bridge]);

  return {
    positionsRef,
    targetsRef,
    statesRef,
    rolesRef,
    minedPositionsRef,
    depositEventsRef,
  };
};
