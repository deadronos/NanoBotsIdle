import React, { useEffect } from "react";

type ModalShellProps = {
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
};

export const ModalShell: React.FC<ModalShellProps> = ({
  onClose,
  children,
  overlayClassName,
  contentClassName,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={
        overlayClassName ??
        "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-auto relative"
      }
    >
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={
          contentClassName ??
          "bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative cursor-default z-10"
        }
      >
        {children}
      </div>
    </div>
  );
};
