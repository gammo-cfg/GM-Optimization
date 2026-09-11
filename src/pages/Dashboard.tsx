import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowUpRight,
  Cpu,
  Gauge,
  HardDrive,
  HardDriveDownload,
  MemoryStick,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import ReactorCore from "../components/ReactorCore";
import { tweaks } from "../data/tweaks";

interface DriveSummary { letter: string; size: string; }
interface InitResult {
  cpu_name: string;
  gpu_name: string;
  ram_total: string;
  drives: DriveSummary[];
  is_admin: boolean;
}
interface ScanEntry { id: number; module: string; scanned_at: string; total_size: number; item_count: number; result_json?: string; }
interface TweakState { key: string; enabled: boolean; requires_reboot: boolean; updated_at: string; }

const page = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: .055 } } } as const;
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: .36, ease: [0.16, 1, 0.3, 1] } } } as const;

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}

function HardwareMetric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="gm-hardware-metric min-w-0">
      <span className="gm-hardware-metric-icon"><Icon size={14} strokeWidth={1.75} /></span>
      <div className="min-w-0">
        <div className="gm-hardware-metric-label">{label}</div>
        <div className="gm-hardware-metric-value" title={value}>{value}</div>
      </div>
    </div>
  );
}

function ActionModule({ to, icon: Icon, title, detail }: { to: string; icon: typeof Sparkles; title: string; detail: string }) {
  return (
    <Link to={to} className="group block min-w-0">
      <div className="gm-focus-action h-full">
        <span className="gm-focus-action-icon"><Icon size={16} strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <div className="gm-focus-action-title">{title}</div>
          <div className="gm-focus-action-detail">{detail}</div>
        </div>
        <ArrowUpRight size={12} className="gm-focus-action-arrow" />
      </div>
    </Link>
  );
}

export default function Dashboard({ initData }: { initData?: InitResult | null }) {
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [states, setStates] = useState<TweakState[]>([]);

  useEffect(() => {
    Promise.allSettled([
      invoke<ScanEntry[]>("get_scan_history", { limit: 8 }).then(setHistory),
      invoke<TweakState[]>("get_tweak_states").then(setStates),
    ]);
  }, []);

  const configured = useMemo(() => {
    const tweakIds = new Set(tweaks.map(tweak => tweak.id));
    return states.filter(state => state.enabled && tweakIds.has(state.key)).length;
  }, [states]);

  const coverage = tweaks.length ? Math.round((configured / tweaks.length) * 100) : 0;
  const rebootPending = states.some(state => state.enabled && state.requires_reboot);
  const drivesText = initData?.drives.length ? initData.drives.map(d => `${d.letter} ${d.size}`).join(" · ") : "No fixed drives reported";

  return (
    <motion.div variants={page} initial="hidden" animate="show" className="mx-auto w-full max-w-[1220px] pb-10">
      <motion.section variants={item} className="gm-panel-strong gm-dashboard-hero mb-4 overflow-hidden">
        <div className="grid min-h-[338px] lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative flex flex-col justify-center border-b border-orange-300/[0.06] px-6 py-7 lg:border-b-0 lg:border-r lg:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_48%,rgba(255,90,0,.035),transparent_42%)]" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <span className="gm-pill !border-orange-400/18 !text-orange-200/50"><Zap size={9} /> GM CORE</span>
                <span className={`gm-session-state ${initData?.is_admin ? "gm-session-state-ok" : "gm-session-state-warn"}`}>
                  {initData?.is_admin ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                  {initData?.is_admin ? "Administrator" : "Standard session"}
                </span>
                {rebootPending && <span className="gm-session-state gm-session-state-warn"><RotateCcw size={9} /> Restart pending</span>}
              </div>

              <div className="gm-section-label">Command deck</div>
              <h1 className="mt-3 max-w-[600px] text-[35px] font-black leading-[.98] tracking-[-0.055em] text-white/95 lg:text-[41px]">
                CONTROL THE MACHINE.<br />
                <span className="bg-gradient-to-r from-[#ff5a00] via-[#ff934e] to-[#ffd0a6] bg-clip-text text-transparent">FEEL EVERY CHANGE.</span>
              </h1>
              <p className="mt-4 max-w-[540px] text-[10px] leading-[1.7] text-white/28">
                One focused workflow: inspect the PC, apply reviewed changes, measure the result, and keep a path back.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link to="/wizard" className="gm-button-primary"><Sparkles size={13} /> START GUIDED SEQUENCE</Link>
                <Link to="/restore" className="gm-button-secondary"><RotateCcw size={12} /> Recovery</Link>
              </div>
            </div>
          </div>

          <ReactorCore
            coverage={coverage}
            configured={configured}
            total={tweaks.length}
            rebootPending={rebootPending}
            isAdmin={initData?.is_admin}
          />
        </div>
      </motion.section>

      {!initData?.is_admin && (
        <motion.div variants={item} className="gm-focus-alert mb-4">
          <ShieldAlert size={14} />
          <div><strong>Some controls need administrator access.</strong><span> Inspection and user-level tools still work normally.</span></div>
        </motion.div>
      )}

      <motion.section variants={item} className="gm-panel gm-hardware-strip mb-4">
        <HardwareMetric icon={Cpu} label="Processor" value={initData?.cpu_name || "Detecting…"} />
        <HardwareMetric icon={Gauge} label="Graphics" value={initData?.gpu_name || "Detecting…"} />
        <HardwareMetric icon={MemoryStick} label="Memory" value={initData?.ram_total || "Detecting…"} />
        <HardwareMetric icon={HardDrive} label="Storage" value={drivesText} />
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <motion.section variants={item} className="gm-panel p-5">
          <div className="mb-4">
            <div className="gm-section-label">Next action</div>
            <div className="mt-2 text-[12px] font-bold text-white/70">Choose one job and stay focused</div>
          </div>
          <div className="grid gap-2.5">
            <ActionModule to="/wizard" icon={Sparkles} title="Guided optimization" detail="Build and review a workload-based plan before applying anything." />
            <ActionModule to="/junk-cleaner" icon={HardDriveDownload} title="Storage cleanup" detail="Scan first, review the result, then reclaim only selected data." />
            <ActionModule to="/benchmark" icon={Gauge} title="Performance lab" detail="Capture a baseline and compare results after changes." />
          </div>
        </motion.section>

        <motion.section variants={item} className="gm-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-orange-300/[0.06] px-5 py-4">
            <div>
              <div className="gm-section-label">Recent activity</div>
              <div className="mt-2 text-[11px] font-bold text-white/62">Latest system events</div>
            </div>
            <Activity size={14} className="text-orange-300/38" />
          </div>

          {history.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Activity size={18} className="mx-auto mb-3 text-white/13" />
              <div className="text-[9.5px] font-semibold text-white/27">NO RECENT ACTIVITY</div>
              <div className="mt-1.5 text-[8px] text-white/14">Completed GM operations will appear here.</div>
            </div>
          ) : (
            <div>
              {history.slice(0, 4).map(entry => (
                <div key={entry.id} className="gm-activity-row">
                  <span className="gm-activity-dot" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[9.5px] font-semibold capitalize text-white/48">{entry.module.replace(/_/g, " ")}</div>
                    <div className="mt-1 font-mono text-[6.5px] text-white/14">{entry.item_count ? `${entry.item_count} ITEMS` : "COMPLETED"}{entry.total_size ? ` / ${formatBytes(entry.total_size)}` : ""}</div>
                  </div>
                  <span className="font-mono text-[6.5px] text-white/13">{new Date(entry.scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
