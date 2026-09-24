import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SECTION_KEYS, SECTION_LABELS, SECTION_HINTS } from "./workshop-types";

const CaptureInput = z.object({
  id: z.string(),
  kind: z.enum(["transcript", "document", "note", "artifact"]),
  title: z.string(),
  text: z.string(),
  createdAt: z.number(),
});

const InterpretInput = z.object({
  objective: z.string(),
  name: z.string(),
  participants: z.array(z.object({ name: z.string(), role: z.string() })),
  captures: z.array(CaptureInput),
  existing: z.array(z.object({
    semanticKey: z.string(), section: z.string(), title: z.string(), detail: z.string(), interpretationType: z.string(), sourceOrigin: z.string(),
  })),
  openQuestions: z.array(z.object({
    key: z.string(), question: z.string(), status: z.string(), impact: z.string(),
    answer: z.string().optional(), assumption: z.string().optional(),
  })).default([]),
});

const AskInput = z.object({
  objective: z.string(),
  question: z.string(),
  captures: z.array(CaptureInput),
});

const ImproveInput = z.object({
  objective: z.string(),
  captures: z.array(CaptureInput),
  findings: z.array(
    z.object({ section: z.string(), title: z.string(), detail: z.string(), confidence: z.string() }),
  ),
});

const PrototypeInput = z.object({
  objective: z.string(),
  participants: z.array(z.object({ name: z.string(), role: z.string() })),
  findings: z.array(z.object({
    section: z.string(), title: z.string(), detail: z.string(), confidence: z.string(), excerpt: z.string(),
    sourceOrigin: z.string(), interpretationType: z.string(),
  })),
  assumptions: z.array(z.string()).default([]),
  previousName: z.string(),
  strategy: z.object({
    primary: z.string(),
    primaryLabel: z.string(),
    rationale: z.string(),
    tests: z.array(z.string()).default([]),
    cannotTest: z.array(z.string()).default([]),
    perspectives: z.array(z.object({ label: z.string(), role: z.string() })).default([]),
  }).optional(),
});

const StrategyInput = z.object({
  objective: z.string(),
  prototypeKind: z.string().default(""),
  findings: z.array(z.object({
    section: z.string(), title: z.string(), detail: z.string(), confidence: z.string(),
    interpretationType: z.string(),
  })),
});

const findingItem = {
  type: "object",
  additionalProperties: false,
  properties: {
    semanticKey: { type: "string", description: "Stable lowercase concept key such as request-approval; reuse it when the same concept changes wording" },
    title: { type: "string", description: "Short label, a few words" },
    detail: { type: "string", description: "One sentence of substance" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    excerpt: {
      type: "string",
      description: "Short verbatim quote from the input that supports this",
    },
    sourceOrigin: { type: "string", enum: ["background", "live"] },
    sourceCaptureIds: { type: "array", items: { type: "string" } },
    interpretationType: { type: "string", enum: ["observation", "hypothesis", "proposal", "confirmedDecision"] },
  },
  required: ["semanticKey", "title", "detail", "confidence", "excerpt", "sourceOrigin", "sourceCaptureIds", "interpretationType"],
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    SECTION_KEYS.map((key) => [
      key,
      { type: "array", description: SECTION_HINTS[key], items: findingItem },
    ]),
  ),
  required: [...SECTION_KEYS],
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    findings: schema,
    readiness: {
      type: "object",
      additionalProperties: false,
      properties: {
        score: { type: "number", minimum: 0, maximum: 100 },
        status: { type: "string", description: "A short 2-5 word readiness label" },
        rationale: { type: "string", description: "One sentence explaining the score" },
        blocker: { type: "string", description: "The single biggest gap before prototyping" },
        prototypeKind: { type: "string", description: "The kind of future state being designed, e.g. workflow redesign, dashboard, operating model, customer journey, governance model, KPI framework" },
        requirements: {
          type: "array",
          description: "The 3-6 things THIS kind of prototype actually needs, judged met or not",
          items: {
            type: "object", additionalProperties: false,
            properties: { label: { type: "string" }, met: { type: "boolean" }, note: { type: "string" } },
            required: ["label", "met", "note"],
          },
        },
        questions: {
          type: "array",
          description: "Unresolved questions triaged by whether they truly prevent a coherent prototype",
          items: {
            type: "object", additionalProperties: false,
            properties: {
              key: { type: "string", description: "Stable lowercase hyphen key for this question; reuse it across runs" },
              question: { type: "string" },
              impact: { type: "string", enum: ["blocking", "important", "defer"] },
              why: { type: "string", description: "One short sentence on why this matters for this prototype kind" },
            },
            required: ["key", "question", "impact", "why"],
          },
        },
      },
      required: ["score", "status", "rationale", "blocker", "prototypeKind", "requirements", "questions"],
    },
  },
  required: ["findings", "readiness"],
};

const improvementSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    question: { type: "string" },
    why: { type: "string" },
    answers: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
  },
  required: ["question", "why", "answers"],
};

const ARCHETYPE_ENUM = [
  "workflowSimulator", "journeyExperience", "serviceExperience", "decisionRights", "governanceRhythm",
  "dashboardDecisionTool", "digitalExperience", "scenarioSimulator", "roleWorkspace",
];

const strategySchema = {
  type: "object", additionalProperties: false,
  properties: {
    primary: { type: "string", enum: ARCHETYPE_ENUM, description: "The single most useful interactive representation for testing this future state" },
    rationale: { type: "string", description: "Two or three sentences on why this format fits what the workshop is designing" },
    tests: { type: "array", description: "The parts of the blueprint this prototype will genuinely test", items: { type: "string" } },
    cannotTest: { type: "array", description: "Important elements this format cannot meaningfully test", items: { type: "string" } },
    perspectives: {
      type: "array",
      description: "Additional perspectives inside the SAME prototype when a hybrid better represents the future state. Empty when one archetype is enough.",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          archetype: { type: "string", enum: ARCHETYPE_ENUM },
          role: { type: "string", description: "What this perspective contributes inside the single prototype" },
        },
        required: ["archetype", "role"],
      },
    },
  },
  required: ["primary", "rationale", "tests", "cannotTest", "perspectives"],
};

const confidence = { type: "string", enum: ["high", "medium", "low"] };
const modelItemSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, detail: { type: "string" }, owner: { type: "string" },
    trigger: { type: "string" }, phases: { type: "array", items: { type: "string" } },
    confidence, evidence: { type: "string" },
  },
  required: ["title", "detail", "owner", "trigger", "phases", "confidence", "evidence"],
};
const prototypeSchema = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string" }, changeSummary: { type: "string" },
    gaps: { type: "array", items: { type: "string" } },
    phases: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: {
        title: { type: "string" }, summary: { type: "string" }, owner: { type: "string" },
        participants: { type: "array", items: { type: "string" } }, input: { type: "string" }, output: { type: "string" },
        rules: { type: "array", items: { type: "string" } }, decisions: { type: "array", items: { type: "string" } },
        measures: { type: "array", items: { type: "string" } }, confidence, evidence: { type: "string" },
      },
      required: ["title", "summary", "owner", "participants", "input", "output", "rules", "decisions", "measures", "confidence", "evidence"],
    } },
    raci: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: { role: { type: "string" }, phase: { type: "string" }, responsibility: { type: "string", enum: ["R", "A", "C", "I", "?"] }, confidence },
      required: ["role", "phase", "responsibility", "confidence"],
    } },
    rules: { type: "array", items: modelItemSchema }, decisions: { type: "array", items: modelItemSchema },
    metrics: { type: "array", items: modelItemSchema }, risks: { type: "array", items: modelItemSchema },
    assumptions: { type: "array", items: modelItemSchema }, questions: { type: "array", items: modelItemSchema },
  },
  required: ["summary", "changeSummary", "gaps", "phases", "raci", "rules", "decisions", "metrics", "risks", "assumptions", "questions"],
};

