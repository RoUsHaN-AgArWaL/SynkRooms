import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXMark,
} from "react-icons/hi2";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastListeners: ((toast: Toast) => void)[] = [];

/** Imperatively show a toast from anywhere */
export function showToast(
  type: ToastType,
  message: string,
  duration = 4000
) {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type,
    message,
    duration,
  };
  toastListeners.forEach((fn) => fn(toast));
}

/* ─── Icons by type ────────────────────────────────────────────────────────── */

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <HiOutlineCheckCircle className="text-xl" />,
  error: <HiOutlineExclamationCircle className="text-xl" />,
  warning: <HiOutlineExclamationTriangle className="text-xl" />,
  info: <HiOutlineInformationCircle className="text-xl" />,
};

const colorMap: Record<ToastType, string> = {
  success:
    "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200",
  error:
    "border-rose-200 dark:border-rose-800/60 bg-rose-50/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200",
  warning:
    "border-amber-200 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200",
  info: "border-blue-200 dark:border-blue-800/60 bg-blue-50/90 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200",
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-emerald-500 dark:text-emerald-400",
  error: "text-rose-500 dark:text-rose-400",
  warning: "text-amber-500 dark:text-amber-400",
  info: "text-blue-500 dark:text-blue-400",
};

/* ─── Toast Container ──────────────────────────────────────────────────────── */

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev.slice(-4), toast]); // Keep max 5
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== addToast);
    };
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Single Toast Item ────────────────────────────────────────────────────── */

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-xl shadow-lg ${colorMap[toast.type]}`}
    >
      <span className={`flex-none mt-0.5 ${iconColorMap[toast.type]}`}>
        {iconMap[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={onRemove}
        className="flex-none w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <HiOutlineXMark className="text-sm" />
      </button>
    </motion.div>
  );
}
