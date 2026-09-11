import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { RotateCcw, ShieldCheck, Zap } from "lucide-react";

interface ReactorCoreProps {
  coverage: number;
  configured: number;
  total: number;
  rebootPending: boolean;
  isAdmin?: boolean;
}

export default function ReactorCore({ coverage, configured, total, rebootPending, isAdmin }: ReactorCoreProps) {
  const clamped = Math.max(0, Math.min(100, coverage));

  return (
    <div className="gm-reactor-wrap gm-reactor-wrap-focused" style={{ "--reactor-progress": `${clamped * 3.6}deg` } as CSSProperties}>
      <div className="gm-reactor-hud gm-reactor-hud-top">
        <span>GM REACTOR</span>
        <span className="gm-reactor-live"><i /> LIVE</span>
      </div>

      <motion.div
        className="gm-reactor gm-reactor-focused"
        initial={{ opacity: 0, scale: 0.88, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="gm-reactor-ring gm-reactor-ring-outer" />
        <div className="gm-reactor-ring gm-reactor-ring-mid" />
        <div className="gm-reactor-orbit gm-reactor-orbit-a"><span /></div>
        <div className="gm-reactor-progress" />
        <div className="gm-reactor-core-glow" />
        <div className="gm-reactor-center">
          <Zap size={15} strokeWidth={1.8} className="gm-reactor-bolt" />
          <motion.div
            className="gm-reactor-value"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .2, duration: .42 }}
          >
            {clamped}<span>%</span>
          </motion.div>
          <div className="gm-reactor-caption">CONFIGURED</div>
        </div>
      </motion.div>

      <div className="gm-reactor-focus-status">
        <span><strong>{configured}</strong> / {total} controls active</span>
        <span className={rebootPending ? "is-warn" : "is-ok"}>
          {rebootPending ? <RotateCcw size={10} /> : <ShieldCheck size={10} />}
          {rebootPending ? "Restart pending" : isAdmin ? "Administrator" : "Standard session"}
        </span>
      </div>
    </div>
  );
}