function buildContext(data: z.infer<typeof InterpretInput>) {
  const participants = data.participants.length
    ? data.participants.map((p) => `- ${p.name} (${p.role})`).join("\n")
    : "- not stated";
  const captures = data.captures.length
    ? data.captures
        .map((c, i) => `### ${i + 1}. [capture:${c.id}] ${c.kind.toUpperCase()} — ${c.title} — ${new Date(c.createdAt).toISOString()}\n${c.text}`)
        .join("\n\n")
    : "(no input captured yet)";
  const existing = data.existing.length
    ? data.existing.map((e) => `- [${e.semanticKey}] [${e.section}/${e.interpretationType}/${e.sourceOrigin}] ${e.title}: ${e.detail}`).join("\n")
    : "(none yet)";
  return `# Workshop: ${data.name}\n\n## Objective (future state being designed)\n${
    data.objective || "not stated"
  }\n\n## Participants\n${participants}\n\n## Workshop input\n${captures}\n\n## Findings already on the board\n${existing}\n\n## Readiness questions already triaged (reuse these keys)\n${
    data.openQuestions.length
      ? data.openQuestions.map((q) => `- [${q.key}] (${q.impact}/${q.status}) ${q.question}${q.answer ? ` — resolved: ${q.answer}` : ""}${q.assumption ? ` — working assumption: ${q.assumption}` : ""}`).join("\n")
      : "(none yet)"
  }`;
}

const SYSTEM = `You are the analyst behind a consulting workshop facilitation tool. You continuously build a structured understanding of the FUTURE STATE being designed, from transcripts, documents, facilitator notes and artifact descriptions.

Rules:
- Ground every item in the supplied input. Never invent actors, rules, decisions or metrics.
- Keep titles terse (2-6 words). Details are one plain sentence a consultant would say out loud.
- Use only relevant categories. Empty arrays are expected when a category does not apply.
- "process" contains ordered workflow stages; "actionsHandoffs" contains actions and transfers between actors; "triggers" contains starting or advancing events; "decisionPoints" contains choices in the flow.
- "ownership" contains accountability, authority and decision rights; "exceptions" contains edge cases; "inputsOutputs" contains stage inputs and outputs.
- "decisions" contains only choices explicitly agreed by the group. Ambiguous discussion is a proposal or hypothesis, never a confirmedDecision.
- "questions" are unresolved items, phrased as questions.
- sourceOrigin is background only when support comes exclusively from a document or pre-work artifact. Transcript and facilitator-note evidence is live.
- sourceCaptureIds contains every supporting capture id. Never invent an id.
- interpretationType: observation = stated context; hypothesis = unverified belief; proposal = a future-state option under discussion; confirmedDecision = an explicit agreement only.
- Live workshop evidence takes precedence when it explicitly changes or overrides background material. Describe the new position and cite the live capture.
- If evidence conflicts and the live workshop has not explicitly resolved it, do not choose a side. Add a concise item to questions that names the conflict.
- Reuse the exact title of a finding already on the board when the input still supports it, so it is not duplicated.
- semanticKey is a stable lowercase identifier for the underlying concept. Reuse its existing semanticKey even if wording changes.
- confidence: high = stated explicitly, medium = strongly implied, low = inferred.
- excerpt must be a short verbatim fragment from the input.
- Return nothing for a section when the input does not support it. Empty arrays are correct and expected early in a workshop.
- readiness.prototypeKind names the kind of future state being designed (workflow redesign, dashboard, operating model, customer journey, governance model, service design, KPI framework, decision-rights model, ...). Infer it from the objective and the evidence.
- readiness.requirements lists only what THAT kind of prototype genuinely needs, 3-6 items, each judged met or not with a one-line note. A workflow prototype needs roles, primary stages, major handoffs and key rules, but not final KPI definitions. A dashboard prototype needs metrics and users, but not detailed exception workflows. Do not apply a generic checklist.
- readiness.questions triages unresolved questions against those requirements. Most questions are NOT blocking. Use "blocking" only when the prototype cannot represent the future state coherently without an answer; "important" when a reasonable assumption can carry the next iteration; "defer" when the next prototype iteration does not need it. Typically at most one to three blocking questions.
- Each question carries a stable lowercase hyphen key. Reuse the key of a question already triaged rather than inventing a new one. Do not re-raise a question the facilitator already resolved, assumed or deferred unless new evidence reopens it.
- "why" explains in one short sentence what the prototype cannot express until this is answered.
- Assess readiness score 0-100 consistent with that triage: open blocking questions keep it low; only assumption-level gaps keep it mid; a coherent, evidenced design scores high. readiness.status is a candid short label, rationale explains it in one sentence, blocker names the single highest-impact gap.
- Write in json.`;

