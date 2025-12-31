import React from "react";

export const Reticle: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/80 rounded-full mix-blend-difference pointer-events-none" />
  );
};
