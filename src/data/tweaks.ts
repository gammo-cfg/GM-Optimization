import { Zap, Gauge, Mountain, type LucideIcon } from "lucide-react";
import type { RegistryEntry } from "./types";

export interface ServiceEntry {
  name: string;
  startup_type: string;
}

export interface TweakDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  registry?: RegistryEntry[];
  services?: ServiceEntry[];
  enableScript?: string[];
  disableScript?: string[];
  commands?: string[];
  requiresReboot?: boolean;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tweaks: string[];
}

export const tweaks: TweakDefinition[] = [
  {
    id: "WPFTweaksActivity",
    title: "Activity History - Disable",
    description: "Erases recent docs, clipboard, and run history.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "EnableActivityFeed", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "PublishUserActivities", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "UploadUserActivities", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksConsumerFeatures",
    title: "ConsumerFeatures - Disable",
    description: "Windows will not automatically install any games, third-party apps, or application links from the Windows Store for the signed-in user. Some default Apps will be inaccessible (eg. Phone Link).",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent", name: "DisableWindowsConsumerFeatures", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksTelemetry",
    title: "Telemetry - Disable",
    description: "Disables Microsoft Telemetry.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo", name: "Enabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy", name: "TailoredExperiencesWithDiagnosticDataEnabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy", name: "HasAccepted", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Input\\TIPC", name: "Enabled", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization", name: "RestrictImplicitInkCollection", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization", name: "RestrictImplicitTextCollection", value: "1", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\InputPersonalization\\TrainedDataStore", name: "HarvestContacts", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Personalization\\Settings", name: "AcceptedPrivacyPolicy", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection", name: "AllowTelemetry", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "Start_TrackProgs", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "PublishUserActivities", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Siuf\\Rules", name: "NumberOfSIUFInPeriod", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Set-MpPreference -SubmitSamplesConsent 2",
      "Set-Service -Name diagtrack -StartupType Disabled",
      "Set-Service -Name wermgr -StartupType Disabled",
      "Remove-ItemProperty -Path \"HKCU:\\Software\\Microsoft\\Siuf\\Rules\" -Name PeriodInNanoSeconds",
    ],
    disableScript: [
      "Set-MpPreference -SubmitSamplesConsent 1",
      "Set-Service -Name diagtrack -StartupType Automatic",
      "Set-Service -Name wermgr -StartupType Automatic",
    ],
  },
  {
    id: "WPFTweaksPowershell7Tele",
    title: "PowerShell 7 Telemetry - Disable",
    description: "Creates a system environment variable called 'POWERSHELL_TELEMETRY_OPTOUT' with a value of '1' to tell PowerShell 7 to opt-out of telemetry collections.",
    category: "Essential Tweaks",
    enableScript: [
      "[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')",
    ],
    disableScript: [
      "[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '', 'Machine')",
    ],
  },
  {
    id: "WPFTweaksDeleteTempFiles",
    title: "Temporary Files - Remove",
    description: "Erases TEMP Folders.",
    category: "Essential Tweaks",
    enableScript: [
      "Remove-Item -Path \"$Env:Temp\\*\" -Recurse -Force",
      "Remove-Item -Path \"$Env:SystemRoot\\Temp\\*\" -Recurse -Force",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksRestorePoint",
    title: "Restore Point - Create",
    description: "Removes Windows creation frequency limits and creates a live System Restore snapshot before applying modifications.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore", name: "SystemRestorePointCreationFrequency", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "if (-not (Get-ComputerRestorePoint)) { Enable-ComputerRestore -Drive $Env:SystemDrive }",
      "Checkpoint-Computer -Description \"System Restore Point created by GM-Optimization\" -RestorePointType MODIFY_SETTINGS",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksDisableStoreSearch",
    title: "Microsoft Store Recommended Search Results - Disable",
    description: "Will not display recommended Microsoft Store apps when searching for apps in the Start menu.",
    category: "Essential Tweaks",
    enableScript: [
      "icacls \"$Env:LocalAppData\\Packages\\Microsoft.WindowsStore_8wekyb3d8bbwe\\LocalState\\store.db\" /deny Everyone:F",
    ],
    disableScript: [
      "icacls \"$Env:LocalAppData\\Packages\\Microsoft.WindowsStore_8wekyb3d8bbwe\\LocalState\\store.db\" /grant Everyone:F",
    ],
  },
  {
    id: "WPFTweaksEndTaskOnTaskbar",
    title: "End Task With Right Click - Enable",
    description: "Enables option to end task when right clicking a program in the taskbar.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings", name: "TaskbarEndTask", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDeBloat",
    title: "Unwanted Pre-Installed Apps - Remove",
    description: "Removes Windows pre-installed applications that most people don't want (News, Weather, Clipchamp, Solitaire, etc.). Does not affect Microsoft account or authentication.",
    category: "Essential Tweaks",
    enableScript: [
      "@(\"Microsoft.WindowsFeedbackHub\",\"Microsoft.BingNews\",\"Microsoft.BingSearch\",\"Microsoft.BingWeather\",\"Clipchamp.Clipchamp\",\"Microsoft.Todos\",\"Microsoft.PowerAutomateDesktop\",\"Microsoft.MicrosoftSolitaireCollection\",\"Microsoft.WindowsSoundRecorder\",\"Microsoft.MicrosoftStickyNotes\",\"Microsoft.Windows.DevHome\",\"Microsoft.Paint\",\"Microsoft.OutlookForWindows\",\"Microsoft.WindowsAlarms\",\"Microsoft.GetHelp\",\"Microsoft.ZuneMusic\",\"MicrosoftCorporationII.QuickAssist\") | ForEach-Object { Get-AppxPackage $_ -AllUsers | Remove-AppxPackage -AllUsers }",
      "$TeamsPath = \"$Env:LocalAppData\\Microsoft\\Teams\\Update.exe\"",
      "if (Test-Path $TeamsPath) { Start-Process $TeamsPath -ArgumentList '-uninstall' -Wait; Remove-Item $TeamsPath -Recurse -Force }",
    ],
    disableScript: [],
  },
  {
    id: "WPFTweaksWidget",
    title: "Widgets - Remove",
    description: "Removes the annoying widgets in the bottom left of the Taskbar.",
    category: "Essential Tweaks",
    enableScript: [
      "Get-Process *Widget* | Stop-Process",
      "Get-AppxPackage Microsoft.WidgetsPlatformRuntime -AllUsers | Remove-AppxPackage -AllUsers",
      "Get-AppxPackage MicrosoftWindows.Client.WebExperience -AllUsers | Remove-AppxPackage -AllUsers",
    ],
    disableScript: [
      "Add-AppxPackage -Register \"C:\\Program Files\\WindowsApps\\Microsoft.WidgetsPlatformRuntime*\\AppxManifest.xml\" -DisableDevelopmentMode",
      "Add-AppxPackage -Register \"C:\\Program Files\\WindowsApps\\MicrosoftWindows.Client.WebExperience*\\AppxManifest.xml\" -DisableDevelopmentMode",
    ],
  },
  {
    id: "WPFTweaksDisableExplorerAutoDiscovery",
    title: "File Explorer Automatic Folder Discovery - Disable",
    description: "Windows Explorer automatically tries to guess the type of the folder based on its contents, slowing down the browsing experience. WARNING! Will disable File Explorer grouping.",
    category: "Essential Tweaks",
    requiresReboot: true,
    enableScript: [
      "$bags = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\"",
      "$bagMRU = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU\"",
      "Remove-Item -Path $bags -Recurse -Force",
      "Remove-Item -Path $bagMRU -Recurse -Force",
      "$allFolders = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell\"",
      "if (!(Test-Path $allFolders)) { New-Item -Path $allFolders -Force }",
      "New-ItemProperty -Path $allFolders -Name \"FolderType\" -Value \"NotSpecified\" -PropertyType String -Force",
    ],
    disableScript: [
      "$bags = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\"",
      "$bagMRU = \"HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU\"",
      "Remove-Item -Path $bags -Recurse -Force",
      "Remove-Item -Path $bagMRU -Recurse -Force",
    ],
  },
  {
    id: "WPFTweaksDiskCleanup",
    title: "Disk Cleanup - Run",
    description: "Runs Disk Cleanup on Drive C: and aggressively strips obsolete component data blocks from old Windows Updates.",
    category: "Essential Tweaks",
    commands: [
      "cleanmgr.exe /d C: /VERYLOWDISK",
      "Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase",
    ],
  },
  {
    id: "WPFTweaksWPBT",
    title: "Windows Platform Binary Table (WPBT) - Disable",
    description: "If enabled, WPBT allows your computer vendor to execute programs at boot time, such as anti-theft software, software drivers, as well as force install software without user consent. Poses potential security risk.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager", name: "DisableWpbtExecution", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksHiber",
    title: "Hibernation - Disable",
    description: "Hibernation saves what is in memory before turning the PC off. Disabling it instantly frees up gigabytes of storage equivalent to your system RAM.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Power", name: "HibernateEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings", name: "ShowHibernateOption", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "powercfg.exe /hibernate off",
    ],
    disableScript: [
      "powercfg.exe /hibernate on",
    ],
  },
  {
    id: "WPFTweaksLocation",
    title: "Location Tracking - Disable",
    description: "Disables Windows Location Tracking infrastructure, sensors, and map auto-updates to prevent telemetry overhead.",
    category: "Essential Tweaks",
    services: [
      { name: "lfsvc", startup_type: "Disable" },
    ],
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location", name: "Value", value: "Deny", type_: "String" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}", name: "SensorPermissionState", value: "0", type_: "DWord" },
      { path: "HKLM\\SYSTEM\\Maps", name: "AutoUpdateEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableBGapps",
    title: "Background Apps - Disable",
    description: "Disables all Microsoft Store apps from running in the background, which has to be done individually since Windows 11.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications", name: "GlobalUserDisabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksBraveDebloat",
    title: "Brave Browser - Debloat",
    description: "Disables various annoyances like Brave Rewards, Leo AI, Crypto Wallet and VPN.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveRewardsDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveWalletDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveVPNDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveAIChatEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveStatsPingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveNewsDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveTalkDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "TorDisabled", value: "1", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "BraveP3AEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "UrlKeyedAnonymizedDataCollectionEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "SafeBrowsingExtendedReportingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\BraveSoftware\\Brave", name: "MetricsReportingEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksRemoveHome",
    title: "File Explorer Home and Gallery - Disable",
    description: "Removes the Home and Gallery from Explorer and sets This PC as default.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Software\\Classes\\CLSID\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}", name: "System.IsPinnedToNameSpaceTree", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "LaunchTo", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableFSO",
    title: "Fullscreen Optimizations - Disable",
    description: "Disables FSO in all applications. NOTE: This will disable Color Management in Exclusive Fullscreen.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\System\\GameConfigStore", name: "GameDVR_DXGIHonorFSEWindowsCompatible", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableIPv6",
    title: "IPv6 - Disable",
    description: "Disables IPv6.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", name: "DisabledComponents", value: "255", type_: "DWord" },
    ],
    enableScript: [
      "Disable-NetAdapterBinding -Name * -ComponentID ms_tcpip6",
    ],
    disableScript: [
      "Enable-NetAdapterBinding -Name * -ComponentID ms_tcpip6",
    ],
  },
  {
    id: "WPFTweaksIPv46",
    title: "IPv6 - Set IPv4 as Preferred",
    description: "Setting the IPv4 preference can have latency and security benefits on private networks where IPv6 is not configured.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", name: "DisabledComponents", value: "32", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksEdgeDebloat",
    title: "Microsoft Edge - Debloat",
    description: "Disables various Edge annoyances such as startup boost, sleeping tabs, shopping, password manager, sidebar, and more.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "StartupBoostEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "SleepingTabsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "BackgroundModeEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "PersonalizationReportingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "PasswordManagerEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "AutofillCreditCardEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "AddressBarEditingEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "ShoppingListEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "EdgeShoppingAssistantEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "CollectionsServicesAndExportsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "WalletServiceEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "HubSidebarEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "ShowRecommendationsEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "FamilySafetyEnabled", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge", name: "EdgeDigitalWalletEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksRemoveEdge",
    title: "Microsoft Edge - Remove",
    description: "Unblocks Microsoft Edge uninstaller restrictions then uses the uninstaller to remove Edge.",
    category: "Advanced Tweaks",
    enableScript: [
      "Stop-Process -Name msedge, edgeupdate -Force -ErrorAction SilentlyContinue",
      "$edgeSetup = Get-ChildItem -Path 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application' -Filter 'setup.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1",
      "if ($edgeSetup) { Start-Process $edgeSetup.FullName -ArgumentList '--uninstall --system-level --force-uninstall --delete-profile' -Wait -NoNewWindow }",
      "@('C:\\Program Files (x86)\\Microsoft\\Edge', 'C:\\Program Files (x86)\\Microsoft\\EdgeCore', 'C:\\Program Files (x86)\\Microsoft\\EdgeWebView', $env:LOCALAPPDATA+'\\Microsoft\\Edge', $env:LOCALAPPDATA+'\\Microsoft\\EdgeWebView', $env:APPDATA+'\\Microsoft\\Edge') | ForEach-Object { if (Test-Path $_) { Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue } }",
    ],
    disableScript: [
      "Write-Host 'Installing Microsoft Edge...'",
      "winget install Microsoft.Edge --source winget",
    ],
  },
  {
    id: "WPFTweaksRemoveOneDrive",
    title: "Microsoft OneDrive - Remove",
    description: "Denies permission to remove OneDrive user files, then uses its own uninstaller to remove it and restores the original permission afterward.",
    category: "Advanced Tweaks",
    enableScript: [
      "Stop-Process -Name FileCoAuth -Force -ErrorAction SilentlyContinue",
      "Start-Process 'C:\\Windows\\System32\\OneDriveSetup.exe' -ArgumentList '/uninstall' -Wait",
      "Stop-Process -Name FileCoAuth, Explorer -Force -ErrorAction SilentlyContinue",
      "Remove-Item \"$env:LOCALAPPDATA\\Microsoft\\OneDrive\" -Recurse -Force -ErrorAction SilentlyContinue",
      "Remove-Item \"C:\\ProgramData\\Microsoft OneDrive\" -Recurse -Force -ErrorAction SilentlyContinue",
      "Set-Service -Name OneSyncSvc -StartupType Disabled",
    ],
    disableScript: [
      "Write-Host 'Installing OneDrive...'",
      "winget install Microsoft.OneDrive --source winget",
      "Set-Service -Name OneSyncSvc -StartupType Automatic",
    ],
  },
  {
    id: "WPFTweaksRazerBlock",
    title: "Razer Software Auto-Install - Disable",
    description: "Blocks ALL Razer Software installations. The hardware works fine without any software.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching", name: "SearchOrderConfig", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Device Installer", name: "DisableCoInstallers", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "$RazerPath = 'C:\\Windows\\Installer\\Razer'",
      "if (Test-Path $RazerPath) { Remove-Item $RazerPath\\* -Recurse -Force } else { New-Item -Path $RazerPath -ItemType Directory -Force }",
      "icacls $RazerPath /deny 'Everyone:(W)'",
    ],
    disableScript: [
      "icacls 'C:\\Windows\\Installer\\Razer' /remove:d Everyone",
    ],
  },
  {
    id: "WPFTweaksXboxRemoval",
    title: "Xbox & Gaming Components - Remove",
    description: "Removes Xbox services, the Xbox app, Game Bar, and related authentication components.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR", name: "AppCaptureEnabled", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "@('Microsoft.XboxIdentityProvider','Microsoft.XboxSpeechToTextOverlay','Microsoft.GamingApp','Microsoft.Xbox.TCUI','Microsoft.XboxGamingOverlay') | ForEach-Object { Get-AppxPackage $_ -AllUsers | Remove-AppxPackage -AllUsers }",
    ],
    disableScript: [
      "Write-Host 'Xbox components removed. Reinstall from Microsoft Store if needed.'",
    ],
  },
  {
    id: "WPFTweaksWindowsAI",
    title: "Windows AI - Disable",
    description: "Removes or disables all AI features and packages including Copilot, Recall, and Notepad AI.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer", name: "SettingsPageVisibility", value: "hide:aicomponents", type_: "String" },
      { path: "HKLM\\SOFTWARE\\Policies\\WindowsNotepad", name: "DisableAIFeatures", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "$Appx = (Get-AppxPackage MicrosoftWindows.Client.CoreAI).PackageFullName",
      "$Sid = (Get-LocalUser $Env:UserName).Sid.Value",
      "New-Item 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Appx\\AppxAllUserStore\\EndOfLife\\$Sid\\$Appx' -Force",
      "Get-AppxPackage -AllUsers *Copilot* | Remove-AppxPackage -AllUsers",
      "Get-AppxPackage -AllUsers Microsoft.MicrosoftOfficeHub | Remove-AppxPackage -AllUsers",
      "Remove-AppxPackage $Appx",
      "Set-Service -Name WSAIFabricSvc -StartupType Disabled",
      "Disable-WindowsOptionalFeature -FeatureName Recall -Online",
    ],
    disableScript: [
      "Set-Service -Name WSAIFabricSvc -StartupType Manual",
      "Enable-WindowsOptionalFeature -FeatureName Recall -Online",
    ],
  },
  {
    id: "WPFTweaksDisplay",
    title: "Visual Effects - Set to Best Performance",
    description: "Sets the system preferences to performance. You can do this manually with sysdm.cpl as well.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Control Panel\\Desktop", name: "DragFullWindows", value: "0", type_: "String" },
      { path: "HKCU\\Control Panel\\Desktop", name: "MenuShowDelay", value: "200", type_: "String" },
      { path: "HKCU\\Control Panel\\Desktop\\WindowMetrics", name: "MinAnimate", value: "0", type_: "String" },
      { path: "HKCU\\Control Panel\\Keyboard", name: "KeyboardDelay", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "ListviewAlphaSelect", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "ListviewShadow", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "TaskbarAnimations", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects", name: "VisualFXSetting", value: "3", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\DWM", name: "EnableAeroPeek", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "TaskbarMn", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "ShowTaskViewButton", value: "0", type_: "DWord" },
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search", name: "SearchboxTaskbarMode", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'UserPreferencesMask' -Type Binary -Value ([byte[]](144,18,3,128,16,0,0,0))",
    ],
    disableScript: [
      "Remove-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'UserPreferencesMask'",
    ],
  },
  {
    id: "WPFTweaksTeredo",
    title: "Teredo - Disable",
    description: "Teredo network tunneling is an IPv6 feature that can cause additional latency, but may cause problems with some games.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", name: "DisabledComponents", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "netsh interface teredo set state disabled",
    ],
    disableScript: [
      "netsh interface teredo set state default",
    ],
  },
  {
    id: "WPFTweaksDisableNotifications",
    title: "System Tray Notifications & Calendar - Disable",
    description: "Disables all Notifications INCLUDING Calendar.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer", name: "DisableNotificationCenter", value: "1", type_: "DWord" },
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PushNotifications", name: "ToastEnabled", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksStorage",
    title: "Storage Sense - Disable",
    description: "Storage Sense deletes temp files automatically.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy", name: "01", value: "0", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksRightClickMenu",
    title: "Right-Click Menu Previous Layout - Enable",
    description: "Restores the classic context menu when right-clicking in File Explorer, replacing the simplified Windows 11 version.",
    category: "Advanced Tweaks",
    enableScript: [
      "New-Item -Path 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32' -Force -Value ''",
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Remove-Item -Path 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}' -Recurse -Confirm:$false -Force",
      "Write-Host 'Restarting explorer.exe...'",
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFTweaksDisableWarningForUnsignedRdp",
    title: "RDP Unsigned File Warnings - Disable",
    description: "Disables warnings shown when launching unsigned RDP files introduced with the latest Windows 10 and 11 updates.",
    category: "Advanced Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\Terminal Services\\Client", name: "RedirectionWarningDialogVersion", value: "1", type_: "DWord" },
      { path: "HKCU\\SOFTWARE\\Microsoft\\Terminal Server Client", name: "RdpLaunchConsentAccepted", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFTweaksDisableBitLocker",
    title: "BitLocker - Disable",
    description: "Disables BitLocker encryption on the main system drive.",
    category: "Essential Tweaks",
    requiresConfirmation: true,
    confirmTitle: "Disable BitLocker?",
    confirmMessage: "This will decrypt your system drive. The process may take several minutes depending on drive size. Your data will remain accessible during and after decryption.",
    enableScript: [
      "Disable-BitLocker -MountPoint $Env:SystemDrive",
    ],
    disableScript: [
      "Enable-BitLocker -MountPoint $Env:SystemDrive",
    ],
  },
];

