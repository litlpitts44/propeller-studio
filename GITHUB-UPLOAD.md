# GitHub repository and ongoing workflow

The source is stored in https://github.com/litlpitts44/propeller-studio. The initial manual upload is complete; the instructions below remain as a recovery reference.

## Before uploading

1. Unzip propeller-studio-github-ready.zip. Open the extracted propeller-ws-agent folder.
2. Open https://github.com/litlpitts44/propeller-studio while signed into your GitHub account.
3. Inspect the existing files and default branch first. Do not replace existing code without comparing it.

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

## Connected workflow

The remote is https://github.com/litlpitts44/propeller-studio.git. GitHub is the canonical source, so future work must begin from its latest branch history rather than re-importing the original ZIP.

For future changes: fetch/pull the default branch, create a feature branch, edit, run relevant checks, commit, push, and open a pull request. Use the existing default branch, or main for a new repository. Never force-push. Respect Lovable's connected branch and verify builds before merging there.

Authentication belongs in the GitHub connector/browser sign-in flow or `gh auth login`, never in chat.

Future work should start from the latest `main` branch, use a focused feature branch, and land through a reviewed pull request.
