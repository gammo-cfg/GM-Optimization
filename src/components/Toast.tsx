import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X, Zap } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 0;

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Zap,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(previous => previous.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts(previous => [...previous.slice(-2), { id, type, message }]);
    window.setTimeout(() => dismiss(id), 3800);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[350px] max-w-[calc(100vw-40px)] flex-col gap-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map(toast => {
            const Icon = iconMap[toast.type];
            return (
              <motion.div
                layout
                key={toast.id}
                initial={{ opacity: 0, x: 38, scale: .94, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 22, scale: .97 }}
                transition={{ duration: .3, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto relative overflow-hidden border border-orange-400/15 bg-[#090a0d]/95 px-3.5 py-3.5 shadow-[0_18px_55px_rgba(0,0,0,.48),0_0_30px_rgba(255,78,0,.05)] backdrop-blur-xl [clip-path:polygon(0_0,calc(100%_-_9px)_0,100%_9px,100%_100%,9px_100%,0_calc(100%_-_9px))]"
              >
                <motion.i className="absolute left-0 top-0 h-px w-20 bg-gradient-to-r from-orange-400 to-transparent" initial={{ x: -80 }} animate={{ x: 350 }} transition={{ duration: 1.1, ease: "easeOut" }} />
                <div className="flex items-start gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center border [clip-path:polygon(22%_0,78%_0,100%_22%,100%_78%,78%_100%,22%_100%,0_78%,0_22%)] ${toast.type === "success" ? "border-emerald-300/14 bg-emerald-300/[0.035] text-emerald-300/65" : toast.type === "error" ? "border-red-300/15 bg-red-300/[0.04] text-red-300/65" : "border-orange-400/15 bg-orange-400/[0.04] text-orange-300/70"}`}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[6.5px] font-bold tracking-[0.16em] text-orange-300/32">GM EVENT</div>
                    <div className="mt-1.5 text-[9.5px] leading-4 text-white/58">{toast.message}</div>
                  </div>
                  <button onClick={() => dismiss(toast.id)} className="grid h-6 w-6 shrink-0 place-items-center border border-transparent text-white/18 hover:border-orange-400/10 hover:bg-orange-400/[0.035] hover:text-orange-300/60"><X size={11} /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be inside ToastProvider");
  return context;
}
