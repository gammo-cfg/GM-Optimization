import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useToast } from "../components/Toast";
import ProgressBar from "../components/ProgressBar";

interface JunkCategory {
  category_id: string;
  category_name: string;
  file_count: number;
  total_size: number;
  files: string[];
}

interface JunkResult {
  categories: JunkCategory[];
  total_size: number;
  total_files: number;
}

interface ExclusionEntry {
  id: number;
  path: string;
  added_at: string;
}

export default function JunkCleaner() {
  const [result, setResult] = useState<JunkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  const [exclusions, setExclusions] = useState<ExclusionEntry[]>([]);
  const [showExclusions, setShowExclusions] = useState(false);
  const [newExclusion, setNewExclusion] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  const loadExclusions = useCallback(async () => {
    try {
      setExclusions(await invoke<ExclusionEntry[]>("get_exclusions"));
    } catch { /* keep cleaner usable */ }
  }, []);

  useEffect(() => { void loadExclusions(); }, [loadExclusions]);
  useEffect(() => () => { unlistenRef.current?.(); }, []);

  const listenProgress = async () => {
    unlistenRef.current?.();
    const unlisten = await listen<{ current: number; total: number; label: string }>("scan-progress", event => {
      setProgress(event.payload);
    });
    unlistenRef.current = unlisten;
  };

  const scan = async () => {
    setLoading(true);
    setCleanResult(null);
    setProgress(null);
    await listenProgress();
    try {
      const response = await invoke<JunkResult>("scan_junk", { request: { custom_paths: [] } });
      setResult(response);
      setSelected([]);
      toast("info", `Found ${response.total_files} files (${(response.total_size / (1024 * 1024)).toFixed(1)} MB)`);
    } catch (error) {
      setCleanResult(`Error: ${error}`);
      toast("error", `Scan failed: ${error}`);
    } finally {
      setProgress(null);
      setLoading(false);
    }
  };

  const clean = async () => {
    setConfirmClean(false);
    setLoading(true);
    setProgress(null);
    await listenProgress();
    try {
      const response = await invoke<{ items_removed: number; space_freed: number; errors: string[] }>("clean_junk", {
        selectedCategories: selected,
      });
      const mb = (response.space_freed / (1024 * 1024)).toFixed(1);
      setCleanResult(`Removed ${response.items_removed} items, freed ${mb} MB${response.errors.length ? ` (${response.errors.length} errors)` : ""}`);
      setResult(null);
      toast("success", `Cleaned ${response.items_removed} items, freed ${mb} MB`);
    } catch (error) {
      setCleanResult(`Error: ${error}`);
      toast("error", `Clean failed: ${error}`);
    } finally {
      setProgress(null);
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  };

  const addExclusion = async () => {
    const trimmed = newExclusion.trim();
    if (!trimmed) return;
    try {
      await invoke("add_exclusion", { path: trimmed });
      setNewExclusion("");
      await loadExclusions();
      toast("success", "Protected path added");
    } catch (error) {
      toast("error", `Error adding exclusion: ${error}`);
    }
  };

  const removeExclusion = async (id: number) => {
    try {
      await invoke("remove_exclusion", { id });
      await loadExclusions();
      toast("success", "Protected path removed");
    } catch (error) {
      toast("error", `Error removing exclusion: ${error}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] pb-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="gm-section-label">Storage</div>
          <h1 className="gm-page-title mt-1.5">Storage Cleaner</h1>
          <p className="gm-page-subtitle">Scan first, review categories, and clean only the data you explicitly select.</p>
        </div>
        <button onClick={() => setShowExclusions(!showExclusions)} className="gm-button-secondary">
          {showExclusions ? "Hide exclusions" : `Exclusions · ${exclusions.length}`}
        </button>
      </div>

      {progress && (
        <div className="gm-panel mb-4 p-4">
          <ProgressBar current={progress.current} total={progress.total} label={progress.label} />
        </div>
      )}

      {showExclusions && (
        <section className="gm-panel mb-4 p-5">
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-white/63">Protected paths</div>
            <div className="mt-1 text-[9px] leading-4 text-white/22">Matching files and folders are skipped by interactive and scheduled cleanup operations.</div>
          </div>
          <div className="flex gap-2">
            <input
              value={newExclusion}
              onChange={event => setNewExclusion(event.target.value)}
              onKeyDown={event => event.key === "Enter" && void addExclusion()}
              placeholder="C:\\Users\\...\\folder-to-protect"
              className="gm-input flex-1"
            />
            <button onClick={() => void addExclusion()} className="gm-button-primary">Add path</button>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.05]">
            {exclusions.length === 0 ? (
              <div className="px-4 py-5 text-[9px] text-white/20">No protected paths configured.</div>
            ) : exclusions.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 border-b border-white/[0.04] px-3.5 py-2.5 last:border-b-0">
                <span className="min-w-0 flex-1 truncate font-mono text-[8.5px] text-white/33">{entry.path}</span>
                <button onClick={() => void removeExclusion(entry.id)} className="text-[8.5px] font-semibold text-red-200/42 hover:text-red-200/70">Remove</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!result && !loading && (
        <section className="gm-panel overflow-hidden">
          <div className="grid md:grid-cols-[1fr_300px]">
            <div className="border-b border-white/[0.05] p-5 md:border-b-0 md:border-r">
              <div className="gm-section-label">Review before delete</div>
              <h2 className="mt-2 text-[17px] font-semibold tracking-[-0.02em] text-white/76">Find reclaimable temporary data.</h2>
              <p className="mt-2 max-w-xl text-[9.5px] leading-4 text-white/24">GM scans the supported cleanup categories and returns a categorized result. Nothing is deleted during the scan.</p>
              <button onClick={() => void scan()} className="gm-button-primary mt-5">Scan storage</button>
            </div>
            <div className="p-5">
              <div className="text-[9px] font-semibold text-white/38">Cleaner safeguards</div>
              <div className="mt-3 space-y-2 text-[8.5px] leading-4 text-white/21">
                <div>• Protected paths are excluded from scans and scheduled cleanup.</div>
                <div>• Categories must be selected before deletion.</div>
                <div>• A second confirmation is required before removing files.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading && !progress && <div className="gm-panel px-5 py-10 text-center text-[10px] text-white/24">Working…</div>}

      {result && !loading && (
        <section className="gm-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/[0.05] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10.5px] font-semibold text-white/61">Scan result</div>
              <div className="mt-1 text-[8.5px] text-white/20">{result.total_files} files · {(result.total_size / (1024 * 1024)).toFixed(1)} MB discovered</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResult(null)} className="gm-button-secondary">Back</button>
              <button onClick={() => setConfirmClean(true)} disabled={selected.length === 0} className="gm-button-primary">Clean selected · {selected.length}</button>
            </div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {result.categories.map(category => {
              const checked = selected.includes(category.category_id);
              return (
                <label key={category.category_id} className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors ${checked ? "bg-white/[0.022]" : "hover:bg-white/[0.012]"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(category.category_id)} className="gm-checkbox" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-white/52">{category.category_name}</div>
                    <div className="mt-1 text-[8.5px] text-white/18">{category.file_count} files</div>
                  </div>
                  <div className="font-mono text-[9px] text-white/31">{(category.total_size / (1024 * 1024)).toFixed(1)} MB</div>
                </label>
              );
            })}
          </div>

          {confirmClean && (
            <div className="border-t border-amber-300/10 bg-amber-300/[0.022] px-4 py-4">
              <div className="text-[10px] font-semibold text-amber-100/58">Confirm permanent cleanup</div>
              <div className="mt-1 text-[8.5px] leading-4 text-white/23">
                {selected.reduce((sum, id) => {
                  const category = result.categories.find(item => item.category_id === id);
                  return sum + (category?.file_count || 0);
                }, 0)} files in the selected categories will be removed.
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void clean()} className="gm-button-danger">Confirm cleanup</button>
                <button onClick={() => setConfirmClean(false)} className="gm-button-secondary">Cancel</button>
              </div>
            </div>
          )}
        </section>
      )}

      {cleanResult && (
        <section className="gm-panel mt-4 flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 text-[9.5px] text-white/42">{cleanResult}</div>
          <button onClick={() => { setCleanResult(null); setSelected([]); }} className="gm-button-secondary shrink-0">Done</button>
        </section>
      )}
    </div>
  );
}
