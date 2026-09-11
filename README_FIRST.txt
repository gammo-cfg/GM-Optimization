GM-Optimization GitHub Publisher
================================

Copy these files/folders into the ROOT of your existing cloned GM-Optimization GitHub repository:

  PUBLISH_GITHUB_RELEASE.bat
  scripts\publish-github-release.ps1
  docs\GITHUB_PUBLISH.md

Your repository should already contain:

  BUILD_RELEASE.bat
  scripts\build-release.ps1
  package.json
  src-tauri\...
  .git\...

Then double-click PUBLISH_GITHUB_RELEASE.bat.

First run:
- Installs GitHub CLI automatically with winget if needed.
- Opens official GitHub browser login if needed.

Every run:
- Pulls latest remote changes safely.
- Commits all source changes.
- Builds the Windows release.
- Pushes source code.
- Pushes the vX.Y.Z tag from package.json.
- Creates the GitHub Release and uploads installer/portable/checksums.

Important: before a NEW release, bump the version in package.json, Tauri config, and Cargo.toml. The publisher verifies they match and never force-moves an existing public release tag.