async function callAI(body: Record<string, unknown>): Promise<string> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI is not configured. Set OPENAI_API_KEY on the server.");
  const baseUrl = (process.env["OPENAI_BASE_URL"] || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env["OPENAI_TEXT_MODEL"] || "gpt-6-sol";

  const res = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ ...body, model, stream: true }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401)
      throw new Error("The OpenAI API key is missing or invalid.");
    if (res.status === 429)
      throw new Error("The AI service is busy right now. Try again in a moment.");
    throw new Error(`Analysis failed (${res.status}). ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("Analysis returned no response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let completed = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          completed = evt.response.output_text;
        }
      } catch {
        /* ignore keepalive / partial frames */
      }
    }
  }

  return out || completed;
}

export const interpretWorkshop = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InterpretInput.parse(input))
  .handler(async ({ data }) => {
    const text = await callAI({
      instructions: SYSTEM,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${buildContext(data)}\n\nReturn the current structured understanding as json.`,
            },
          ],
        },
      ],
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "workshop_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    });

    if (!text.trim()) throw new Error("The analysis came back empty. Try again.");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error("The analysis came back in an unexpected shape. Try again.");
    }

    const rawFindings = parsed["findings"] as Record<string, unknown> | undefined;
    const validCaptureIds = new Set(data.captures.map((capture) => capture.id));
    const result: Record<
      string,
      { semanticKey: string; title: string; detail: string; confidence: string; excerpt: string; sourceOrigin: string; sourceCaptureIds: string[]; interpretationType: string }[]
    > = {};
    for (const key of SECTION_KEYS) {
      const value = rawFindings?.[key];
      result[key] = Array.isArray(value)
        ? value
            .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
            .map((v) => ({
              semanticKey: String(v["semanticKey"] ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120),
              title: String(v["title"] ?? "").slice(0, 120),
              detail: String(v["detail"] ?? "").slice(0, 400),
              confidence: ["high", "medium", "low"].includes(String(v["confidence"]))
                ? String(v["confidence"])
                : "medium",
              excerpt: String(v["excerpt"] ?? "").slice(0, 400),
              sourceOrigin: v["sourceOrigin"] === "background" ? "background" : "live",
              sourceCaptureIds: Array.isArray(v["sourceCaptureIds"])
                ? v["sourceCaptureIds"].map(String).filter((id) => validCaptureIds.has(id)).slice(0, 12)
                : [],
              interpretationType: ["observation", "hypothesis", "proposal", "confirmedDecision"].includes(String(v["interpretationType"]))
                ? String(v["interpretationType"])
                : "observation",
            }))
            .filter((v) => v.title.length > 0)
        : [];
    }
    const rawReadiness = parsed["readiness"] as Record<string, unknown> | undefined;
    const score = Math.max(0, Math.min(100, Math.round(Number(rawReadiness?.["score"] ?? 0))));
    const rawRequirements = rawReadiness?.["requirements"];
    const requirements = Array.isArray(rawRequirements)
      ? rawRequirements
          .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
          .map((v) => ({ label: String(v["label"] ?? "").slice(0, 80), met: Boolean(v["met"]), note: String(v["note"] ?? "").slice(0, 200) }))
          .filter((v) => v.label.length > 0)
          .slice(0, 8)
      : [];
    const rawQuestions = rawReadiness?.["questions"];
    const seenKeys = new Set<string>();
    const questions = Array.isArray(rawQuestions)
      ? rawQuestions
          .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
          .map((v) => {
            const question = String(v["question"] ?? "").slice(0, 240);
            const key = (String(v["key"] ?? "") || question).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
            return {
              key,
              question,
              impact: (["blocking", "important", "defer"].includes(String(v["impact"])) ? String(v["impact"]) : "important") as "blocking" | "important" | "defer",
              why: String(v["why"] ?? "").slice(0, 240),
            };
          })
          .filter((v) => {
            if (!v.question || !v.key || seenKeys.has(v.key)) return false;
            seenKeys.add(v.key);
            return true;
          })
          .slice(0, 16)
      : [];
    return {
      findings: result,
      readiness: {
        score,
        status: String(rawReadiness?.["status"] ?? "Early discovery").slice(0, 80),
        rationale: String(rawReadiness?.["rationale"] ?? "More workshop evidence is needed.").slice(0, 300),
        blocker: String(rawReadiness?.["blocker"] ?? "Clarify the future-state workflow.").slice(0, 240),
        prototypeKind: String(rawReadiness?.["prototypeKind"] ?? "").slice(0, 80),
        requirements,
        questions,
      },
    };
  });

