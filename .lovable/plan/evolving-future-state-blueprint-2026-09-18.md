# Evolving Future-State Blueprint

Enhance the existing interpretation layer into a general-purpose, evidence-led blueprint that evolves throughout any consulting workshop. Preserve the current visual design and prototype experience.

## What will change

### 1. Expand the blueprint model
- Replace the fixed nine-section interpretation with an extensible set of workshop categories: actors/roles, needs/outcomes, pain points, workflow stages, actions/handoffs, triggers, decision points, business rules, ownership/decision rights, exceptions/edge cases, inputs/outputs, metrics, agreed decisions, assumptions/hypotheses, and open questions.
- Categories remain optional; empty categories stay out of the interface.
- Keep existing saved workshops and prototypes readable by mapping their current findings into the expanded model.

### 2. Add evidence and lifecycle metadata
Each blueprint item will carry:
- **Source:** background material or live workshop, with the supporting capture reference and excerpt.
- **Interpretation:** observation, hypothesis, proposal, or confirmed decision.
- **Confidence:** high, medium, or low.
- **History:** first introduced and most recently changed timestamps.
- Preserve facilitator edits, confirmations, and dismissals across automatic updates.

### 3. Make updates evidence-aware
- Send capture IDs, source type, and timestamps into each interpretation run.
- Give explicit live-workshop statements precedence when they revise or override background context.
- Compare incoming items with the prior blueprint by stable identity, preserving history instead of recreating items.
- Never promote ambiguous language to a confirmed decision.
- Convert meaningful conflicts, unsupported ownership, and unclear decisions into visible open questions rather than silently resolving them.

### 4. Reframe Live understanding
Organize the existing interpretation screen into four clear views:
- **Known context** — background evidence and established observations.
- **Emerging future state** — hypotheses, proposals, and developing design elements.
- **Confirmed decisions** — only explicit decisions or facilitator-confirmed items.
- **Still unresolved** — open questions, conflicts, assumptions needing validation, and stale evidence.

Within each view, retain the relevant blueprint category headings, evidence expansion, confidence cues, and facilitator controls. Add compact source and interpretation labels so users can scan where each item came from and how settled it is.

### 5. Keep prototype generation aligned
- Feed the richer blueprint metadata into prototype generation.
- Ensure workflow, RACI, rules, decisions, measures, and risks distinguish confirmed evidence from proposals and assumptions.
- Keep prototype availability at 60% readiness, while recalculating readiness using coverage, evidence quality, conflicts, and unresolved high-impact questions.

## Technical details
- Extend the existing `Finding` and section types rather than introducing a second competing interpretation model.
- Add normalization for older browser-saved workshops that lack the new metadata.
- Update the structured AI response schema and prompt with explicit precedence and ambiguity rules.
- Update merge logic to preserve stable IDs and timestamps, record changed items, and route conflicts to unresolved questions.
- Keep automatic interpretation after new live transcript segments and existing version history unchanged.
- Verify migration, live re-interpretation, manual edits/confirmation, conflict handling, prototype generation, and desktop/mobile layouts.
