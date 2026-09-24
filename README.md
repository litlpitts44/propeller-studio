# Propeller Studio

AI-assisted workshop capture, future-state understanding, and prototype iteration.

## Source and stack

Built with React, TypeScript, TanStack Start, Vite, Tailwind CSS, and the OpenAI API. The repository is the platform-independent baseline for Propeller Studio. It began as a Lovable export, but the application build and AI features no longer depend on Lovable services.

Canonical repository: https://github.com/litlpitts44/propeller-studio

## Run locally

Use a current Node.js LTS release and Bun (the source includes bun.lock).

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local address printed by the development server.

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` to an OpenAI Platform API key. A ChatGPT subscription does not supply an API key or API credits. The text and transcription models can be changed with the optional variables shown in `.env.example`. Never expose the key through a `VITE_` variable or commit a populated environment file.

```sh
bun run lint
bun run build
```

After changing dependencies or configuration, run both checks before opening a pull request.

## Data and hosting

Workshops are saved in browser localStorage under workshop-interpreter:v1. They are specific to that browser and origin; a GitHub upload does not back them up or make them shared.

AI calls run through server functions using the OpenAI Responses and transcription APIs. This is not a static-only site: a deployment needs a Node-compatible server runtime and the server-side environment variables. `bun run build` creates a Nitro server bundle in `.output/`; start it with `bun run start`.

## Platform compatibility

GitHub is the canonical source. The `.lovable/` directory contains passive project metadata and historical implementation plans; the application does not read these files at build time or runtime. Other hosts may ignore the directory safely.

To use Lovable later, connect this GitHub repository as a Lovable project and configure the same `OPENAI_API_KEY` secret in Lovable's server environment. The standard TanStack/Vite configuration stays in place, so hosting the project through Lovable should require only platform settings rather than a fork of the application. The retained `.lovable/` files preserve the original project context but are not required to run the app.

## Ongoing work

Pull `main` before each change, use a short-lived branch, validate the change, commit and push, then review and merge a pull request. Avoid rewriting published history, especially if the repository is later connected to a visual builder or deployment service.