export const suggestImprovement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ImproveInput.parse(input))
  .handler(async ({ data }) => {
    const captures = data.captures.map((c) => `### ${c.kind} — ${c.title}\n${c.text}`).join("\n\n");
    const findings = data.findings
      .filter((f) => f.section === "questions" || f.confidence !== "high")
      .map((f) => `- [${f.section}/${f.confidence}] ${f.title}: ${f.detail}`)
      .join("\n");
    const text = await callAI({
      instructions:
        "You help a facilitator improve an evolving future-state blueprint. Identify exactly one highest-impact unresolved question. Suggest 2 or 3 concise, plausible answer options grounded in the evidence. Do not invent certainty. Write in json.",
      input: [{ role: "user", content: [{ type: "input_text", text: `Objective: ${data.objective || "not stated"}\n\nWorkshop evidence:\n${captures || "none"}\n\nCurrent gaps:\n${findings || "none"}\n\nReturn the most important improvement as json.` }] }],
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      store: false,
      text: { format: { type: "json_schema", name: "workshop_improvement", strict: true, schema: improvementSchema } },
    });
    if (!text.trim()) throw new Error("No improvement suggestion came back. Try again.");
    const parsed = JSON.parse(text) as { question: string; why: string; answers: string[] };
    return {
      question: String(parsed.question).slice(0, 240),
      why: String(parsed.why).slice(0, 300),
      answers: parsed.answers.map(String).slice(0, 3),
    };
  });

export const recommendStrategy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StrategyInput.parse(input))
  .handler(async ({ data }) => {
    const blueprint = data.findings
      .map((f) => `- [${f.section}/${f.confidence}/${f.interpretationType}] ${f.title}: ${f.detail}`)
      .join("\n");
    const text = await callAI({
      instructions: `You choose how a consulting workshop's future-state blueprint should be prototyped so the ideas can actually be tested with people.

Available archetypes:
- workflowSimulator: move realistic cases through a proposed process, with handoffs, rules, statuses and exceptions.
- journeyExperience: experience the future state as one or more personas moving through a journey.
- serviceExperience: front-stage experience plus the backstage roles and process supporting it.
- decisionRights: realistic decisions showing who recommends, decides, approves, contributes and executes.
- governanceRhythm: how a governance model runs through meetings, inputs, decisions, escalations, cadences and outputs.
- dashboardDecisionTool: an interactive scorecard or decision interface on synthetic data.
- digitalExperience: clickable screens, only when the future state genuinely involves a digital product.
- scenarioSimulator: scenarios that show how the proposed future state responds.
- roleWorkspace: how each role experiences the process, information, responsibilities and actions.

Rules:
- Never default to a software application or a dashboard. Choose those only when the blueprint itself is about a digital product or about metrics and decisions on data.
- Pick the single format that best tests what this workshop is actually designing, judged from the evidence.
- Add perspectives only when a hybrid genuinely represents the future state better. They are perspectives inside ONE prototype, never separate products.
- tests names the concrete parts of the blueprint the format will exercise. cannotTest names important elements it cannot meaningfully test.
- Be specific to this workshop. No generic consulting language. Write in json.`,
      input: [{ role: "user", content: [{ type: "input_text", text: `Objective: ${data.objective || "not stated"}\nKind of future state: ${data.prototypeKind || "not classified"}\n\nFuture-state blueprint:\n${blueprint || "(empty)"}\n\nRecommend the prototype strategy as json.` }] }],
      reasoning: { effort: "medium", summary: "auto" }, include: ["reasoning.encrypted_content"], store: false,
      text: { format: { type: "json_schema", name: "prototype_strategy", strict: true, schema: strategySchema } },
    });
    if (!text.trim()) throw new Error("No prototype strategy came back. Try again.");
    try {
      return JSON.parse(text) as {
        primary: string; rationale: string; tests: string[]; cannotTest: string[];
        perspectives: { archetype: string; role: string }[];
      };
    } catch {
      throw new Error("The prototype strategy came back in an unexpected shape. Try again.");
    }
  });

