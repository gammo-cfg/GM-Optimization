import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Zap } from "lucide-react";

const appWindow = getCurrentWindow();

export default function WindowChrome() {
  const safe = (action: () => Promise<void>) => {
    void action().catch(() => {});
  };

  return (
    <div className="gm-window-chrome relative z-[70] flex h-[34px] min-h-[34px] items-center">
      <div className="absolute inset-y-0 left-0 right-[132px]" data-tauri-drag-region />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-2.5 px-3.5" data-tauri-drag-region>
        <span className="gm-chrome-core" data-tauri-drag-region><Zap size={9} /></span>
        <span className="font-mono text-[6.5px] font-bold tracking-[0.16em] text-orange-300/43" data-tauri-drag-region>GM-OPTIMIZATION</span>
        <span className="h-3 w-px bg-white/[0.06]" data-tauri-drag-region />
        <span className="font-mono text-[6px] tracking-[0.13em] text-white/13" data-tauri-drag-region>FOCUSED NEON CORE</span>
      </div>

      <div className="relative z-20 ml-auto flex h-full items-stretch">
        <button className="gm-window-control" type="button" title="Minimize" aria-label="Minimize" onClick={() => safe(() => appWindow.minimize())}><Minus size={12} /></button>
        <button className="gm-window-control" type="button" title="Maximize / Restore" aria-label="Maximize or restore" onClick={() => safe(() => appWindow.toggleMaximize())}><Square size={10} /></button>
        <button className="gm-window-control gm-window-control-close" type="button" title="Hide to tray" aria-label="Hide to tray" onClick={() => safe(() => appWindow.hide())}><X size={12} /></button>
      </div>
    </div>
  );
}
