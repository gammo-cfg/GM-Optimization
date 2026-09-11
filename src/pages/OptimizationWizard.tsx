import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Check, LayoutDashboard, RotateCw, Sparkles } from "lucide-react";
import { useToast } from "../components/Toast";
import { profiles, type WizardProfile } from "../data/wizard";
import { tweaks, type TweakDefinition } from "../data/tweaks";
import { toggles, type ToggleDefinition } from "../data/preferences";

type Step = "welcome" | "review" | "applying" | "done";

interface ApplyResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
  requiresReboot?: boolean;
}

function ProfileCard({ profile, onClick }: { profile: WizardProfile; onClick: () => void }) {
  const Icon = profile.icon;
  return (
    <button onClick={onClick} className="gm-panel group p-5 text-left transition-colors hover:border-orange-400/20 hover:bg-orange-400/[0.025]">
      <div className="mb-5 flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/34"><Icon size={16} strokeWidth={1.7} /></span>
        <span className="font-mono text-[8px] text-white/13">{profile.tweaks.length + profile.preferences.length} items</span>
      </div>
      <div className="text-[11px] font-semibold text-white/63">{profile.label}</div>
      <div className="mt-1.5 text-[9px] leading-4 text-white/22">{profile.description}</div>
    </button>
  );
}

function TweakRow({ tweak, checked, disabled, onToggle }: { tweak: TweakDefinition; checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button disabled={disabled} onClick={onToggle} className={`flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-3.5 text-left last:border-b-0 ${checked ? "bg-white/[0.018]" : "hover:bg-white/[0.012]"}`}>
      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${checked ? "border-[#ff6813]/50 bg-[#ff6813]/15 text-[#ffad72]" : "border-white/[0.11] text-transparent"}`}><Check size={9} strokeWidth={3} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-semibold ${checked ? "text-white/54" : "text-white/34"}`}>{tweak.title}</span>
        <span className="mt-1 block text-[8.5px] leading-4 text-white/18">{tweak.description}</span>
      </span>
      {tweak.requiresReboot && <span className="gm-pill !min-h-5 !px-1.5"><RotateCw size={8} />Restart</span>}
    </button>
  );
}

function PrefToggleRow({ toggle, enabled, disabled, onToggle }: { toggle: ToggleDefinition; enabled: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-white/49">{toggle.title}</span>{toggle.requiresReboot && <span className="gm-pill !min-h-5 !px-1.5"><RotateCw size={8} />Restart</span>}</div>
        <div className="mt-1 text-[8.5px] leading-4 text-white/18">{toggle.description}</div>
      </div>
      <button disabled={disabled} onClick={onToggle} className={`gm-switch ${enabled ? "gm-switch-on" : ""}`}><span /></button>
    </div>
  );
}

