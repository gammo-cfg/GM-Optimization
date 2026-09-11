# One-click GitHub publishing

Run `PUBLISH_GITHUB_RELEASE.bat` from the root of your **cloned GitHub repository**.

It automatically:

1. Detects the current `origin` repository and branch.
2. Installs GitHub CLI with `winget` if it is missing.
3. Opens GitHub's official browser login on the first run if authentication is needed.
4. Fetches and rebases on the latest remote branch before publishing.
5. Stages all source changes with `git add -A` and creates a `Release vX.Y.Z` commit when needed.
6. Builds the production NSIS installer and portable executable using the existing GM release builder.
7. Pushes the source branch.
8. Creates and pushes the immutable `vX.Y.Z` Git tag.
9. Creates the GitHub Release and uploads the setup EXE, portable EXE, checksums, and build info.
10. On a safe re-run of the exact same commit/tag, refreshes the uploaded assets instead of duplicating the release.

## Version rule

The publisher reads the version from `package.json` and uses the tag `v<version>`.

A public release tag is **never force-moved**. If `v0.4.2` already exists on another commit, bump the app version before publishing the next release.

## Important

The `release/` directory is ignored by Git. Production binaries belong in GitHub Releases, not in the source repository history.

The first GitHub CLI login is interactive for security. After that, publishing is one click as long as your authentication remains valid.
