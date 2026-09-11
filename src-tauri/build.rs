use std::path::PathBuf;

fn ensure_frontend_dist_exists() {
    // `tauri::generate_context!()` validates `build.frontendDist` at compile time,
    // including during `tauri dev`. Vite serves the dev UI from `devUrl`, so a
    // tiny placeholder is enough until `npm run build` replaces it for releases.
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is unavailable"));
    let dist_dir = manifest_dir.join("..").join("dist");
    std::fs::create_dir_all(&dist_dir).expect("failed to create frontend dist directory");

    let index = dist_dir.join("index.html");
    if !index.exists() {
        std::fs::write(
            index,
            "<!doctype html><html><head><meta charset=\"utf-8\"><title>GM-Optimization</title></head><body></body></html>",
        )
        .expect("failed to create frontend dist placeholder");
    }
}

fn main() {
    ensure_frontend_dist_exists();
    let mut windows = tauri_build::WindowsAttributes::new();

    // Only require admin for release builds; dev builds run at user level
    let profile = std::env::var("PROFILE").unwrap_or_default();
    if profile == "release" {
        windows = windows.app_manifest(r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#);
    }

    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run build script");
}
