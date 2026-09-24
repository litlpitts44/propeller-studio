# Propeller Studio

AI-assisted workshop capture, future-state understanding, and prototype iteration.

## Source and stack

Imported from the original Lovable source archive. Built with React, TypeScript, TanStack Start, Vite, and Tailwind CSS. Application behavior and original assets are preserved. Product branding, package identity, and documentation have been updated to Propeller Studio; Lovable template identifiers and the existing browser storage key remain unchanged.

Canonical repository: https://github.com/litlpitts44/propeller-studio

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

## Platform compatibility

GitHub is the canonical source. The `.lovable/` directory contains passive project metadata and historical implementation plans; the application does not read these files at runtime. They are retained to preserve context and make it easier to reconnect the repository to Lovable later, but other hosts may ignore them safely.

The current source still uses two Lovable services: `@lovable.dev/vite-tanstack-config` for its build configuration and the Lovable AI gateway for interpretation and transcription. Removing those runtime dependencies requires a separate portability change: standard TanStack/Vite configuration plus a provider-neutral AI adapter. Until that work lands, the repository is portable source code but the complete AI-enabled application is not yet provider-independent.

## Ongoing work

Pull `main` before each change, use a short-lived branch, validate the change, commit and push, then review and merge a pull request. Do not force-push or rewrite published history; see AGENTS.md for the Lovable sync constraint.
