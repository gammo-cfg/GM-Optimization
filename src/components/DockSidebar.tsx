import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  Gauge,
  HardDriveDownload,
  Info,
  LayoutDashboard,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserRoundCog,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  { label: "Home", items: [{ path: "/", label: "Command Deck", icon: LayoutDashboard }] },
  {
    label: "Optimize",
    items: [
      { path: "/wizard", label: "Guided Sequence", icon: Sparkles },
      { path: "/tweaks", label: "Tweaks Matrix", icon: Zap },
      { path: "/profiles", label: "Profiles", icon: UserRoundCog },
    ],
  },
  {
    label: "Tools",
    items: [
      { path: "/junk-cleaner", label: "Storage Purge", icon: HardDriveDownload },
      { path: "/startup", label: "Boot Control", icon: Play },
      { path: "/benchmark", label: "Performance Lab", icon: Gauge },
      { path: "/restore", label: "Recovery", icon: RotateCcw },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/customize", label: "Windows Control", icon: SlidersHorizontal },
      { path: "/about", label: "Hardware Intel", icon: Info },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function DockSidebar() {
  return (
    <aside className="gm-sidebar gm-sidebar-focused relative z-20">
      <div className="gm-brand gm-brand-focused">
        <div className="gm-brand-mark gm-brand-mark-focused" aria-hidden="true">
          <span className="gm-brand-core">GM</span>
        </div>
        <div className="min-w-0">
          <div className="gm-brand-name">GM-OPTIMIZATION</div>
          <div className="gm-brand-subtitle">PERFORMANCE CORE</div>
        </div>
      </div>

      <nav className="gm-nav-scroll gm-nav-scroll-focused">
        {groups.map(group => (
          <div key={group.label} className="gm-nav-group gm-nav-group-focused">
            <div className="gm-nav-label gm-nav-label-focused">{group.label}</div>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) => `gm-nav-item gm-nav-item-focused ${isActive ? "gm-nav-item-active" : ""}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="gm-nav-focus" className="gm-nav-focus" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                        <span className="gm-nav-icon"><Icon size={15} strokeWidth={isActive ? 2 : 1.65} /></span>
                        <span className="relative z-10 min-w-0 flex-1 truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="gm-sidebar-footer gm-sidebar-footer-focused">
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-bold tracking-[0.15em] text-orange-300/42">LOCAL CORE</div>
          <div className="mt-1 font-mono text-[8px] text-white/18">v0.4.2 / WIN-X64</div>
        </div>
        <span className="gm-kbd">CTRL K</span>
      </div>
    </aside>
  );
}
