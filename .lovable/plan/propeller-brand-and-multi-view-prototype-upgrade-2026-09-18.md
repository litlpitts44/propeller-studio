# Propeller Brand and Multi-View Prototype Upgrade

## Outcome
Bring the workshop experience in line with the 2026 Propeller deck and turn each generated prototype into a robust, evidence-aware future-state package rather than a single workflow view.

## Brand update
- Replace the current charcoal/copper styling with the deck’s core system: white, deep navy, Propeller gold, coral, green, light blue, and cool gray.
- Use Gotham for interface/body typography and Adelle selectively for editorial emphasis, with close web-safe fallbacks when the licensed fonts are unavailable.
- Match the deck’s visual grammar: generous white space, crisp grids, bold black headings, small gold section labels, thin rules, flat color blocks, and restrained iconography.
- Remove the current condensed uppercase treatment where it conflicts with the deck’s sentence-case hierarchy.

## Stronger prototype package
Each generated version will preserve a structured snapshot with linked views:

1. **Overview** — objective, readiness, evidence-strength distribution, major gaps, and what changed since the prior version.
2. **Workflow** — ordered future-state phases with owner, participants, inputs/outputs, rules, decisions, measures, and confidence per step.
3. **RACI** — roles crossed with workflow phases, showing Responsible, Accountable, Consulted, and Informed assignments; unclear assignments are explicitly marked as assumptions.
4. **Decision & rule model** — decisions, governing rules, owners, triggers, and downstream workflow impact.
5. **Measures & risks** — success metrics, pain points addressed, assumptions, unresolved questions, and validation priorities.

## AI and confidence behavior
- Generate a structured prototype model from the full live understanding instead of only copying finding cards.
- Ground each element in transcript/document evidence and carry `Strong`, `Directional`, or `Assumed` status into every view.
- Never invent certainty: incomplete owners, RACI assignments, measures, or process links remain visibly unresolved.
- Generate at 60% readiness and improve future versions as more workshop evidence arrives.
- Preserve existing prototype versions so facilitators can compare iterations.

## Interaction
- Add view tabs inside a prototype for Overview, Workflow, RACI, Decisions & Rules, and Measures & Risks.
- Selecting a workflow phase reveals its linked roles, rules, decisions, evidence, and validation needs.
- Keep the current live transcript and live-understanding behavior unchanged.
- Ensure the denser matrices and diagrams remain usable on narrow screens through deliberate horizontal scrolling and fixed row/column structure.

## Technical details
- Extend the prototype data model with structured phases, RACI assignments, decision/rule links, metrics, risks, assumptions, evidence references, and version-change summaries.
- Add a dedicated AI generation function with a strict schema and validation; keep the 60% readiness gate.
- Render saved structured prototype data rather than recomputing it in the browser.
- Existing saved prototypes remain readable through a compatibility fallback.
- Verify generated and fallback prototypes at desktop and mobile sizes, including empty and partially evidenced states.