export const generatePrototype = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PrototypeInput.parse(input))
  .handler(async ({ data }) => {
    const evidence = data.findings.map((finding) =>
      `- [${finding.section}/${finding.confidence}/${finding.sourceOrigin}/${finding.interpretationType}] ${finding.title}: ${finding.detail}\n  Evidence: ${finding.excerpt || "not captured"}`,
    ).join("\n");
    const people = data.participants.map((person) => `${person.name} — ${person.role}`).join("; ") || "not named";
    const text = await callAI({
      instructions: `You create a rigorous future-state design prototype for a consulting workshop. Build one coherent, linked operating model across workflow, RACI, decisions, rules, measures, risks, assumptions and questions.
- Use only supplied evidence. Never invent certainty, owners, handoffs or metrics.
- Every workflow phase must use the exact same phase title wherever referenced.
- RACI uses R, A, C, I. Use ? when the evidence does not support an assignment. Prefer ? over guessing.
- owner or trigger must be "Unresolved" when unsupported.
- confidence: high = explicitly stated, medium = strongly implied, low = inferred or unresolved.
- evidence is a brief source quote or "No direct evidence".
- risks should connect pain points or assumptions to the future state.
- Treat confirmedDecision items as settled. Treat proposals and hypotheses as directional or assumed, and carry their uncertainty into workflow, RACI, rules, decisions, measures, risks and gaps.
- changeSummary explains what this version adds; when there is no prior prototype say it is the initial structured version.
- Temporary facilitator assumptions may be supplied. Use them so the prototype can hold together, but every element that depends on one must stay visibly marked as an assumption: list each one in the assumptions view with confidence low, prefix its title with "Assumption:", and say in evidence that it is a facilitator working assumption, not workshop evidence.
- A prototype strategy may be supplied. Shape the whole package around that chosen interactive format and its extra perspectives. Never default to a software application or dashboard framing when the strategy says otherwise. The summary must open by describing what the facilitator and participants will do in that format.
- Keep the result concise enough to scan in a live workshop. Write in json.`,
      input: [{ role: "user", content: [{ type: "input_text", text: `Objective: ${data.objective || "not stated"}\nParticipants: ${people}\nPrevious prototype: ${data.previousName || "none"}\n\nStructured workshop evidence:\n${evidence}\n\nTemporary facilitator assumptions (label as assumptions):\n${data.assumptions.length ? data.assumptions.map((a) => `- ${a}`).join("\n") : "none"}\n\nAgreed prototype strategy:\n${
        data.strategy
          ? `- Format: ${data.strategy.primaryLabel}\n- Why: ${data.strategy.rationale}\n- Must test: ${data.strategy.tests.join("; ") || "not stated"}\n- Out of scope for this format: ${data.strategy.cannotTest.join("; ") || "not stated"}\n- Additional perspectives inside the same prototype: ${data.strategy.perspectives.map((p) => `${p.label} (${p.role})`).join("; ") || "none"}`
          : "none agreed — infer the most useful interactive format from the evidence and do not default to an app or dashboard."
      }\n\nReturn the linked multi-view prototype as json.` }] }],
      reasoning: { effort: "medium", summary: "auto" }, include: ["reasoning.encrypted_content"], store: false,
      text: { format: { type: "json_schema", name: "future_state_prototype", strict: true, schema: prototypeSchema } },
    });
    if (!text.trim()) throw new Error("The prototype came back empty. Try again.");
    try {
      return JSON.parse(text) as import("./workshop-types").PrototypeBlueprint;
    } catch {
      throw new Error("The prototype came back in an unexpected shape. Try again.");
    }
  });

