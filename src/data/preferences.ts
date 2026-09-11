import type { RegistryEntry } from "./types";

export interface ToggleDefinition {
  id: string;
  title: string;
  description: string;
  defaultState: boolean;
  registry?: RegistryEntry[];
  enableScript?: string[];
  disableScript?: string[];
  requiresReboot?: boolean;
}

export const toggles: ToggleDefinition[] = [
  {
    id: "WPFToggleDetailedBSoD",
    title: "BSoD Verbose Mode",
    description: "If enabled, you will see a detailed Blue Screen of Death (BSOD) with more information.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl", name: "DisplayParameters", value: "1", type_: "DWord" },
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl", name: "DisableEmoticon", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleDisableCrossDeviceResume",
    title: "Cross-Device Resume",
    description: "This tweak controls the Resume function in Windows 11 24H2 and later, which allows you to resume an activity from a mobile device and vice-versa.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CrossDeviceResume\\Configuration", name: "IsResumeAllowed", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleDarkMode",
    title: "Dark Theme for Windows",
    description: "Enable/Disable Dark Mode.",
    defaultState: false,
    registry: [
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "AppsUseLightTheme", value: "0", type_: "DWord" },
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "SystemUsesLightTheme", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleTransparencyEffects",
    title: "Transparency Effects",
    description: "Enable/Disable Windows transparency effects.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "EnableTransparency", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleTaskView",
    title: "Taskbar Task View Icon",
    description: "If enabled, Task View Button in Taskbar will be shown.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "ShowTaskViewButton", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleTaskbarSearch",
    title: "Taskbar Search Icon",
    description: "If enabled, Search Button will be on the Taskbar.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search", name: "SearchboxTaskbarMode", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleTaskbarAlignment",
    title: "Taskbar Centered Icons",
    description: "[Windows 11] If enabled, the Taskbar Items will be shown on the Center, otherwise the Taskbar Items will be shown on the Left.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "TaskbarAl", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleBatteryPercentage",
    title: "System Tray Battery Percentage",
    description: "If enabled, shows numeric battery percentage next to the battery icon in the system tray.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "IsBatteryPercentageEnabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleStickyKeys",
    title: "Sticky Keys",
    description: "If enabled, Sticky Keys is activated. Sticky keys is an accessibility feature that assists users who have physical disabilities or helps reduce repetitive strain injury.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Control Panel\\Accessibility\\StickyKeys", name: "Flags", value: "506", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleStartMenuRecommendations",
    title: "Start Menu Recommendations",
    description: "If disabled, then you will not see recommendations in the Start Menu. WARNING: This will also disable Windows Spotlight on your Lock Screen as a side effect.",
    defaultState: true,
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\Start", name: "HideRecommendedSection", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\Education", name: "IsEducationEnvironment", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer", name: "HideRecommendedSection", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleBingSearch",
    title: "Start Menu Bing Search",
    description: "If enabled, Bing web search results will be included in your Start Menu search.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search", name: "BingSearchEnabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleHideSettingsHome",
    title: "Settings Home Page",
    description: "Enable or disable the Home Page in the Windows Settings app.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer", name: "SettingsPageVisibility", value: "show:home", type_: "String" },
    ],
  },
  {
    id: "WPFToggleS3Sleep",
    title: "S3 Sleep",
    description: "Toggles between Modern Standby and S3 Sleep.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power", name: "PlatformAoAcOverride", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleStandbyFix",
    title: "S0 Sleep Network Connectivity",
    description: "Enable or disable network connectivity during S0 Sleep.",
    defaultState: true,
    registry: [
      { path: "HKCU\\SOFTWARE\\Policies\\Microsoft\\Power\\PowerSettings\\f15576e8-98b7-4186-b944-eafa664402d9", name: "ACSettingIndex", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleNumLock",
    title: "Num Lock on Startup",
    description: "Toggle the Num Lock key state when your computer starts.",
    defaultState: false,
    registry: [
      { path: "HKU\\.Default\\Control Panel\\Keyboard", name: "InitialKeyboardIndicators", value: "2", type_: "String" },
      { path: "HKCU\\Control Panel\\Keyboard", name: "InitialKeyboardIndicators", value: "2", type_: "String" },
    ],
  },
  {
    id: "WPFToggleMultiplaneOverlay",
    title: "Multiplane Overlay",
    description: "Enable or disable the Multiplane Overlay, which can sometimes cause issues with graphics cards.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm", name: "OverlayTestMode", value: "0", type_: "DWord" },
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers", name: "DisableOverlays", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleMouseAcceleration",
    title: "Mouse Acceleration",
    description: "If enabled, the cursor movement is affected by the speed of your physical mouse movements.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Control Panel\\Mouse", name: "MouseSpeed", value: "1", type_: "DWord" },
      { path: "HKCU\\Control Panel\\Mouse", name: "MouseThreshold1", value: "6", type_: "DWord" },
      { path: "HKCU\\Control Panel\\Mouse", name: "MouseThreshold2", value: "10", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleNewOutlook",
    title: "Microsoft Outlook New Version",
    description: "If disabled, it removes the new Outlook toggle, disables the new Outlook migration, and ensures the classic Outlook application is used.",
    defaultState: true,
    registry: [
      { path: "HKCU\\SOFTWARE\\Microsoft\\Office\\16.0\\Outlook\\Preferences", name: "UseNewOutlook", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Office\\16.0\\Outlook\\Options\\General", name: "HideNewOutlookToggle", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Policies\\Microsoft\\Office\\16.0\\Outlook\\Options\\General", name: "DoNewOutlookAutoMigration", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Policies\\Microsoft\\Office\\16.0\\Outlook\\Preferences", name: "NewOutlookMigrationUserSetting", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleVerboseLogon",
    title: "Logon Verbose Mode",
    description: "Show detailed messages during the login process for troubleshooting and diagnostics.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System", name: "VerboseStatus", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleLoginBlur",
    title: "Logon Screen Acrylic Blur",
    description: "If enabled, the acrylic blur effect will be shown on the Windows login screen background.",
    defaultState: true,
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "DisableAcrylicBackgroundOnLogon", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleGameMode",
    title: "Game Mode",
    description: "If enabled, Windows prioritizes gaming performance by allocating system resources. Disable for audio/video production to prevent interference.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\GameBar", name: "AllowAutoGameMode", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\GameBar", name: "AutoGameModeEnabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleHiddenFiles",
    title: "File Explorer Hidden Files",
    description: "If enabled, Hidden Files will be shown.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "Hidden", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleLongPaths",
    title: "Enable Long Paths",
    description: "Enables support for file paths longer than 260 characters.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem", name: "LongPathsEnabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleShowExt",
    title: "File Explorer File Extensions",
    description: "If enabled, file extensions (e.g., .txt, .jpg) are visible.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "HideFileExt", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
];
