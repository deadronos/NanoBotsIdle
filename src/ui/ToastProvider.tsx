import React, { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: string; message: string; type?: "info" | "success" | "warn" | "error" };

const ToastContext = createContext<{
  push: (msg: string, type?: Toast["type"]) => void;
} | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
    const item: Toast = { id, message, type };
    setToasts((t) => [...t, item]);
    // auto-dismiss
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md px-3 py-2 text-sm font-medium shadow-lg text-slate-900 ${
              t.type === "success"
                ? "bg-emerald-400"
                : t.type === "error"
                ? "bg-rose-400"
                : t.type === "warn"
                ? "bg-amber-300"
                : "bg-slate-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
