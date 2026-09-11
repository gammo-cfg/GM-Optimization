import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertTriangle, Check, CheckCircle2, ChevronRight, Filter, RotateCcw,
  Search, ShieldAlert, Sparkles, Undo2, X, Zap,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { categories, presets, tweaks, type Preset, type TweakDefinition } from "../data/tweaks";

interface TweakState { key: string; enabled: boolean; requires_reboot: boolean; updated_at: string; }
interface CompletionResult { total: number; success: number; fail: number; errors: string[]; requiresReboot: boolean; }
type Risk = "standard" | "elevated" | "advanced";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.045 } } } as const;
const child = { hidden: { opacity: 0, y: 9 }, show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" } } } as const;

function riskFor(tweak: TweakDefinition): Risk {
  const code = [...(tweak.enableScript ?? []), ...(tweak.commands ?? [])].join(" ");
  if (tweak.requiresConfirmation || /Remove-AppxPackage|Disable-BitLocker|Remove-Windows|uninstall|Disable-WindowsOptionalFeature/i.test(code)) return "advanced";
  if (tweak.services?.length || tweak.registry?.some(entry => entry.path.startsWith("HKLM")) || /Set-Service|Program Files|System32/i.test(code)) return "elevated";
  return "standard";
}

function canRevert(tweak: TweakDefinition) {
  if (tweak.commands?.length || tweak.services?.length) return false;
  const hasMutation = Boolean(tweak.registry?.length || tweak.enableScript?.length);
  const scriptsReversible = !tweak.enableScript?.length || Boolean(tweak.disableScript?.length);
  return hasMutation && scriptsReversible;
}

function RiskBadge({ risk }: { risk: Risk }) {
  if (risk === "standard") return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${risk === "advanced" ? "border-red-300/12 bg-red-300/[0.04] text-red-200/45" : "border-amber-300/12 bg-amber-300/[0.04] text-amber-100/42"}`}>
      <ShieldAlert size={8} />{risk}
    </span>
  );
}

export default function TweaksHub() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | Risk>("all");
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    invoke<TweakState[]>("get_tweak_states")
      .then(states => setApplied(new Set(states.filter(state => state.enabled).map(state => state.key))))
      .catch(() => {});
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const visibleByCategory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.map(category => ({
      category,
      items: tweaks.filter(tweak => tweak.category === category)
        .filter(tweak => riskFilter === "all" || riskFor(tweak) === riskFilter)
        .filter(tweak => !needle || `${tweak.title} ${tweak.description} ${tweak.category}`.toLowerCase().includes(needle)),
    })).filter(group => group.items.length > 0);
  }, [query, riskFilter]);

  const toggleCheck = (id: string) => {
    setSelected(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setActivePreset(null);
  };

  const applyPreset = (preset: Preset) => {
    setSelected(new Set(preset.tweaks));
    setActivePreset(preset.id);
  };

  const executeTweak = async (tweak: TweakDefinition, enabled: boolean) => {
    if (tweak.registry?.length) await invoke<string>("apply_registry_tweak", { entries: tweak.registry, enabled });
    if (tweak.enableScript && tweak.disableScript) {
      await invoke<string>("execute_powershell_tweak", { enabled, enableScript: tweak.enableScript, disableScript: tweak.disableScript });
    }
    if (enabled && tweak.commands?.length) await invoke<string>("execute_native_commands", { commands: tweak.commands });
    if (enabled && tweak.services?.length) await invoke<string>("configure_services", { entries: tweak.services });
    await invoke("set_tweak_state", { key: tweak.id, enabled, requiresReboot: Boolean(tweak.requiresReboot) });
  };

  const executeBatch = async (ids: string[]) => {
    setConfirmIds(null);
    setRunning(true);
    setResult(null);
    let success = 0; let fail = 0; let needsReboot = false;
    const errors: string[] = [];

    for (const id of ids) {
      const tweak = tweaks.find(item => item.id === id);
      if (!tweak) continue;
      setApplying(previous => new Set(previous).add(id));
      try {
        await executeTweak(tweak, true);
        success += 1;
        needsReboot ||= Boolean(tweak.requiresReboot);
        setApplied(previous => new Set(previous).add(id));
      } catch (error) {
        fail += 1;
        errors.push(`${tweak.title}: ${String(error)}`);
      } finally {
        setApplying(previous => { const next = new Set(previous); next.delete(id); return next; });
      }
    }
    setRunning(false);
    setResult({ total: ids.length, success, fail, errors, requiresReboot: needsReboot });
    if (fail) toast("error", `${success}/${ids.length} changes completed — ${fail} failed`);
    else toast("success", `${success} changes applied and tracked`);
  };

  const runSelected = () => {
    const ids = [...selected];
    if (!ids.length) return toast("info", "Select at least one tweak");
    const advanced = ids.filter(id => { const tweak = tweaks.find(item => item.id === id); return tweak && riskFor(tweak) === "advanced"; });
    if (advanced.length) setConfirmIds(ids);
    else void executeBatch(ids);
  };

  const revertOne = async (tweak: TweakDefinition) => {
    if (!canRevert(tweak) || running) return;
    setApplying(previous => new Set(previous).add(tweak.id));
    try {
      await executeTweak(tweak, false);
      setApplied(previous => { const next = new Set(previous); next.delete(tweak.id); return next; });
      toast("success", `${tweak.title} restored`);
    } catch (error) {
      toast("error", `Could not restore ${tweak.title}: ${String(error)}`);
    } finally {
      setApplying(previous => { const next = new Set(previous); next.delete(tweak.id); return next; });
    }
  };

  const startRestart = () => {
    setResult(null);
    setRestartCountdown(30);
    countdownRef.current = setInterval(() => {
      setRestartCountdown(value => {
        if (value === null || value <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          void invoke("shutdown_system");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const cancelRestart = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setRestartCountdown(null);
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-[1040px] pb-10">
        <motion.div variants={child} className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="gm-page-title">Tweaks Hub</h1><p className="gm-page-subtitle">Curated controls, real applied-state tracking, and safer rollback for registry changes.</p></div>
          <div className="flex items-center gap-2"><span className="gm-pill"><CheckCircle2 size={9} />{applied.size} tracked as applied</span><span className="gm-pill"><Zap size={9} />{tweaks.length} available</span></div>
        </motion.div>

        <motion.div variants={child} className="mb-4 grid gap-2 md:grid-cols-3">
          {presets.map(preset => {
            const Icon = preset.icon; const active = activePreset === preset.id;
            return <button type="button" key={preset.id} onClick={() => applyPreset(preset)} className={`gm-panel group p-4 text-left transition-all ${active ? "border-white/[0.12] bg-white/[0.04]" : "hover:border-white/[0.10]"}`}>
              <div className="mb-3 flex items-center justify-between"><span className={`grid h-8 w-8 place-items-center rounded-[10px] border ${active ? "border-white/[0.10] bg-white/[0.035] text-[#ff8d46]" : "border-white/[0.06] bg-white/[0.025] text-white/30"}`}><Icon size={15} /></span><ChevronRight size={13} className="text-white/12 transition-transform group-hover:translate-x-0.5" /></div>
              <div className="text-[12px] font-semibold text-white/66">{preset.label}</div><div className="mt-1 min-h-8 text-[10px] leading-4 text-white/22">{preset.description}</div><div className="mt-3 text-[9px] font-mono text-white/16">{preset.tweaks.length} controls</div>
            </button>;
          })}
        </motion.div>

        <motion.div variants={child} className="gm-panel mb-4 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
          <label className="flex min-h-9 flex-1 items-center gap-2 rounded-[10px] border border-white/[0.055] bg-black/15 px-3"><Search size={13} className="text-white/20" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tweaks…" className="min-w-0 flex-1 bg-transparent text-[11px] text-white/65 outline-none placeholder:text-white/15" /></label>
          <div className="flex items-center gap-1 overflow-x-auto"><Filter size={12} className="mx-1 shrink-0 text-white/18" />{(["all", "standard", "elevated", "advanced"] as const).map(filter => <button key={filter} onClick={() => setRiskFilter(filter)} className={`h-8 rounded-lg border px-2.5 text-[9px] font-semibold capitalize transition-all ${riskFilter === filter ? "border-white/[0.11] bg-white/[0.045] text-white/65" : "border-transparent text-white/24 hover:bg-white/[0.03] hover:text-white/45"}`}>{filter}</button>)}</div>
        </motion.div>

        <div className="space-y-3">
          {visibleByCategory.map(group => (
            <motion.section variants={child} key={group.category} className="gm-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3"><span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/22">{group.category}</span><span className="text-[9px] font-mono text-white/14">{group.items.length}</span></div>
              <div className="divide-y divide-white/[0.04]">
                {group.items.map(tweak => {
                  const checked = selected.has(tweak.id); const busy = applying.has(tweak.id); const isApplied = applied.has(tweak.id); const risk = riskFor(tweak);
                  return <div key={tweak.id} className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${checked ? "bg-white/[0.024]" : "hover:bg-white/[0.012]"}`}>
                    <button type="button" disabled={running} onClick={() => toggleCheck(tweak.id)} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all ${busy ? "border-orange-400/30 bg-orange-400/[0.06]" : checked ? "border-orange-400/35 bg-orange-400/[0.12] text-orange-300" : "border-white/[0.11] text-transparent hover:border-white/25"}`}>{busy ? <span className="h-3 w-3 animate-spin rounded-full border border-orange-300/20 border-t-orange-300" /> : <Check size={11} strokeWidth={3} />}</button>
                    <button type="button" disabled={running} onClick={() => toggleCheck(tweak.id)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-white/62">{tweak.title}</span>{isApplied && <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.04] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-200/45">Applied</span>}<RiskBadge risk={risk} />{tweak.requiresReboot && <RotateCcw size={10} className="text-orange-300/40" />}</div><p className="mt-1 text-[10px] leading-4 text-white/21">{tweak.description}</p></button>
                    {isApplied && canRevert(tweak) && <button title="Restore previous value" disabled={busy || running} onClick={() => void revertOne(tweak)} className="gm-button-secondary !min-h-7 !px-2.5 !text-[9px]"><Undo2 size={10} />Restore</button>}
                  </div>;
                })}
              </div>
            </motion.section>
          ))}
        </div>

        {visibleByCategory.length === 0 && <motion.div variants={child} className="gm-panel mt-3 py-14 text-center"><Search size={20} className="mx-auto mb-2 text-white/12" /><p className="text-[11px] text-white/24">No tweaks match this filter.</p></motion.div>}

        <motion.div variants={child} className="sticky bottom-0 z-10 mt-4 border-t border-white/[0.04] bg-[#030304]/92 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2"><button onClick={() => { setSelected(new Set()); setActivePreset(null); }} disabled={!selected.size || running} className="gm-button-secondary">Clear</button><button onClick={runSelected} disabled={!selected.size || running} className="gm-button-primary flex-1">{running ? <><span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />Applying changes…</> : <><Sparkles size={13} />Apply selected <span className="font-mono text-white/60">{selected.size}</span></>}</button></div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {confirmIds && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setConfirmIds(null)}><motion.div className="gm-panel-strong w-full max-w-md p-6" initial={{ y: 12, opacity: 0, scale: .985 }} animate={{ y: 0, opacity: 1, scale: 1 }} onMouseDown={e => e.stopPropagation()}><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-red-300/12 bg-red-300/[0.05] text-red-200/60"><AlertTriangle size={18} /></div><h2 className="text-[16px] font-semibold text-white/82">Review advanced changes</h2><p className="mt-2 text-[11px] leading-5 text-white/30">This batch contains {confirmIds.filter(id => { const tweak = tweaks.find(item => item.id === id); return tweak && riskFor(tweak) === "advanced"; }).length} advanced item(s) that can remove Windows components, apps, or security features. GM-Optimization will continue only after this explicit review.</p><div className="mt-4 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/[0.05] bg-black/15 p-2">{confirmIds.map(id => tweaks.find(t => t.id === id)).filter((t): t is TweakDefinition => Boolean(t && riskFor(t) === "advanced")).map(t => <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-white/40"><ShieldAlert size={10} className="text-red-200/40" />{t.title}</div>)}</div><div className="mt-5 flex gap-2"><button className="gm-button-secondary flex-1" onClick={() => setConfirmIds(null)}>Cancel</button><button className="gm-button-primary flex-1" onClick={() => void executeBatch(confirmIds)}>Apply reviewed changes</button></div></motion.div></motion.div>}

        {result && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setResult(null)}><motion.div className="gm-panel-strong w-full max-w-md p-6" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onMouseDown={e => e.stopPropagation()}><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl border ${result.fail ? "border-red-300/12 bg-red-300/[0.05] text-red-200/55" : "border-emerald-300/12 bg-emerald-300/[0.05] text-emerald-200/55"}`}>{result.fail ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</div><button className="text-white/20 hover:text-white/55" onClick={() => setResult(null)}><X size={16} /></button></div><h2 className="mt-4 text-[16px] font-semibold text-white/80">{result.fail ? "Completed with exceptions" : "Changes applied"}</h2><p className="mt-1 text-[11px] text-white/28">{result.success} of {result.total} operations completed successfully.</p>{result.errors.length > 0 && <div className="mt-4 max-h-36 space-y-1 overflow-y-auto">{result.errors.map((error, index) => <div key={index} className="rounded-lg border border-red-300/8 bg-red-300/[0.025] px-3 py-2 text-[9px] font-mono leading-4 text-red-100/45">{error}</div>)}</div>}<div className="mt-5 flex gap-2"><button className="gm-button-secondary flex-1" onClick={() => setResult(null)}>Done</button>{result.requiresReboot && <button className="gm-button-primary flex-1" onClick={startRestart}><RotateCcw size={12} />Restart PC</button>}</div></motion.div></motion.div>}

        {restartCountdown !== null && <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#030304]/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="text-center"><div className="text-[9px] font-semibold uppercase tracking-[0.25em] text-orange-300/45">Restart scheduled</div><div className="my-4 font-mono text-6xl font-semibold tracking-[-0.06em] text-white/85">{restartCountdown}</div><p className="mb-6 text-[11px] text-white/25">Save any open work. Restart can still be cancelled.</p><button onClick={cancelRestart} className="gm-button-secondary">Cancel restart</button></div></motion.div>}
      </AnimatePresence>
    </>
  );
}