export default function OptimizationWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<WizardProfile | null>(null);
  const [selectedTweaks, setSelectedTweaks] = useState<Set<string>>(new Set());
  const [selectedPrefs, setSelectedPrefs] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentTitle, setCurrentTitle] = useState("");
  const [results, setResults] = useState<ApplyResult[]>([]);

  const totalCount = useMemo(() => selectedTweaks.size + Object.keys(selectedPrefs).length, [selectedTweaks, selectedPrefs]);

  const selectProfile = (selected: WizardProfile) => {
    setProfile(selected);
    setSelectedTweaks(new Set(selected.tweaks));
    setSelectedPrefs(Object.fromEntries(selected.preferences.map(reference => [reference.id, reference.state])));
    setStep("review");
  };

  const toggleTweak = (id: string) => {
    setSelectedTweaks(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyTweak = async (id: string) => {
    const tweak = tweaks.find(item => item.id === id);
    if (!tweak) return;
    if (tweak.registry?.length) await invoke<string>("apply_registry_tweak", { entries: tweak.registry, enabled: true });
    if (tweak.enableScript && tweak.disableScript) await invoke<string>("execute_powershell_tweak", { enabled: true, enableScript: tweak.enableScript, disableScript: tweak.disableScript });
    if (tweak.commands?.length) await invoke<string>("execute_native_commands", { commands: tweak.commands });
    if (tweak.services?.length) await invoke<string>("configure_services", { entries: tweak.services });
    await invoke("set_tweak_state", { key: tweak.id, enabled: true, requiresReboot: Boolean(tweak.requiresReboot) });
  };

  const applyPref = async (id: string, enabled: boolean) => {
    const preference = toggles.find(item => item.id === id);
    if (!preference) return;
    if (preference.registry?.length) await invoke<string>("apply_registry_tweak", { entries: preference.registry, enabled });
    if (preference.enableScript && preference.disableScript) await invoke<string>("execute_powershell_tweak", { enabled, enableScript: preference.enableScript, disableScript: preference.disableScript });
  };

  const runApply = async () => {
    if (!profile || totalCount === 0) return;
    setRunning(true);
    setStep("applying");
    setResults([]);
    const tweakIds = Array.from(selectedTweaks);
    const preferenceIds = Object.keys(selectedPrefs);
    const total = tweakIds.length + preferenceIds.length;
    setProgress({ current: 0, total });
    const nextResults: ApplyResult[] = [];

    for (const id of tweakIds) {
      const tweak = tweaks.find(item => item.id === id);
      const title = tweak?.title ?? id;
      setCurrentTitle(title);
      try {
        await applyTweak(id);
        nextResults.push({ id, title, success: true, requiresReboot: tweak?.requiresReboot });
      } catch (error) {
        nextResults.push({ id, title, success: false, error: String(error) });
      }
      setResults([...nextResults]);
      setProgress(previous => ({ ...previous, current: previous.current + 1 }));
    }

    for (const id of preferenceIds) {
      const preference = toggles.find(item => item.id === id);
      const title = preference?.title ?? id;
      setCurrentTitle(title);
      try {
        await applyPref(id, selectedPrefs[id]);
        nextResults.push({ id, title, success: true, requiresReboot: preference?.requiresReboot });
      } catch (error) {
        nextResults.push({ id, title, success: false, error: String(error) });
      }
      setResults([...nextResults]);
      setProgress(previous => ({ ...previous, current: previous.current + 1 }));
    }

    setRunning(false);
    setCurrentTitle("");
    setStep("done");
    const succeeded = nextResults.filter(result => result.success).length;
    const failed = nextResults.length - succeeded;
    failed ? toast("error", `Applied ${succeeded}/${total} items — ${failed} failed`) : toast("success", `Applied all ${succeeded} items successfully`);
  };

  return (
    <div className="mx-auto w-full max-w-[920px] pb-10">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="mb-5"><div className="gm-section-label">Guided workflow</div><h1 className="gm-page-title mt-1.5">Guided Optimize</h1><p className="gm-page-subtitle">Choose the workload that best describes this PC. You will review every proposed control before GM applies anything.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{profiles.map(item => <ProfileCard key={item.id} profile={item} onClick={() => selectProfile(item)} />)}</div>
          </motion.div>
        )}

        {step === "review" && profile && (
          <motion.div key="review" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <button onClick={() => setStep("welcome")} className="mb-4 flex items-center gap-1.5 text-[9px] text-white/25 hover:text-white/50"><ArrowLeft size={11} />Change profile</button>
            <div className="mb-5"><div className="gm-section-label">Review</div><h1 className="gm-page-title mt-1.5">{profile.label}</h1><p className="gm-page-subtitle">{totalCount} selected controls. Disable anything you do not want before continuing.</p></div>

            <section className="gm-panel mb-4 p-4">
              <div className="gm-section-label">Expected direction</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{profile.benefits.map((benefit, index) => <div key={index} className="flex items-start gap-2 text-[8.5px] leading-4 text-white/25"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#ff7220]" />{benefit}</div>)}</div>
            </section>

            <section className="gm-panel mb-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3"><span className="text-[9px] font-semibold text-white/40">System tweaks</span><span className="gm-pill">{selectedTweaks.size} selected</span></div>
              {profile.tweaks.map(id => { const tweak = tweaks.find(item => item.id === id); return tweak ? <TweakRow key={id} tweak={tweak} checked={selectedTweaks.has(id)} disabled={running} onToggle={() => toggleTweak(id)} /> : null; })}
            </section>

            <section className="gm-panel mb-4 overflow-hidden">
              <div className="border-b border-white/[0.05] px-4 py-3 text-[9px] font-semibold text-white/40">Windows preferences</div>
              {profile.preferences.map(reference => { const toggle = toggles.find(item => item.id === reference.id); return toggle ? <PrefToggleRow key={reference.id} toggle={toggle} enabled={selectedPrefs[reference.id] ?? reference.state} disabled={running} onToggle={() => setSelectedPrefs(previous => ({ ...previous, [reference.id]: !previous[reference.id] }))} /> : null; })}
            </section>

            <div className="flex justify-end"><button onClick={() => void runApply()} disabled={totalCount === 0} className="gm-button-primary min-w-[210px]"><Sparkles size={13} />Apply reviewed configuration · {totalCount}</button></div>
          </motion.div>
        )}

        {step === "applying" && (
          <motion.div key="applying" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="mb-5"><div className="gm-section-label">Applying</div><h1 className="gm-page-title mt-1.5">Configuring Windows</h1><p className="gm-page-subtitle">{currentTitle || "Preparing next control…"}</p></div>
            <section className="gm-panel overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between"><span className="text-[9px] text-white/27">Progress</span><span className="font-mono text-[9px] text-white/25">{progress.current} / {progress.total}</span></div>
                <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.055]"><motion.div className="h-full bg-[#ff6813]" animate={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} transition={{ duration: .2 }} /></div>
              </div>
              <div className="max-h-[360px] divide-y divide-white/[0.04] overflow-y-auto border-t border-white/[0.05]">
                {results.map(result => <div key={result.id} className="flex items-center gap-3 px-4 py-3"><span className={`grid h-4 w-4 place-items-center rounded-full border ${result.success ? "border-emerald-300/15 text-emerald-200/55" : "border-red-300/15 text-red-200/55"}`}>{result.success ? <Check size={8} /> : "!"}</span><span className="min-w-0 flex-1 truncate text-[9px] text-white/35">{result.title}</span></div>)}
              </div>
            </section>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-5"><div className="gm-section-label">Complete</div><h1 className="gm-page-title mt-1.5">Configuration applied</h1><p className="gm-page-subtitle">{results.filter(result => result.success).length} of {results.length} operations completed successfully.</p></div>
            <section className="gm-panel mb-4 overflow-hidden">
              <div className="divide-y divide-white/[0.04]">{results.map(result => <div key={result.id} className="flex items-center gap-3 px-4 py-3"><span className={`grid h-4 w-4 place-items-center rounded-full border ${result.success ? "border-emerald-300/15 text-emerald-200/55" : "border-red-300/15 text-red-200/55"}`}>{result.success ? <Check size={8} /> : "!"}</span><div className="min-w-0 flex-1"><div className="truncate text-[9.5px] text-white/39">{result.title}</div>{result.error && <div className="mt-1 truncate font-mono text-[7.5px] text-red-200/35">{result.error}</div>}</div>{result.requiresReboot && result.success && <span className="gm-pill !min-h-5"><RotateCw size={8} />Restart</span>}</div>)}</div>
            </section>
            {results.some(result => result.requiresReboot && result.success) && <div className="mb-4 rounded-lg border border-amber-300/10 bg-amber-300/[0.025] px-4 py-3 text-[8.5px] leading-4 text-white/24">Some applied changes require a Windows restart before they are fully active.</div>}
            <div className="flex justify-end"><button onClick={() => navigate("/")} className="gm-button-primary"><LayoutDashboard size={13} />Return to dashboard</button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