const ExperienceInput = z.object({
  objective: z.string(),
  archetypeLabel: z.string().default(""),
  perspectiveLabels: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  participants: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
  findings: z.array(z.object({
    section: z.string(), title: z.string(), detail: z.string(), confidence: z.string(), interpretationType: z.string(),
  })),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  blueprintSummary: z.string().default(""),
});

const BASIS_ENUM = ["decision", "proposal", "assumption", "unresolved"];
const labelledValue = {
  type: "object", additionalProperties: false,
  properties: { label: { type: "string" }, value: { type: "string" } },
  required: ["label", "value"],
};
const experienceSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string", description: "Short name of the interactive prototype" },
    howToUse: { type: "string", description: "One or two sentences telling the facilitator how to run this with participants" },
    personas: { type: "array", minItems: 1, items: {
      type: "object", additionalProperties: false,
      properties: {
        id: { type: "string", description: "lowercase-hyphen id" }, name: { type: "string", description: "Synthetic example name" },
        role: { type: "string" }, goal: { type: "string" },
        perspective: { type: "string", description: "What this role sees and does in the prototype" },
      },
      required: ["id", "name", "role", "goal", "perspective"],
    } },
    scenarios: { type: "array", minItems: 2, maxItems: 4, items: {
      type: "object", additionalProperties: false,
      properties: {
        id: { type: "string" }, name: { type: "string" },
        premise: { type: "string", description: "The realistic situation participants are reacting to" },
        personaId: { type: "string", description: "id of the persona this scenario starts with" },
        startStepId: { type: "string", description: "id of the first step of this scenario" },
        syntheticData: { type: "array", items: labelledValue, description: "Example case data, clearly synthetic" },
        priority: { type: "string", enum: ["primary", "contested", "edge"], description: "primary = standard happy path, contested = the least settled part of the design, edge = exception or escalation" },
        focus: { type: "string", description: "One short line: what this scenario is there to test" },
      },
      required: ["id", "name", "premise", "personaId", "startStepId", "syntheticData", "priority", "focus"],
    } },
    steps: { type: "array", minItems: 6, items: {
      type: "object", additionalProperties: false,
      properties: {
        id: { type: "string" }, scenarioId: { type: "string" }, personaId: { type: "string" },
        stage: { type: "string", description: "Blueprint stage or moment this step belongs to" },
        title: { type: "string" },
        situation: { type: "string", description: "What is happening right now, written to the person playing this role" },
        dataPoints: { type: "array", items: labelledValue },
        backstage: { type: "array", items: {
          type: "object", additionalProperties: false,
          properties: { role: { type: "string" }, action: { type: "string" } },
          required: ["role", "action"],
        } },
        basis: { type: "string", enum: BASIS_ENUM },
        basisNote: { type: "string", description: "One short line naming the workshop evidence, assumption or gap behind this step" },
        testPrompt: { type: "string", description: "The question the facilitator should ask participants at this step" },
        choices: { type: "array", items: {
          type: "object", additionalProperties: false,
          properties: {
            label: { type: "string" }, consequence: { type: "string", description: "What happens next in the future state" },
            nextStepId: { type: "string", description: "id of the next step, or empty string when the scenario ends here" },
            rule: { type: "string", description: "The rule or decision right that drives this, or empty string" },
            basis: { type: "string", enum: BASIS_ENUM }, basisNote: { type: "string" },
          },
          required: ["label", "consequence", "nextStepId", "rule", "basis", "basisNote"],
        } },
      },
      required: ["id", "scenarioId", "personaId", "stage", "title", "situation", "dataPoints", "backstage", "basis", "basisNote", "testPrompt", "choices"],
    } },
  },
  required: ["title", "howToUse", "personas", "scenarios", "steps"],
};

