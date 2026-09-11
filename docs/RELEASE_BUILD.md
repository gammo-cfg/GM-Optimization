# GM-Optimization Windows Release Build

## Build

From the project root, run:

`BUILD_RELEASE.bat`

The script performs a clean dependency install, TypeScript validation, a Tauri release build, and NSIS packaging.

## Outputs

Successful builds are copied to the project `release` folder:

- `GM-Optimization-v<version>-Setup-x64.exe` — normal Windows installer.
- `GM-Optimization-v<version>-Portable-x64.exe` — unpackaged executable for direct testing.
- `SHA256SUMS.txt` — SHA-256 hashes for both binaries.
- `BUILD_INFO.txt` — build environment summary.

The original Tauri artifacts remain under `src-tauri/target/release/`.

## Public distribution

The release script does not invent or embed a signing identity. Unsigned Windows apps can trigger Microsoft Defender SmartScreen when downloaded from the internet. Configure Windows code signing before broad public distribution.

## Versioning

Before making a new public version, keep these values synchronized:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

The existing project release tooling keeps the current application version at 0.4.2.
