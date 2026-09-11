import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { ToastProvider } from "./components/Toast";
import SplashScreen from "./components/SplashScreen";
import Layout from "./components/Layout";
import WindowChrome from "./components/WindowChrome";
import Dashboard from "./pages/Dashboard";
import TweaksHub from "./pages/TweaksHub";
import CustomizePrefs from "./pages/CustomizePrefs";
import AppSettings from "./pages/AppSettings";
import AboutSystem from "./pages/AboutSystem";
import OptimizationWizard from "./pages/OptimizationWizard";
import JunkCleaner from "./pages/JunkCleaner";
import Benchmark from "./pages/Benchmark";
import Restore from "./pages/Restore";
import Profiles from "./pages/Profiles";
import StartupManager from "./pages/StartupManager";
interface DriveSummary {
  letter: string;
  size: string;
}

interface InitResult {
  cpu_name: string;
  gpu_name: string;
  ram_total: string;
  drives: DriveSummary[];
  is_admin: boolean;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [initData, setInitData] = useState<InitResult | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    invoke<InitResult>("init_app")
      .then(data => {
        setInitData(data);
        setLoading(false);
        t = setTimeout(() => setReady(true), 240);
      })
      .catch(() => {
        setLoading(false);
        setInitError(true);
      });
    return () => { if (t) clearTimeout(t); };
  }, []);

  if (initError) {
    return (
      <div className="flex h-screen flex-col bg-[#030304]">
        <WindowChrome />
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
          <div className="absolute h-72 w-72 rounded-full bg-orange-500/[0.06] blur-[90px]" />
          <div className="relative border border-orange-400/15 bg-black/30 px-8 py-7 text-center [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%_-_10px))]">
            <p className="font-mono text-[7px] font-bold tracking-[0.2em] text-orange-300/45">GM CORE / INIT FAULT</p>
            <p className="mt-3 text-[13px] font-bold text-white/66">System link could not initialize</p>
            <p className="mt-2 text-[9px] text-white/23">Restart GM-Optimization. If this repeats, run the included project check.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SplashScreen loading={loading} />
      {ready && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard initData={initData} />} />
                <Route path="wizard" element={<OptimizationWizard />} />
                <Route path="tweaks" element={<TweaksHub />} />
                <Route path="customize" element={<CustomizePrefs />} />
                <Route path="settings" element={<AppSettings />} />
                <Route path="about" element={<AboutSystem />} />
                <Route path="junk-cleaner" element={<JunkCleaner />} />
                <Route path="benchmark" element={<Benchmark />} />
                <Route path="restore" element={<Restore />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="startup" element={<StartupManager />} />
              </Route>
            </Routes>
          </ToastProvider>
        </motion.div>
      )}
    </>
  );
}
