import { useGameStore } from "../../../state/store";

export const HeatOverlay = () => {
  const heatRatio = useGameStore((state) => state.uiSnapshot.heatRatio);

  const intensity = Math.min(1, Math.max(0, heatRatio));

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          intensity > 0
            ? `radial-gradient(circle at center, rgba(248, 113, 113, ${0.35 * intensity}) 0%, transparent 70%)`
            : "transparent",
      }}
    />
  );
};
