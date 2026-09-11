GM-Optimization GitHub Publisher v1.0.1 - PowerShell 5.1 encoding fix

Replace these files in the root of your existing GM-Optimization Git clone:
  PUBLISH_GITHUB_RELEASE.bat
  scripts\publish-github-release.ps1

Then run PUBLISH_GITHUB_RELEASE.bat again.

Fixes:
- Publisher PowerShell source is now ASCII-only, preventing Windows PowerShell 5.1
  from misreading UTF-8 punctuation as quote characters.
- Added a PowerShell syntax preflight in the BAT before any Git/GitHub mutation.
- Release notes still use normal Markdown but only ASCII punctuation in script source.
