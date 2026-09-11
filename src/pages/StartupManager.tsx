import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Play, Power, Search, X } from "lucide-react";
import { useToast } from "../components/Toast";

interface StartupItem {
  id: string;
  name: string;
  command: string;
  location: string;
  enabled: boolean;
}

export default function StartupManager() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [confirmDisableAll, setConfirmDisableAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    invoke<StartupItem[]>("get_startup_items")
      .then(setItems)
      .catch(() => toast("error", "Failed to scan startup items"))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = items.filter(item => {
    const needle = search.trim().toLowerCase();
    return !needle || item.name.toLowerCase().includes(needle) || item.command.toLowerCase().includes(needle);
  });

  const toggle = async (item: StartupItem) => {
    setToggling(previous => new Set(previous).add(item.id));
    const enabled = !item.enabled;
    setItems(previous => previous.map(candidate => candidate.id === item.id ? { ...candidate, enabled } : candidate));
    try {
      await invoke("toggle_startup_item", { id: item.id, enabled });
      toast("success", enabled ? `${item.name} enabled` : `${item.name} disabled`);
    } catch {
      setItems(previous => previous.map(candidate => candidate.id === item.id ? { ...candidate, enabled: !enabled } : candidate));
      toast("error", `Failed to update ${item.name}`);
    } finally {
      setToggling(previous => { const next = new Set(previous); next.delete(item.id); return next; });
    }
  };

  const disableAll = async () => {
    setConfirmDisableAll(false);
    const enabledItems = items.filter(item => item.enabled);
    for (const item of enabledItems) await toggle(item);
  };

  const enabledCount = items.filter(item => item.enabled).length;

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="gm-section-label">Boot</div>
          <h1 className="gm-page-title mt-1.5">Startup Manager</h1>
          <p className="gm-page-subtitle">Inspect and control programs registered to launch with Windows.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="gm-pill">{enabledCount} enabled · {items.length} total</span>
          <button disabled={enabledCount === 0 || loading} onClick={() => setConfirmDisableAll(true)} className="gm-button-secondary"><Power size={12} />Disable enabled</button>
        </div>
      </div>

      <div className="gm-panel mb-4 flex items-center gap-2 p-2">
        <Search size={13} className="ml-2 text-white/22" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or command…" className="h-8 min-w-0 flex-1 bg-transparent text-[10px] text-white/58 outline-none placeholder:text-white/16" />
        <span className="gm-kbd">{filtered.length}</span>
      </div>

      <section className="gm-panel overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{[1,2,3,4,5].map(index => <div key={index} className="h-11 animate-pulse rounded-lg bg-white/[0.025]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center"><Play size={24} className="mx-auto mb-2 text-white/10" /><div className="text-[10px] text-white/22">{search ? "No startup items match your search." : "No startup programs found."}</div></div>
        ) : (
          <>
            <div className="grid grid-cols-[1.1fr_1.6fr_.8fr_86px] gap-3 border-b border-white/[0.05] px-4 py-3 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/16">
              <span>Name</span><span>Command</span><span>Source</span><span className="text-center">State</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {filtered.map(item => (
                <div key={item.id} className={`grid grid-cols-[1.1fr_1.6fr_.8fr_86px] items-center gap-3 px-4 py-3 transition-colors ${item.enabled ? "hover:bg-white/[0.012]" : "opacity-48"}`}>
                  <div className="min-w-0 truncate text-[10px] font-semibold text-white/51">{item.name}</div>
                  <div className="min-w-0 truncate font-mono text-[8.5px] text-white/22" title={item.command}>{item.command}</div>
                  <div className="truncate text-[8.5px] text-white/18">{item.location}</div>
                  <div className="flex justify-center">
                    <button onClick={() => void toggle(item)} disabled={toggling.has(item.id)} className={`gm-switch ${item.enabled ? "gm-switch-on" : ""}`} aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.name}`}>
                      <span />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {confirmDisableAll && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setConfirmDisableAll(false)}>
            <motion.div className="gm-panel-strong w-full max-w-[420px] p-5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onMouseDown={event => event.stopPropagation()}>
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-300/12 bg-amber-300/[0.035] text-amber-100/48"><AlertTriangle size={16} /></span>
                <button onClick={() => setConfirmDisableAll(false)} className="text-white/20 hover:text-white/55"><X size={15} /></button>
              </div>
              <h2 className="mt-4 text-[13px] font-semibold text-white/72">Disable all enabled startup entries?</h2>
              <p className="mt-2 text-[9.5px] leading-4 text-white/25">This affects {enabledCount} entries. Some applications rely on startup registration for background sync, device utilities, or update services. You can re-enable individual entries later.</p>
              <div className="mt-5 flex gap-2"><button onClick={() => setConfirmDisableAll(false)} className="gm-button-secondary flex-1">Cancel</button><button onClick={() => void disableAll()} className="gm-button-danger flex-1">Disable enabled</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
