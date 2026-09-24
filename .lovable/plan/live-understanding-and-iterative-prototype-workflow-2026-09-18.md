# Live Understanding and Iterative Prototype Workflow

## Goal
Reframe the workshop screen around two connected outcomes: what the room is saying and what Propeller Studio is building from it. Keep the current professional facilitation style and make AI activity understandable without turning the product into a chatbot.

## Build

### 1. Live workshop view
- Keep room recording as an explicit facilitator action.
- Make the left panel a dedicated **Live workshop** feed with a prominent recording state and elapsed time.
- Show each completed audio segment immediately as a transcript entry while the next segment is being captured.
- Keep documents, notes, and artifacts available as supporting inputs without competing with the transcript.

### 2. AI understanding and confidence
- Rename the working interpretation area to **Live understanding**.
- Add a compact confidence legend:
  - **High** — explicitly stated in the workshop evidence.
  - **Medium** — strongly implied by the evidence.
  - **Low** — AI inference that needs validation.
- Keep evidence excerpts expandable and the existing confirm, edit, and dismiss controls.

### 3. Prototype readiness
- Add a visible 0–100% **Prototype readiness** score above the live understanding.
- Have the same analysis call assess readiness from evidence coverage, confidence, contradictions, and unresolved questions.
- Explain the current score with a short status and the most important blocker, rather than presenting an unexplained number.
- Update readiness whenever the live understanding updates.

### 4. AI Improvements
- Replace **Ask AI** with **AI Improvements**.
- When opened, identify the single highest-priority unresolved question based on the current captures and understanding.
- Offer 2–3 recommended answers grounded in the workshop, plus a fill-in option.
- Applying an answer adds it as a facilitator decision/input, which triggers a refreshed understanding and readiness score.

### 5. Blueprint and prototypes
- Organize the right side into two clear views:
  - **Live understanding** — the continuously evolving future-state blueprint.
  - **Prototypes** — versioned interactive outputs generated on demand from the current blueprint.
- Treat every generated prototype as a preserved version with timestamp and source blueprint version.
- Allow the facilitator to generate another version after new decisions or clarifications without overwriting prior versions.
- For this iteration, generate a practical interactive workflow prototype from the structured blueprint, with navigable process steps and role/rule/decision context.

## Technical details
- Extend the existing structured AI response with readiness score, readiness rationale, and primary blocker.
- Add a separate structured AI call for the highest-priority improvement question and suggested answers.
- Store readiness and generated prototype versions with the existing browser-persisted workshop record.
- Preserve existing interpretation history and upload/recording behavior.
- Keep all model calls server-side and use the existing streamed gateway pattern.
- Verify recording/transcript states, score updates, AI Improvements application, and prototype version switching at desktop and narrow widths.
