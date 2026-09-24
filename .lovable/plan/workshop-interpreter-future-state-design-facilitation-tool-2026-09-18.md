# Workshop Interpreter — Future-State Design Facilitation Tool

A working tool for consultants running future-state design workshops: capture what happens in the room, and get a structured, editable interpretation of it alongside.

## Screens

**1. Workshop dashboard (home)**
- List of workshops as cards/rows: name, objective snippet, last updated, number of captures, interpretation version count.
- "New workshop" button. Empty state with a short explanation.

**2. New workshop (lightweight, single panel — not a wizard of settings)**
- Workshop name
- Objective (what future state are we designing?)
- Optional: background documents (drag & drop, text/markdown/PDF-as-text)
- Optional: participants (name + role chips)
- One "Create workshop" button that drops straight into the workshop screen.

**3. Workshop screen (the main surface) — two-column layout**

```text
+------------------------------+-------------------------------------------+
| WORKSHOP INPUT               | AI UNDERSTANDING                          |
|                              |                                           |
| Transcript                   | People / Roles                            |
| Documents                    |   Hiring Manager, HR, New Employee        |
| Facilitator notes            |                                           |
| Workshop artifacts           | Emerging Process                          |
| ---------------------------- |   Manager initiates -> HR validates ->    |
| transcript + notes appear    |   IT provisions -> Employee starts        |
| here as they come in,        |                                           |
| timestamped and editable     | Rules we're hearing                       |
|                              |   IT needs 7 days notice                  |
|                              |                                           |
|                              | Decisions made                            |
|                              |   Manager owns initiation                 |
|                              |                                           |
| [ paste / type / drop file ] | Needs · Pain points · Metrics ·           |
|                              | Assumptions · Open questions              |
+------------------------------+-------------------------------------------+
```

- **Left — Workshop Input.** Four clearly labelled input types along the top: transcript, documents, facilitator notes, workshop artifacts (images). Below them, the captured content appears as a running, timestamped list that the facilitator can edit or remove. A single paste/type/drop area at the bottom feeds it.
- **Right — AI Understanding.** Not a chat. Findings appear and update on their own as input arrives, grouped into: People / Roles, Needs, Emerging Process, Rules we're hearing, Decisions made, Pain points, Metrics, Assumptions, Open questions. Process renders as a left-to-right step chain, roles as a compact list, everything else as short evidenced statements.
- Each finding shows its supporting excerpt on hover/expand and can be edited, confirmed, or dismissed. New items since the last update are briefly highlighted so the facilitator can see understanding forming in real time.
- Analysis triggers automatically shortly after new input settles — no "Interpret" button as the primary action; a manual refresh exists as a secondary control.
- An "Ask AI" affordance lives in the header as a small side panel for ad-hoc questions about the workshop. It is deliberately secondary and never the centerpiece.
- Header bar: workshop name, objective (inline editable), version selector, live "understanding updating…" status.

**4. History / versioning**
- Every interpretation run is saved as a version with a timestamp and the inputs it was based on.
- A version dropdown in the workshop header lets the user view any earlier interpretation read-only, compare counts per section against the current one, and restore an earlier version as the working one.
- Manual edits and confirm/dismiss actions apply to the current working version.

## AI behaviour

- One server-side analysis call takes the objective, all background documents, and the full input feed, and returns a structured result for all nine sections at once.
- Each finding carries: title, detail, confidence (high/medium/low), and the source excerpt it was derived from.
- Runs are incremental: user-confirmed and user-edited findings are preserved, new ones are flagged "new", and findings no longer supported are marked "no longer evidenced" rather than silently deleted.
- Sections stream in as they resolve so the panel visibly fills out while the workshop runs; clear, readable error states (including credit exhaustion) surfaced in the panel — never a silent failure.


## Data

- Stored in the browser for now (no sign-in). Workshops, captures, documents, interpretation versions all persist locally per device.
- Documents are read as text client-side; only their text is sent for analysis.

## Design direction

Professional consulting-tool aesthetic: dense but calm, neutral slate/ink base with a single restrained accent for confidence and status, structured typographic hierarchy, tabular data feel, no chat bubbles or assistant avatars. Full design system in the theme tokens — no hardcoded colors.

## Technical notes

- TanStack Start routes: `/` (dashboard), `/workshops/new`, `/workshops/$workshopId`.
- Persistence: a typed local-storage store with a small repository layer, so swapping in Lovable Cloud later is a single-layer change.
- AI: Lovable AI Gateway via a server function using `openai/gpt-6-astra` on the Responses API, streaming, with a strict structured-output schema covering the nine sections.
- Documents: text extraction in the browser (plain text / markdown now; PDF text where available).

## Not included in this version

- Accounts and cross-device sync
- Export / report generation
- Real-time multi-facilitator collaboration
