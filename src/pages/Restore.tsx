import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock3, RotateCcw, ShieldCheck } from "lucide-react";
import { useToast } from "../components/Toast";

interface RestorePointInfo {
  description: string;
  created_at: string;
  sequence_number: number;
}

export default function Restore() {
  const [points, setPoints] = useState<RestorePointInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setPoints(await invoke<RestorePointInfo[]>("get_restore_points"));
    } catch (error) {
      toast("error", `Failed to load restore points: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    const description = label.trim() || "GM manual restore point";
    setCreating(true);
    try {
      toast("success", await invoke<string>("create_restore_point", { label: description }));
      setLabel("");
      void load();
    } catch (error) {
      toast("error", String(error));
    } finally {
      setCreating(false);
    }
  };

  const restore = async (sequenceNumber: number, description: string) => {
    setRestoring(true);
    try {
      const message = await invoke<string>("restore_system", { sequenceNumber });
      toast("info", `${message} — "${description}"`);
      void load();
    } catch (error) {
      toast("error", `Restore failed: ${error}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[930px] pb-10">
      <div className="mb-5">
        <div className="gm-section-label">Recovery</div>
        <h1 className="gm-page-title mt-1.5">System Restore</h1>
        <p className="gm-page-subtitle">Create a Windows restore point before major changes and keep rollback controls visible.</p>
      </div>

      <section className="gm-panel mb-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/34"><ShieldCheck size={16} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-white/63">Create restore point</div>
            <div className="mt-1 text-[9px] leading-4 text-white/22">Windows System Restore can provide an additional recovery path if a system-level configuration does not behave as expected.</div>
            <div className="mt-4 flex gap-2">
              <input value={label} onChange={event => setLabel(event.target.value)} placeholder="e.g. Before gaming profile" className="gm-input flex-1" />
              <button onClick={() => void create()} disabled={creating || restoring} className="gm-button-primary"><ShieldCheck size={12} />{creating ? "Creating…" : "Create point"}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="gm-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3.5">
          <div>
            <div className="text-[10.5px] font-semibold text-white/61">Available restore points</div>
            <div className="mt-0.5 text-[8.5px] text-white/20">Reported by Windows System Restore</div>
          </div>
          <span className="gm-pill">{points.length} available</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-[10px] text-white/23">Loading restore points…</div>
        ) : points.length === 0 ? (
          <div className="px-5 py-12 text-center"><RotateCcw size={18} className="mx-auto mb-2 text-white/10" /><div className="text-[10px] text-white/22">No restore points were reported.</div></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {points.map(point => (
              <div key={point.sequence_number} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.012]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.05] bg-white/[0.016] text-white/26"><Clock3 size={13} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-semibold text-white/50">{point.description}</div>
                  <div className="mt-1 font-mono text-[8px] text-white/15">{point.created_at.replace("T", " ").slice(0, 19)} · #{point.sequence_number}</div>
                </div>
                <button onClick={() => void restore(point.sequence_number, point.description)} disabled={restoring || creating} className="gm-button-danger"><RotateCcw size={11} />{restoring ? "Restoring…" : "Restore"}</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