export const generateExperience = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExperienceInput.parse(input))
  .handler(async ({ data }) => {
    const evidence = data.findings
      .map((f) => `- [${f.section}/${f.confidence}/${f.interpretationType}] ${f.title}: ${f.detail}`)
      .join("\n");
    const text = await callAI({
      instructions: `You script a PLAYABLE prototype that a consulting facilitator runs live with workshop participants. It is rendered as an interactive, step-by-step experience inside a facilitation tool: participants pick a scenario, take a role, read a situation, and choose an action, and each choice moves them to another step.

Rules:
- Shape it as the chosen prototype format. Do not turn everything into an app or dashboard.
- Every scenario must be walkable end to end: each step's choices point to an existing step id in the same scenario, or an empty nextStepId to end the scenario. Every step id referenced must exist. No orphan steps, no loops that cannot end.
- Use synthetic, obviously-example data (names, dates, ticket numbers, figures) so participants have something concrete to react to.
- basis: decision = agreed in the workshop; proposal = discussed but not agreed; assumption = a facilitator working assumption or a gap you had to fill; unresolved = the future state genuinely does not answer this yet.
- Never invent a major business rule to make the experience complete. If a rule is unavoidable, mark it as an assumption and say so plainly in basisNote.
- Where the future state is unresolved, keep the step honest: present the fork as unresolved rather than inventing the answer.
- Support several roles when the blueprint does; give each persona a distinct perspective.
- Be explicit about WHO is acting. Every step names one persona, and the situation is written directly to that person in second person, naming their role and what they are allowed to decide at this moment. Never write a step where the acting role is ambiguous.
- Every choice must be an action that acting role genuinely has the authority to take. When an action hands the case to another role, say so in the consequence ("hands to the credit officer, who now owns the clock").
- Scenario priority: exactly one scenario has priority "primary" and it must be the standard end-to-end happy path of the future state. Then include at least one "contested" scenario aimed at the part of the design the room disagreed on or left unsettled, and optionally one "edge" scenario for an exception, breach or escalation. Order the scenarios array primary first, then contested, then edge.
- testPrompt is a real facilitation question ("Is this who should decide here?"), not narration.
- Aim for 2-4 scenarios and 8-16 steps total. Prioritise being usable and reactable over completeness or polish.
- Write in json.`,
      input: [{ role: "user", content: [{ type: "input_text", text: `Objective: ${data.objective || "not stated"}
Prototype format: ${data.archetypeLabel || "infer from the evidence"}
Additional perspectives in the same prototype: ${data.perspectiveLabels.join("; ") || "none"}
This prototype must test: ${data.tests.join("; ") || "not stated"}
Real workshop participants: ${data.participants.map((p) => `${p.name} (${p.role})`).join("; ") || "not named"}

Future-state blueprint summary:
${data.blueprintSummary || "none"}

Structured workshop evidence:
${evidence || "(none)"}

Facilitator working assumptions (must stay labelled as assumptions):
${data.assumptions.length ? data.assumptions.map((a) => `- ${a}`).join("\n") : "none"}

Still unresolved:
${data.openQuestions.length ? data.openQuestions.map((q) => `- ${q}`).join("\n") : "none"}

Return the playable prototype as json.` }] }],
      reasoning: { effort: "medium", summary: "auto" }, include: ["reasoning.encrypted_content"], store: false,
      text: { format: { type: "json_schema", name: "interactive_prototype", strict: true, schema: experienceSchema } },
    });
    if (!text.trim()) throw new Error("The interactive prototype came back empty. Try again.");
    try {
      return JSON.parse(text) as import("./workshop-types").PrototypeExperience;
    } catch {
      throw new Error("The interactive prototype came back in an unexpected shape. Try again.");
    }
  });

export const askWorkshop = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const captures = data.captures.length
      ? data.captures.map((c) => `### ${c.kind} — ${c.title}\n${c.text}`).join("\n\n")
      : "(no input captured yet)";
    const text = await callAI({
      instructions:
        "You answer a consultant's question about a live future-state design workshop, using only the supplied material. Be direct and specific: at most five sentences, no preamble, no bullet padding. Say plainly when the material does not answer the question.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Workshop objective: ${data.objective || "not stated"}\n\nWorkshop input:\n${captures}\n\nQuestion: ${data.question}`,
            },
          ],
        },
      ],
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      store: false,
    });
    return { answer: text.trim() || "No answer came back. Try rephrasing the question." };
  });

export const SECTION_LABELS_EXPORT = SECTION_LABELS;
