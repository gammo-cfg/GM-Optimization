import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gauge,
  HardDriveDownload,
  Info,
  LayoutDashboard,
  Play,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserRoundCog,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import DockSidebar from "./DockSidebar";
import EnergyField from "./EnergyField";
import WindowChrome from "./WindowChrome";

interface Command {
  path: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

const commands: Command[] = [
  { path: "/", label: "Dashboard", detail: "System core and recent activity", icon: LayoutDashboard },
  { path: "/wizard", label: "Guided Optimize", detail: "Launch a reviewed optimization sequence", icon: Sparkles },
  { path: "/tweaks", label: "Tweaks Hub", detail: "Advanced Windows control matrix", icon: Zap },
  { path: "/customize", label: "Windows Controls", detail: "Tune Windows behavior", icon: SlidersHorizontal },
  { path: "/profiles", label: "Profiles", detail: "Store and restore performance states", icon: UserRoundCog },
  { path: "/junk-cleaner", label: "Storage Cleaner", detail: "Inspect and reclaim storage", icon: HardDriveDownload },
  { path: "/startup", label: "Startup Manager", detail: "Control boot-time applications", icon: Play },
  { path: "/benchmark", label: "Performance Lab", detail: "Measure CPU, disk and latency", icon: Gauge },
  { path: "/restore", label: "Recovery", detail: "Restore points and rollback tools", icon: RotateCcw },
  { path: "/about", label: "System Info", detail: "Hardware and Windows telemetry", icon: Info },
  { path: "/settings", label: "Settings", detail: "Automation and GM preferences", icon: Settings },
];

const routeMeta = new Map(commands.map(command => [command.path, command]));

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeMeta = routeMeta.get(location.pathname) ?? commands[0];
  const ActiveIcon = activeMeta.icon;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(command => `${command.label} ${command.detail}`.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) {
      setQuery("");
      return;
    }
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timeout);
  }, [paletteOpen]);

  const go = (path: string) => {
    navigate(path);
    setPaletteOpen(false);
  };

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <EnergyField />
      <WindowChrome />

      <div className="relative z-10 flex min-h-0 flex-1">
        <DockSidebar />
        <div className="min-w-0 flex flex-1 flex-col">
        <header className="gm-topbar gm-topbar-focused">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="gm-route-orb"><ActiveIcon size={14} strokeWidth={1.8} /></div>
            <div className="min-w-0">
              <div className="gm-topbar-eyebrow">{activeMeta.label}</div>
              <div className="gm-topbar-title">{activeMeta.detail}</div>
            </div>
          </div>

          <button className="gm-command-trigger" type="button" onClick={() => setPaletteOpen(true)}>
            <Search size={13} />
            <span>Command</span>
            <span className="gm-kbd">CTRL K</span>
          </button>
        </header>

        <main className="gm-content flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="gm-page-stage"
              initial={{ opacity: 0, y: 12, scale: 0.992, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, scale: 0.995, filter: "blur(3px)" }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="gm-page-scan" />
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        </div>
      </div>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            className="gm-command-overlay fixed inset-0 z-[90] flex items-start justify-center px-6 pt-[11vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={() => setPaletteOpen(false)}
          >
            <motion.div
              className="command-palette w-full max-w-[640px] overflow-hidden"
              initial={{ opacity: 0, y: -18, scale: 0.965, rotateX: -6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.975 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onMouseDown={event => event.stopPropagation()}
            >
              <div className="gm-command-head">
                <div className="gm-command-reactor"><Zap size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[8px] font-bold tracking-[0.22em] text-orange-300/55">GM COMMAND MATRIX</div>
                  <div className="mt-0.5 text-[9px] text-white/20">Jump anywhere without breaking flow</div>
                </div>
                <button onClick={() => setPaletteOpen(false)} className="gm-command-close"><X size={14} /></button>
              </div>
              <div className="flex items-center gap-3 border-y border-orange-300/[0.09] bg-black/20 px-4">
                <Search size={15} className="text-orange-300/55" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && filtered[0]) go(filtered[0].path);
                  }}
                  placeholder="Type a module, action, or tool…"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[12px] text-white/82 outline-none placeholder:text-white/20"
                />
                <span className="gm-kbd">ENTER</span>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-2.5">
                {filtered.length ? filtered.map((command, index) => {
                  const Icon = command.icon;
                  return (
                    <motion.button
                      key={command.path}
                      onClick={() => go(command.path)}
                      className="gm-command-row"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * .025, .15) }}
                    >
                      <span className="gm-command-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="gm-command-icon"><Icon size={14} /></span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-[10.5px] font-semibold text-white/72">{command.label}</span>
                        <span className="mt-0.5 block truncate text-[8.5px] text-white/24">{command.detail}</span>
                      </span>
                      <span className="gm-command-arrow">→</span>
                    </motion.button>
                  );
                }) : (
                  <div className="px-4 py-12 text-center text-[10px] text-white/24">No matching GM module.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
