GM-Optimization GitHub Publisher v1.1.3

Fixes:
- Removes fragile node -e quoting from package-lock version validation.
- Reads the root package-lock version directly from the JSON header.
- Remains compatible with Windows PowerShell 5.1.

Install:
1. Copy PUBLISH_GITHUB_RELEASE.bat into the GM-Optimization project root.
2. Copy scripts\publish-github-release.ps1 into the project scripts folder.
3. Keep the existing .git folder that v1.1.2 already created.
4. Run PUBLISH_GITHUB_RELEASE.bat.
