import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, FileJson, Upload } from "lucide-react";
import { useToast } from "../components/Toast";

export default function Profiles() {
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef(profileName);
  const descRef = useRef(profileDesc);
  const { toast } = useToast();

  nameRef.current = profileName;
  descRef.current = profileDesc;

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const json = await invoke<string>("export_profile");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gm-optimization-profile-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast("success", "Profile exported successfully");
    } catch (error) {
      toast("error", `Export failed: ${error}`);
    } finally {
      setExporting(false);
    }
  }, [toast]);

  const onFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const name = nameRef.current.trim() || file.name.replace(/\.json$/i, "");
      const description = descRef.current.trim() || `Imported from ${file.name}`;
      const message = await invoke<string>("import_profile", { json: text, name, description });
      toast("success", message);
      setProfileName("");
      setProfileDesc("");
    } catch (error) {
      toast("error", `Import failed: ${error}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [toast]);

  return (
    <div className="mx-auto w-full max-w-[900px] pb-10">
      <div className="mb-5">
        <div className="gm-section-label">Configuration</div>
        <h1 className="gm-page-title mt-1.5">Profiles</h1>
        <p className="gm-page-subtitle">Move a known GM configuration between installations or keep a local snapshot of your current setup.</p>
      </div>

      <input ref={fileRef} type="file" accept=".json" onChange={onFileSelected} className="hidden" />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="gm-panel p-5">
          <div className="mb-5 flex items-start justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/34"><Download size={16} /></div>
            <span className="gm-pill">JSON</span>
          </div>
          <h2 className="text-[12px] font-semibold text-white/67">Export current state</h2>
          <p className="mt-2 min-h-12 text-[9.5px] leading-4 text-white/24">Create a portable snapshot of the currently tracked tweak configuration, network settings, and exclusions.</p>
          <button onClick={() => void handleExport()} disabled={exporting} className="gm-button-primary mt-5 w-full"><Download size={12} />{exporting ? "Exporting…" : "Export profile"}</button>
        </section>

        <section className="gm-panel p-5">
          <div className="mb-5 flex items-start justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/34"><Upload size={16} /></div>
            <span className="gm-pill"><FileJson size={9} />Review file first</span>
          </div>
          <h2 className="text-[12px] font-semibold text-white/67">Import saved profile</h2>
          <p className="mt-2 text-[9.5px] leading-4 text-white/24">Choose a GM profile and give it a local label. Importing stores the configuration for use in the app.</p>
          <div className="mt-4 space-y-2">
            <input className="gm-input" placeholder="Profile name (optional)" value={profileName} onChange={event => setProfileName(event.target.value)} />
            <input className="gm-input" placeholder="Description (optional)" value={profileDesc} onChange={event => setProfileDesc(event.target.value)} />
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="gm-button-secondary mt-3 w-full"><Upload size={12} />{importing ? "Importing…" : "Choose profile file"}</button>
        </section>
      </div>
    </div>
  );
}
