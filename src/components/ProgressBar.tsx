import { motion } from "framer-motion";

interface RingSpinnerProps {
  size?: number;
  strokeWidth?: number;
}

export function RingSpinner({ size = 32, strokeWidth = 3 }: RingSpinnerProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="tech-ring-spinner inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,112,29,0.85)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          className="origin-center"
        />
      </svg>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  compact?: boolean;
}

export default function ProgressBar({ current, total, label, compact }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <RingSpinner size={16} strokeWidth={2} />
        {label && <span className="text-[9px] text-white/35">{label}</span>}
        <span className="font-mono text-[8px] text-orange-300/50">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        {label && <span className="mr-2 truncate text-[9px] text-white/42">{label}</span>}
        <span className="font-mono text-[8px] font-bold text-orange-300/48">{String(pct).padStart(3, "0")}%</span>
      </div>
      <div className="relative h-[3px] w-full overflow-hidden bg-white/[0.05]">
        <motion.div
          className="relative h-full origin-left bg-gradient-to-r from-[#ff4d00] via-[#ff7a22] to-[#ffd0aa] shadow-[0_0_12px_rgba(255,77,0,.38)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: .65, ease: [0.16, 1, 0.3, 1] }}
        >
          <i className="absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-white/55 blur-[1px]" />
        </motion.div>
      </div>
    </div>
  );
}
