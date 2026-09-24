# Propeller Studio

AI-assisted workshop capture, future-state understanding, and prototype iteration.

## Source and stack

Imported from the original Lovable source archive. Built with React, TypeScript, TanStack Start, Vite, and Tailwind CSS. Application behavior and original assets are preserved. Product branding, package identity, and documentation have been updated to Propeller Studio; Lovable template identifiers and the existing browser storage key remain unchanged.

Intended canonical repository: https://github.com/liltPitts44/propeller-ws-agent
GitHub access and remote contents have not yet been verified.

## Run locally

Use a current Node.js LTS release and Bun (the source includes bun.lock).

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local address printed by the development server.

AI interpretation and transcription require LOVABLE_API_KEY in the server process environment. Obtain it through your approved Lovable setup. The empty .env.example documents the variable; copying it to .env alone is not a guarantee that every hosting runtime will load it. Never expose the key through a VITE_ variable or commit a populated environment file.

```sh
bun run lint
bun run build
```

The preparation pass checked archive integrity, rename coverage, and package identity consistency. Dependencies were not installed, and the application build and live AI calls have not been tested here.

## Data and hosting

Workshops are saved in browser localStorage under workshop-interpreter:v1. They are specific to that browser and origin; a GitHub upload does not back them up or make them shared.

AI calls run through server functions using the Lovable AI gateway. This is not a static-only site; uploading to GitHub stores the code and does not deploy a working application. The supplied build configuration defaults to a Cloudflare target via Lovable's configuration package.

## Ongoing work

Follow GITHUB-UPLOAD.md for the initial upload. Once connected, pull the repository before each change, use a short-lived branch, validate the change, commit and push, then review and merge a pull request. Preserve the remote's existing default branch. Use main for a new empty repository. Do not force-push or rewrite published history; see AGENTS.md for the Lovable sync constraint.
