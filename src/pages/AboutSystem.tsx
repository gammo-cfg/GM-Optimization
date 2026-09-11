import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CircuitBoard, Cpu, HardDrive, Info, Monitor, Wifi } from "lucide-react";

interface SystemInfo {
  cpu: { label: string; value: string }[];
  gpu: { label: string; value: string }[];
  ram: { label: string; value: string }[];
  motherboard: { label: string; value: string }[];
  storage: { label: string; value: string }[];
  network: { label: string; value: string }[];
}

function SpecSection({ icon: Icon, title, entries }: { icon: typeof Cpu; title: string; entries: { label: string; value: string }[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="gm-panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3"><Icon size={13} className="text-white/28" /><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/24">{title}</span></div>
      <div className="divide-y divide-white/[0.04]">
        {entries.map(entry => (
          <div key={entry.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-white/18">{entry.label}</span>
            <span className="max-w-[66%] truncate text-right font-mono text-[8.5px] text-white/43" title={entry.value}>{entry.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AboutSystem() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  useEffect(() => { invoke<SystemInfo>("get_system_info").then(setInfo).catch(() => {}); }, []);

  return (
    <div className="mx-auto w-full max-w-[1040px] pb-10">
      <div className="mb-5">
        <div className="gm-section-label">System</div>
        <h1 className="gm-page-title mt-1.5">System Info</h1>
        <p className="gm-page-subtitle">Hardware and network details reported by Windows, plus the local GM application build.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SpecSection icon={Cpu} title="Processor" entries={info?.cpu || []} />
        <SpecSection icon={Monitor} title="Graphics" entries={info?.gpu || []} />
        <SpecSection icon={CircuitBoard} title="Memory" entries={info?.ram || []} />
        <SpecSection icon={HardDrive} title="Storage" entries={info?.storage || []} />
        <SpecSection icon={Info} title="Motherboard" entries={info?.motherboard || []} />
        <SpecSection icon={Wifi} title="Network" entries={info?.network || []} />
      </div>

      <section className="gm-panel mt-4 overflow-hidden">
        <div className="border-b border-white/[0.05] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/24">Application</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5">
          {[{ label: "App", value: "GM-Optimization" }, { label: "Version", value: "0.4.2" }, { label: "Platform", value: "Windows x64" }, { label: "Framework", value: "Tauri 2 + React 19" }, { label: "License", value: "MIT" }].map(entry => (
            <div key={entry.label} className="border-b border-white/[0.04] px-4 py-3 sm:border-r last:border-r-0">
              <div className="text-[7.5px] font-semibold uppercase tracking-[0.12em] text-white/16">{entry.label}</div>
              <div className="mt-1.5 truncate font-mono text-[8.5px] text-white/39">{entry.value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
