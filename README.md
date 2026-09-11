# GM-Optimization

**Current source package: v0.4.2 — Focused Neon Reactor**

GM-Optimization is a Windows performance-control desktop application built with Tauri 2, Rust, React 19, TypeScript, and Vite.

## v0.4 visual direction
v0.4.2 uses the custom **Focused Neon Reactor** visual system: black/orange energy surfaces, a cinematic reactor, scan transitions, a custom frameless shell, and GM-specific control geometry. The focus pass deliberately removes competing ambient motion: the reactor is the dashboard's primary animated focal point while navigation, hardware information, actions, and history stay calmer. Motion is implemented primarily with CSS transform/opacity plus Framer Motion orchestration.

The dashboard reactor is driven by real tracked tweak state. GM does not fabricate CPU/FPS gains or fake optimization scores.

## Start on Windows
Right-click `START_GM_OPTIMIZATION.bat` and choose **Run as administrator**. The launcher checks Node.js, Rust/Cargo with the MSVC toolchain, Visual Studio C++ build tools, JavaScript dependencies, TypeScript, the Vite production bundle, and then starts `tauri dev`.

For validation without launching the app, run `CHECK_PROJECT.bat`.

## Project structure
- `src/` — React UI and Focused Neon Reactor motion system
- `src-tauri/` — Tauri/Rust native backend
- `docs/NEON_REACTOR_DESIGN.md` — Neon Reactor visual language
- `docs/FOCUSED_NEON_PRINCIPLES.md` — focus, density, and motion hierarchy rules
- `scripts/` — Windows setup and validation helpers

## Core product safety
GM tracks applied tweaks, preserves registry values where rollback is supported, keeps advanced/destructive actions out of guided presets, uses safer junk-cleaning targets, supports exclusions during interactive and scheduled cleaning, and provides recovery/restore tools.

## Windows production release

Run `BUILD_RELEASE.bat` from the project root to create an optimized x64 NSIS installer and portable executable. Final artifacts are copied into `release/` with SHA-256 hashes. See `docs/RELEASE_BUILD.md`.

## Development
```powershell
npm ci
npm run check
npm run build
npm run tauri:dev
```

A production release should also run `cargo fmt --check`, `cargo check`, and `npm audit` deliberately before signing/distribution.

### v0.4.2 developer-launch reliability

The Windows launcher now checks ports **1420/1421** before starting Tauri. It automatically stops stale GM/Vite Node processes that own those ports, while refusing to terminate unrelated applications. This prevents an old hidden-to-tray development session from causing Vite/HMR `Port already in use` failures.
