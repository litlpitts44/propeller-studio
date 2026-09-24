# Manual GitHub upload and ongoing workflow

## Before uploading

1. Unzip propeller-studio-github-ready.zip. Open the extracted propeller-ws-agent folder.
2. Open https://github.com/liltPitts44/propeller-ws-agent while signed into your GitHub account.
3. Inspect the existing files and default branch first. If the repository does not exist, create it under liltPitts44 (private is a sensible initial choice). Do not replace existing code without comparing it.

## Browser upload

Upload the extracted files and folders, not the ZIP and not the enclosing propeller-ws-agent folder. package.json, README.md, src/, and public/ must appear at the repository root.

On macOS, press Command-Shift-Period in Finder to show hidden files. Include .gitignore, .env.example, .prettierrc, .prettierignore, and .lovable/. Do not add a populated .env file. Browser uploads do not enforce .gitignore exclusions.

GitHub limits browser uploads to 100 files per batch and 25 MiB per file. This package has more than 100 files, so use two batches:

1. Upload src/ alone, preserving its folder structure.
2. Upload all remaining top-level files and folders, including hidden files.

For an EMPTY repository: choose the uploading-an-existing-file link, upload the first batch, and commit to main. Add the second batch through Add file > Upload files and commit to the same branch. Wait until both batches are present before trying to build or enabling deployment.

For an EXISTING repository: create an import/workshop-source branch from its current default branch first. Upload both batches to that branch. Uploading matching paths replaces them on the branch, so review the diff before opening and merging a pull request. Keep unrelated files. If existing application files conflict or the purpose of a file is unclear, stop and compare before merging.

Suggested commit messages: Import workshop application source; Add workshop configuration, assets, and setup documentation.

Verify package.json is at the root, src/routes exists, and the hidden configuration files are included. Review both commits before merging. If browser upload rejects hidden files, use GitHub Desktop instead; do not omit required configuration.

Official instructions: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## GitHub Desktop alternative

Sign in using GitHub Desktop's browser flow, clone the target repository, and create import/workshop-source from the existing default branch. For a truly empty repository, use main. Copy the extracted contents into the clone without copying any .git directory. Compare existing same-name files before replacing them. Review all changes in Desktop, commit, and push the branch. Use a pull request for an existing repository.

## After IT enables the connection

The remote should be https://github.com/liltPitts44/propeller-ws-agent.git. The assistant must inspect the remote and branch history before syncing this local copy; if the manual upload is already complete, clone or fetch that history rather than pushing an unrelated initial history.

For future changes: fetch/pull the default branch, create a feature branch, edit, run relevant checks, commit, push, and open a pull request. Use the existing default branch, or main for a new repository. Never force-push. Respect Lovable's connected branch and verify builds before merging there.

Verify access with a small real documentation change on a temporary branch, push it, and confirm the same commit is present remotely. This verification is pending GitHub access. Authentication belongs in the connector/browser sign-in flow or gh auth login, never in chat.

GitHub becomes canonical after the first successful upload. Future work should start from its latest state rather than re-importing the original ZIP.
