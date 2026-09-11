import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { Clock3, Download, FolderCog, Settings2, Upload, UserRoundCog } from "lucide-react";
import { useToast } from "../components/Toast";

interface Schedule {
  id: number;
  name: string;
  module: string;
  schedule_type: string;
  time?: string | null;
  day?: string | null;
  enabled: boolean;
  created_at: string;
}

export default function AppSettings() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    invoke<Schedule[]>("get_schedules").then(setSchedules).catch(() => {});
  }, []);

  const exportProfile = async () => {
    try {
      const json = await invoke<string>("export_profile");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gm-optimization-profile-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast("success", "Profile exported");
    } catch {
      toast("error", "Export failed");
    }
  };

  const importProfile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await invoke("import_profile", { json: text, name: data.name || file.name, description: data.description || "" });
        toast("success", "Profile imported");
      } catch {
        toast("error", "Invalid profile file");
      }
    };
    input.click();
  };

  const toggleSchedule = async (id: number, enabled: boolean) => {
    try {
      await invoke("toggle_schedule", { id, enabled });
      setSchedules(previous => previous.map(schedule => schedule.id === id ? { ...schedule, enabled } : schedule));
      toast("success", enabled ? "Schedule enabled" : "Schedule disabled");
    } catch {
      toast("error", "Failed to toggle schedule");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[920px] pb-10">
      <div className="mb-5">
        <div className="gm-section-label">Application</div>
        <h1 className="gm-page-title mt-1.5">Settings</h1>
        <p className="gm-page-subtitle">Profile transfer, scheduled tasks, and application-level controls.</p>
      </div>

      <section className="gm-panel mb-4 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5">
          <Settings2 size={14} className="text-white/30" />
          <div><div className="text-[10.5px] font-semibold text-white/61">Profiles & backup</div><div className="mt-0.5 text-[8.5px] text-white/20">Portable configuration snapshots</div></div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <button onClick={() => void exportProfile()} className="gm-settings-action"><Upload size={15} /><span><strong>Export profile</strong><small>Save current GM state as JSON</small></span></button>
          <button onClick={importProfile} className="gm-settings-action"><Download size={15} /><span><strong>Import profile</strong><small>Load a trusted GM profile file</small></span></button>
          <Link to="/profiles" className="gm-settings-action"><UserRoundCog size={15} /><span><strong>Profile workspace</strong><small>Open import/export tools</small></span></Link>
        </div>
      </section>

      <section className="gm-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3.5">
          <div className="flex items-center gap-3"><Clock3 size={14} className="text-white/30" /><div><div className="text-[10.5px] font-semibold text-white/61">Scheduled tasks</div><div className="mt-0.5 text-[8.5px] text-white/20">Automation registered by GM</div></div></div>
          <span className="gm-pill">{schedules.length} tasks</span>
        </div>

        {schedules.length === 0 ? (
          <div className="px-5 py-12 text-center"><FolderCog size={19} className="mx-auto mb-2 text-white/10" /><div className="text-[10px] text-white/22">No scheduled GM tasks are configured.</div></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {schedules.map(schedule => (
              <div key={schedule.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.012]">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.05] bg-white/[0.016] text-white/26"><Clock3 size={13} /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-semibold text-white/48">{schedule.name || schedule.module}</div><div className="mt-1 font-mono text-[8px] text-white/15">{[schedule.module, schedule.schedule_type, schedule.day, schedule.time].filter(Boolean).join(" · ")}</div></div>
                <button onClick={() => void toggleSchedule(schedule.id, !schedule.enabled)} className={`gm-switch ${schedule.enabled ? "gm-switch-on" : ""}`} aria-label={`${schedule.enabled ? "Disable" : "Enable"} schedule`}><span /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
