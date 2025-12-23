import { cn } from "../lib/utils";

type CrosshairProps = {
  locked: boolean;
  miningProgress?: number;
};

export default function Crosshair({ locked, miningProgress = 0 }: CrosshairProps) {
  const clamped = Math.max(0, Math.min(1, miningProgress));
  const showRing = clamped > 0;
  const radius = 18;
  const circumference = Math.PI * 2 * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className={cn(
          "relative h-7 w-7",
          locked && "animate-[pulse_1.4s_ease-in-out_infinite]",
        )}
      >
        {showRing && (
          <svg
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="3"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 24 24)"
            />
          </svg>
        )}
        <span className="absolute inset-0 rounded-full border border-white/25" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
      </div>
    </div>
  );
}
