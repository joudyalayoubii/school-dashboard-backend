"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const styles: Record<ToastType, { border: string; bg: string; text: string; icon: any }> = {
  success: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-200", icon: CheckCircle2 },
  error: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-200", icon: AlertTriangle },
  info: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-200", icon: Info },
};

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6">
        {toasts.map((toast) => {
          const style = styles[toast.type];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-4 shadow-2xl shadow-zinc-950/50 backdrop-blur animate-[toast-in_0.2s_ease-out]`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${style.text}`} />
              <p className={`flex-1 text-sm font-medium ${style.text}`}>{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
