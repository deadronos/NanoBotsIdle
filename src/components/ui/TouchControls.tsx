import React, { useEffect, useState } from "react";

const ArrowButton: React.FC<{
  rotation: number;
  code: string;
  className?: string;
}> = ({ rotation, code, className = "" }) => {
  const [active, setActive] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setActive(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setActive(false);
    window.dispatchEvent(new KeyboardEvent("keyup", { code }));
  };

  // Handle case where pointer leaves the button (e.g. sliding finger off)
  const handlePointerLeave = (e: React.PointerEvent) => {
    if (active) {
      e.preventDefault();
      setActive(false);
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    }
  };

  return (
    <button
      className={`relative w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center transition-all active:scale-95 touch-none select-none ${
        active ? "bg-white/30 scale-95" : "hover:bg-white/20"
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      data-no-orbit="true"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `rotate(${rotation}deg)` }}
        className="text-white drop-shadow-md"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
};

export const TouchControls: React.FC<{ className?: string }> = ({ className = "" }) => {
  // Prevent context menu on long press
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto z-50 md:hidden ${className}`}
    >
      <div className="flex gap-2">
        <ArrowButton rotation={0} code="KeyW" />
      </div>
      <div className="flex gap-2">
        <ArrowButton rotation={-90} code="KeyA" />
        <ArrowButton rotation={180} code="KeyS" />
        <ArrowButton rotation={90} code="KeyD" />
      </div>
    </div>
  );
};
