import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu, ShieldCheck, Zap } from "lucide-react";

const bootLines = ["LINKING LOCAL ENGINE", "READING WINDOWS STATE", "SYNCHRONIZING CONTROL NODES"];

export default function SplashScreen({ loading }: { loading: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => setShow(false), 560);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="gm-splash fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.015, filter: "blur(5px)" }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="gm-splash-grid" />
          <div className="gm-splash-scan" />
          <div className="gm-splash-corner gm-splash-corner-a" />
          <div className="gm-splash-corner gm-splash-corner-b" />

          <div className="relative z-10 grid w-[720px] max-w-[88vw] grid-cols-[270px_1fr] items-center gap-12">
            <motion.div
              className="gm-boot-reactor"
              initial={{ opacity: 0, scale: .62, rotate: -28 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: .9, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="gm-boot-ring gm-boot-ring-1" />
              <div className="gm-boot-ring gm-boot-ring-2" />
              <div className="gm-boot-ring gm-boot-ring-3" />
              <div className="gm-boot-orbit gm-boot-orbit-a"><i /></div>
              <div className="gm-boot-orbit gm-boot-orbit-b"><i /></div>
              <div className="gm-boot-core"><Zap size={27} /></div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: .12, duration: .55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-2 flex items-center gap-2 text-[8px] font-bold tracking-[0.26em] text-orange-300/55">
                <span className="h-px w-8 bg-orange-400/50" /> GM NEON CORE
              </div>
              <h1 className="text-[28px] font-black tracking-[-0.055em] text-white/94">GM-OPTIMIZATION</h1>
              <p className="mt-1 text-[9px] tracking-[0.15em] text-white/24">PERFORMANCE CONTROL / REACTOR BUILD 04</p>

              <div className="mt-7 space-y-2.5">
                {bootLines.map((line, index) => (
                  <motion.div
                    key={line}
                    className="gm-boot-line"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: .28 + index * .12, duration: .35 }}
                  >
                    <span className="gm-boot-line-index">0{index + 1}</span>
                    <span className="flex-1">{line}</span>
                    <span className="gm-boot-ok">{loading && index === 2 ? "SYNC" : "OK"}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[8px] font-mono">
                  <span className="text-white/28">{loading ? "INITIALIZING SYSTEM MATRIX" : "CORE READY"}</span>
                  <span className="flex items-center gap-1.5 text-orange-300/50">{loading ? <Cpu size={10} /> : <ShieldCheck size={10} />}{loading ? "BOOT" : "ONLINE"}</span>
                </div>
                <div className="gm-boot-progress">
                  <motion.div
                    className="gm-boot-progress-live"
                    initial={{ scaleX: .04 }}
                    animate={{ scaleX: loading ? .82 : 1 }}
                    transition={{ duration: loading ? 1.25 : .3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
