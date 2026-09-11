import type { LucideIcon } from "lucide-react";
import { Gamepad2, Briefcase, Cpu, Rocket } from "lucide-react";

export interface WizardPreferenceRef {
  id: string;
  state: boolean;
}

export interface WizardProfile {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  benefits: string[];
  tweaks: string[];
  preferences: WizardPreferenceRef[];
}

const gamingTweaks = [
  "WPFTweaksActivity",
  "WPFTweaksTelemetry",
  "WPFTweaksPowershell7Tele",
  "WPFTweaksConsumerFeatures",
  "WPFTweaksDeBloat",
  "WPFTweaksWidget",
  "WPFTweaksEndTaskOnTaskbar",
  "WPFTweaksDisableBGapps",
  "WPFTweaksLocation",
  "WPFTweaksDisableNotifications",
  "WPFTweaksDisableFSO",
  "WPFTweaksTeredo",
  "WPFTweaksDeleteTempFiles",
  "WPFTweaksDiskCleanup",
  "WPFTweaksWPBT",
  "WPFTweaksHiber",
  "WPFTweaksDisplay",
  "WPFTweaksEdgeDebloat",
  "WPFTweaksDisableStoreSearch",
];

const gamingPrefs: WizardPreferenceRef[] = [
  { id: "WPFToggleGameMode", state: true },
  { id: "WPFToggleTaskView", state: false },
  { id: "WPFToggleTaskbarSearch", state: false },
  { id: "WPFToggleMouseAcceleration", state: false },
  { id: "WPFToggleMultiplaneOverlay", state: false },
  { id: "WPFToggleBingSearch", state: false },
  { id: "WPFToggleStartMenuRecommendations", state: false },
  { id: "WPFToggleDarkMode", state: true },
];

const productivityTweaks = [
  "WPFTweaksActivity",
  "WPFTweaksTelemetry",
  "WPFTweaksPowershell7Tele",
  "WPFTweaksConsumerFeatures",
  "WPFTweaksDeBloat",
  "WPFTweaksEndTaskOnTaskbar",
  "WPFTweaksDisableBGapps",
  "WPFTweaksLocation",
  "WPFTweaksRestorePoint",
  "WPFTweaksDeleteTempFiles",
  "WPFTweaksDiskCleanup",
  "WPFTweaksWPBT",
  "WPFTweaksRightClickMenu",
  "WPFTweaksEdgeDebloat",
  "WPFTweaksDisableStoreSearch",
  "WPFTweaksStorage",
];

const productivityPrefs: WizardPreferenceRef[] = [
  { id: "WPFToggleDarkMode", state: true },
  { id: "WPFToggleHiddenFiles", state: true },
  { id: "WPFToggleShowExt", state: true },
  { id: "WPFToggleNewOutlook", state: false },
  { id: "WPFToggleStartMenuRecommendations", state: false },
  { id: "WPFToggleBingSearch", state: false },
  { id: "WPFToggleStandbyFix", state: true },
  { id: "WPFToggleNumLock", state: true },
];

const lowEndTweaks = [
  "WPFTweaksActivity",
  "WPFTweaksTelemetry",
  "WPFTweaksPowershell7Tele",
  "WPFTweaksConsumerFeatures",
  "WPFTweaksDeBloat",
  "WPFTweaksWidget",
  "WPFTweaksEndTaskOnTaskbar",
  "WPFTweaksDisableBGapps",
  "WPFTweaksLocation",
  "WPFTweaksDisableNotifications",
  "WPFTweaksDisableFSO",
  "WPFTweaksDeleteTempFiles",
  "WPFTweaksDiskCleanup",
  "WPFTweaksWPBT",
  "WPFTweaksHiber",
  "WPFTweaksDisplay",
  "WPFTweaksStorage",
  "WPFTweaksTeredo",
  "WPFTweaksDisableExplorerAutoDiscovery",
  "WPFTweaksRemoveOneDrive",
  "WPFTweaksXboxRemoval",
  "WPFTweaksRemoveHome",
  "WPFTweaksEdgeDebloat",
  "WPFTweaksDisableIPv6",
  "WPFTweaksDisableStoreSearch",
];

const lowEndPrefs: WizardPreferenceRef[] = [
  { id: "WPFToggleTaskView", state: false },
  { id: "WPFToggleTaskbarSearch", state: false },
  { id: "WPFToggleMultiplaneOverlay", state: false },
  { id: "WPFToggleHiddenFiles", state: false },
  { id: "WPFToggleShowExt", state: true },
  { id: "WPFToggleGameMode", state: true },
  { id: "WPFToggleBingSearch", state: false },
  { id: "WPFToggleStartMenuRecommendations", state: false },
  { id: "WPFToggleStickyKeys", state: false },
  { id: "WPFToggleBatteryPercentage", state: true },
  { id: "WPFToggleTaskbarAlignment", state: false },
  { id: "WPFToggleDarkMode", state: true },
  { id: "WPFToggleMouseAcceleration", state: false },
  { id: "WPFToggleLoginBlur", state: false },
  { id: "WPFToggleS3Sleep", state: true },
];

export const profiles: WizardProfile[] = [
  {
    id: "gaming",
    label: "Gaming",
    description: "Prioritize gaming performance by reducing background activity and disabling non-essential features",
    icon: Gamepad2,
    benefits: [
      "Reduces background services and telemetry during gameplay",
      "Disables features that can interfere with fullscreen applications",
      "Removes unnecessary pre-installed applications and widgets",
      "Optimizes visual effects and system animations for responsiveness",
    ],
    tweaks: gamingTweaks,
    preferences: gamingPrefs,
  },
  {
    id: "productivity",
    label: "Work / Productivity",
    description: "Enhance privacy, reduce distractions, and keep productivity tools available",
    icon: Briefcase,
    benefits: [
      "Enhances privacy by limiting telemetry and background data collection",
      "Removes distracting elements like widgets and notification clutter",
      "Keeps productivity tools and collaboration features available",
      "Enables file explorer improvements for easier file management",
    ],
    tweaks: productivityTweaks,
    preferences: productivityPrefs,
  },
  {
    id: "lowend",
    label: "Low-End PC",
    description: "Maximize performance on limited hardware by minimizing resource usage across the system",
    icon: Cpu,
    benefits: [
      "Minimizes memory and CPU usage by disabling animations and visual effects",
      "Frees disk space by disabling hibernation and removing bloatware",
      "Reduces background processes and services to a minimum",
      "Optimizes file explorer and system navigation for lower-end hardware",
    ],
    tweaks: lowEndTweaks,
    preferences: lowEndPrefs,
  },
  {
    id: "maxperformance",
    label: "Maximum Performance",
    description: "Apply all available performance optimizations — no compromise, stripped to essentials",
    icon: Rocket,
    benefits: [
      "Applies all available performance optimizations across the system",
      "Removes or disables AI features, Copilot, and other resource-heavy components",
      "Strips unnecessary drivers, services, and scheduled tasks",
      "Reduces system footprint to the minimum functional configuration",
    ],
    tweaks: [
      ...lowEndTweaks,
      "WPFTweaksRevertStartMenu",
      "WPFTweaksRightClickMenu",
      "WPFTweaksWindowsAI",
      "WPFTweaksBraveDebloat",
      "WPFTweaksRazerBlock",
      "WPFTweaksDisableBitLocker",
    ],
    preferences: [
      ...lowEndPrefs,
      { id: "WPFToggleDetailedBSoD", state: true },
      { id: "WPFToggleVerboseLogon", state: true },
    ],
  },
];