export const presets: Preset[] = [
  {
    id: "simple",
    label: "Safe Start",
    description: "Low-risk privacy and usability controls for most PCs",
    icon: Zap,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksEndTaskOnTaskbar", "WPFTweaksConsumerFeatures"],
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "A practical performance-focused set without app removal",
    icon: Gauge,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksEndTaskOnTaskbar", "WPFTweaksConsumerFeatures", "WPFTweaksDisableBGapps", "WPFTweaksDisableFSO", "WPFTweaksStorage", "WPFTweaksDisableNotifications"],
  },
  {
    id: "performance",
    label: "Performance Focus",
    description: "More aggressive tuning while excluding app removal, BitLocker changes, and remote downloads",
    icon: Mountain,
    tweaks: ["WPFTweaksActivity", "WPFTweaksTelemetry", "WPFTweaksPowershell7Tele", "WPFTweaksEndTaskOnTaskbar", "WPFTweaksConsumerFeatures", "WPFTweaksDisableBGapps", "WPFTweaksDisableFSO", "WPFTweaksStorage", "WPFTweaksDisableNotifications", "WPFTweaksDisplay", "WPFTweaksHiber", "WPFTweaksTeredo"],
  },
];

export const categories = [...new Set(tweaks.map(t => t.category))];
