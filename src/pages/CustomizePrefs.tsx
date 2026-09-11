import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RotateCw, SlidersHorizontal } from "lucide-react";
import { useToast } from "../components/Toast";
import { toggles, type ToggleDefinition } from "../data/preferences";

const keyForToggle = (toggle: ToggleDefinition): string | null => {
  if (!toggle.registry || toggle.registry.length === 0) return null;
  const registry = toggle.registry[0];
  return `${registry.path}|${registry.name}|${registry.value}`;
};

export default function CustomizePrefs() {
  const [states, setStates] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const keys = toggles.map(keyForToggle).filter(Boolean) as string[];
    invoke<[string, boolean][]>("read_registry_values", { entries: keys })
      .then(results => {
        const map: Record<string, boolean> = {};
        for (let index = 0; index < results.length; index++) if (results[index][1]) map[toggles[index].id] = true;
        setStates(map);
      })
      .catch(() => {});
  }, []);

  const isOn = (toggle: ToggleDefinition) => states[toggle.id] ?? toggle.defaultState;

  const handleToggle = async (toggle: ToggleDefinition) => {
    const enabled = !isOn(toggle);
    setStates(previous => ({ ...previous, [toggle.id]: enabled }));
    setApplying(toggle.id);
    try {
      if (toggle.registry) await invoke<string>("apply_registry_tweak", { entries: toggle.registry, enabled });
      if (toggle.enableScript && toggle.disableScript) {
        await invoke<string>("execute_powershell_tweak", { enabled, enableScript: toggle.enableScript, disableScript: toggle.disableScript });
      }
      toast("success", `${toggle.title} ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      setStates(previous => ({ ...previous, [toggle.id]: !enabled }));
      toast("error", `${toggle.title}: ${error}`);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[920px] pb-10">
      <div className="mb-5">
        <div className="gm-section-label">Windows</div>
        <h1 className="gm-page-title mt-1.5">Windows Controls</h1>
        <p className="gm-page-subtitle">Individual Windows preferences. Changes apply immediately; restart requirements are marked.</p>
      </div>

      <section className="gm-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3.5">
          <div className="flex items-center gap-2"><SlidersHorizontal size={13} className="text-white/28" /><span className="text-[10.5px] font-semibold text-white/61">Available controls</span></div>
          <span className="gm-pill">{toggles.length}</span>
        </div>
        {toggles.length === 0 ? (
          <div className="px-5 py-12 text-center text-[10px] text-white/22">No preference controls loaded.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {toggles.map(toggle => {
              const on = isOn(toggle);
              const busy = applying === toggle.id;
              return (
                <div key={toggle.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.012]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-semibold text-white/53">{toggle.title}</span>{toggle.requiresReboot && <span className="gm-pill !min-h-5 !px-1.5"><RotateCw size={8} />Restart</span>}</div>
                    <div className="mt-1 text-[8.5px] leading-4 text-white/20">{toggle.description}</div>
                  </div>
                  <button onClick={() => !busy && void handleToggle(toggle)} disabled={busy} className={`gm-switch ${on ? "gm-switch-on" : ""}`} aria-label={`${on ? "Disable" : "Enable"} ${toggle.title}`}>
                    <span>{busy && <i />}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
