import React, { useEffect, useState } from "react";

import { isRunning, toggle } from "../../simBridge/simControl";

export const PauseButton: React.FC = () => {
  const [running, setRunning] = useState(isRunning());

  useEffect(() => {
    const id = setInterval(() => setRunning(isRunning()), 200);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={() => {
        toggle();
        setRunning(isRunning());
      }}
      title={running ? "Pause simulation" : "Start simulation"}
      className="text-white/50 hover:text-white transition-all"
      aria-pressed={running ? "true" : "false"}
    >
      {running ?
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      : <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M5 3v18l15-9L5 3z" />
        </svg>
      }
    </button>
  );
};
