import { cn } from "../lib/utils";

type CrosshairProps = {
  locked: boolean;
};

export default function Crosshair({ locked }: CrosshairProps) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className={cn(
          "relative h-7 w-7",
          locked && "animate-[pulse_1.4s_ease-in-out_infinite]",
        )}
      >
        <span className="absolute inset-0 rounded-full border border-white/25" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
      </div>
    </div>
  );
}
