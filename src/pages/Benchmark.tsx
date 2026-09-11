import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, Gauge, HardDrive, Network, Play, Trash2 } from "lucide-react";
import { useToast } from "../components/Toast";

interface BenchmarkResult {
  id: number;
  benchmark_type: string;
  score: number;
  unit: string;
  profile_name: string | null;
  created_at: string;
}

const benchmarkMeta = {
  disk: { label: "Disk throughput", detail: "512 MB sequential write/read workload", icon: HardDrive },
  network: { label: "Network latency", detail: "Round-trip latency to public endpoints", icon: Network },
  cpu: { label: "CPU compute", detail: "Multi-threaded calculation workload", icon: Cpu },
} as const;

export default function Benchmark() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setHistory(await invoke<BenchmarkResult[]>("get_benchmark_history"));
    } catch { /* keep page usable */ }
  };

  useEffect(() => { void loadHistory(); }, []);

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    try {
      const response = await invoke<BenchmarkResult[]>("run_all_benchmarks");
      setResults(response);
      toast("success", "Performance lab completed");
      void loadHistory();
    } catch (error) {
      toast("error", `Benchmark failed: ${error}`);
    } finally {
      setRunning(false);
    }
  };

  const runSingle = async (benchmarkType: string) => {
    setRunning(true);
    try {
      const command = benchmarkType === "disk" ? "run_disk_benchmark" : benchmarkType === "network" ? "run_network_benchmark" : "run_cpu_benchmark";
      const response = await invoke<BenchmarkResult>(command);
      setResults([response]);
      toast("success", `${benchmarkMeta[benchmarkType as keyof typeof benchmarkMeta].label}: ${response.score.toFixed(1)} ${response.unit}`);
      void loadHistory();
    } catch (error) {
      toast("error", `Benchmark failed: ${error}`);
    } finally {
      setRunning(false);
    }
  };

  const clearHistory = async () => {
    await invoke("clear_benchmark_history");
    setHistory([]);
    toast("info", "Benchmark history cleared");
  };

  return (
    <div className="mx-auto w-full max-w-[1060px] pb-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="gm-section-label">Measurement</div>
          <h1 className="gm-page-title mt-1.5">Performance Lab</h1>
          <p className="gm-page-subtitle">Capture repeatable CPU, storage, and network-latency measurements without inventing an overall score.</p>
        </div>
        <button onClick={runAll} disabled={running} className="gm-button-primary"><Gauge size={13} />{running ? "Running tests…" : "Run full baseline"}</button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {(Object.keys(benchmarkMeta) as Array<keyof typeof benchmarkMeta>).map(type => {
          const meta = benchmarkMeta[type];
          const Icon = meta.icon;
          return (
            <button key={type} disabled={running} onClick={() => void runSingle(type)} className="gm-panel group p-4 text-left transition-colors hover:border-orange-400/20 hover:bg-orange-400/[0.025] disabled:opacity-45">
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/34"><Icon size={16} strokeWidth={1.7} /></span>
                <Play size={12} className="text-white/14 group-hover:text-[#ff8b43]" />
              </div>
              <div className="text-[11px] font-semibold text-white/63">{meta.label}</div>
              <div className="mt-1 text-[9px] leading-4 text-white/22">{meta.detail}</div>
            </button>
          );
        })}
      </div>

      {results.length > 0 && (
        <section className="gm-panel mb-4 overflow-hidden">
          <div className="border-b border-white/[0.05] px-4 py-3.5">
            <div className="text-[10.5px] font-semibold text-white/61">Latest measurement</div>
            <div className="mt-0.5 text-[8.5px] text-white/20">Use repeat runs under similar conditions when comparing changes.</div>
          </div>
          <div className="grid md:grid-cols-3">
            {results.map(result => {
              const meta = benchmarkMeta[result.benchmark_type as keyof typeof benchmarkMeta] ?? benchmarkMeta.cpu;
              const Icon = meta.icon;
              return (
                <div key={`${result.benchmark_type}-${result.id}`} className="border-b border-white/[0.045] p-4 md:border-b-0 md:border-r last:border-r-0">
                  <div className="flex items-center gap-2 text-[9px] text-white/26"><Icon size={11} />{meta.label}</div>
                  <div className="mt-3 font-mono text-[24px] font-semibold tracking-[-0.035em] text-white/82">{result.score.toFixed(1)} <span className="text-[10px] font-normal text-white/26">{result.unit}</span></div>
                  {result.profile_name && <div className="mt-1 truncate text-[8px] text-white/16">{result.profile_name}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="gm-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3.5">
          <div>
            <div className="text-[10.5px] font-semibold text-white/61">Measurement history</div>
            <div className="mt-0.5 text-[8.5px] text-white/20">Recorded locally on this PC</div>
          </div>
          {history.length > 0 && <button onClick={clearHistory} className="gm-button-secondary !min-h-7 !px-2.5 !text-[8.5px]"><Trash2 size={10} />Clear</button>}
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-12 text-center"><Gauge size={19} className="mx-auto mb-2 text-white/10" /><div className="text-[10px] text-white/22">No benchmark history yet.</div></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {history.map(result => {
              const meta = benchmarkMeta[result.benchmark_type as keyof typeof benchmarkMeta] ?? benchmarkMeta.cpu;
              const Icon = meta.icon;
              return (
                <div key={result.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.012]">
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.05] bg-white/[0.016] text-white/26"><Icon size={12} /></span>
                  <span className="w-32 text-[9.5px] font-medium text-white/44">{meta.label}</span>
                  <span className="font-mono text-[10px] font-semibold text-white/67">{result.score.toFixed(1)}</span>
                  <span className="text-[8px] text-white/20">{result.unit}</span>
                  <span className="min-w-0 flex-1 truncate text-[8px] text-white/15">{result.profile_name}</span>
                  <span className="font-mono text-[8px] text-white/14">{result.created_at.split("T")[0]}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
