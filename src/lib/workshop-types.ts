export type CaptureKind = "transcript" | "document" | "note" | "artifact";

export type Capture = {
  id: string;
  kind: CaptureKind;
  title: string;
  text: string;
  imageDataUrl?: string;
  createdAt: number;
};

export const SECTION_KEYS = [
  "actors",
  "needs",
  "painPoints",
  "process",
  "actionsHandoffs",
  "triggers",
  "decisionPoints",
  "rules",
  "ownership",
  "exceptions",
  "inputsOutputs",
  "metrics",
  "decisions",
  "assumptions",
  "questions",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  actors: "People / Roles",
  needs: "Needs & outcomes",
  painPoints: "Pain points",
  process: "Workflow stages",
  actionsHandoffs: "Actions & handoffs",
  triggers: "Triggers",
  decisionPoints: "Decision points",
  rules: "Business rules",
  ownership: "Ownership & decision rights",
  exceptions: "Exceptions & edge cases",
  inputsOutputs: "Inputs & outputs",
  metrics: "Success measures",
  decisions: "Agreed decisions",
  assumptions: "Assumptions & hypotheses",
  questions: "Open questions",
};

export const SECTION_HINTS: Record<SectionKey, string> = {
  actors: "Who is involved in the future state",
  needs: "Needs and desired outcomes",
  painPoints: "Friction in the current state",
  process: "The ordered stages of the emerging flow",
  actionsHandoffs: "Work performed and transfers between actors",
  triggers: "Events that start or advance the future state",
  decisionPoints: "Choices that change the path or outcome",
  rules: "Constraints, policies, and governing logic",
  ownership: "Accountability, authority, and decision rights",
  exceptions: "Non-standard paths and edge conditions",
  inputsOutputs: "What each stage receives and produces",
  metrics: "How success and performance will be measured",
  decisions: "Choices explicitly agreed by the group",
  assumptions: "Taken as true but not yet verified",
  questions: "Unresolved and needing follow-up",
};

export type Confidence = "high" | "medium" | "low";

export type FindingStatus = "new" | "current" | "confirmed" | "dismissed" | "stale";
export type EvidenceOrigin = "background" | "live";
export type InterpretationType = "observation" | "hypothesis" | "proposal" | "confirmedDecision";

export type Finding = {
  id: string;
  semanticKey: string;
  section: SectionKey;
  title: string;
  detail: string;
  confidence: Confidence;
  excerpt: string;
  status: FindingStatus;
  sourceOrigin: EvidenceOrigin;
  sourceCaptureIds: string[];
  interpretationType: InterpretationType;
  firstIntroducedAt: number;
  lastChangedAt: number;
  edited?: boolean;
};

export type InterpretationVersion = {
  id: string;
  createdAt: number;
  findings: Finding[];
  captureIds: string[];
  readiness?: Readiness | undefined;
};

export type QuestionImpact = "blocking" | "important" | "defer";
export type QuestionStatus = "open" | "resolved" | "assumed" | "deferred";

export type ReadinessQuestion = {
  key: string;
  question: string;
  impact: QuestionImpact;
  why: string;
  status: QuestionStatus;
  answer?: string | undefined;
  assumption?: string | undefined;
  edited?: boolean | undefined;
};

export type ReadinessRequirement = {
  label: string;
  met: boolean;
  note: string;
};

export type Readiness = {
  score: number;
  status: string;
  rationale: string;
  blocker: string;
  prototypeKind?: string | undefined;
  requirements?: ReadinessRequirement[] | undefined;
  questions?: ReadinessQuestion[] | undefined;
};

export type QuestionOverride = {
  status: QuestionStatus;
  answer?: string | undefined;
  assumption?: string | undefined;
  question?: string | undefined;
};

export type ReadinessGate = "ready" | "assumptions" | "decisions";

export const GATE_LABEL: Record<ReadinessGate, string> = {
  ready: "Ready to prototype",
  assumptions: "Prototype possible with assumptions",
  decisions: "More design decisions needed",
};

export const IMPACT_LABEL: Record<QuestionImpact, string> = {
  blocking: "Blocking",
  important: "Important",
  defer: "Can defer",
};

export function computeGate(questions: ReadinessQuestion[]): ReadinessGate {
  const blocking = questions.filter((q) => q.impact === "blocking");
  if (blocking.some((q) => q.status === "open")) return "decisions";
  if (blocking.some((q) => q.status === "assumed" || q.status === "deferred")) return "assumptions";
  const important = questions.filter((q) => q.impact === "important");
  if (important.some((q) => q.status === "open" || q.status === "assumed")) return "assumptions";
  return "ready";
}

export function questionKey(question: string) {
  return question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export const PROTOTYPE_ARCHETYPES = [
  "workflowSimulator",
  "journeyExperience",
  "serviceExperience",
  "decisionRights",
  "governanceRhythm",
  "dashboardDecisionTool",
  "digitalExperience",
  "scenarioSimulator",
  "roleWorkspace",
] as const;

export type PrototypeArchetype = (typeof PROTOTYPE_ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<PrototypeArchetype, string> = {
  workflowSimulator: "Workflow simulator",
  journeyExperience: "Customer / employee journey experience",
  serviceExperience: "Service experience prototype",
  decisionRights: "Decision-rights / operating model simulator",
  governanceRhythm: "Governance / operating rhythm simulator",
  dashboardDecisionTool: "Dashboard / decision tool",
  digitalExperience: "Product / digital experience mockup",
  scenarioSimulator: "Scenario simulator",
  roleWorkspace: "Role-based workspace",
};

export const ARCHETYPE_HINTS: Record<PrototypeArchetype, string> = {
  workflowSimulator: "Move realistic cases through the proposed process, with handoffs, rules, statuses and exceptions",
  journeyExperience: "Experience the future state as one or more personas moving through a journey",
  serviceExperience: "Show the front-stage experience alongside the backstage roles and process supporting it",
  decisionRights: "Work real decisions to show who recommends, decides, approves, contributes and executes",
  governanceRhythm: "Show how governance runs through meetings, inputs, decisions, escalations, cadences and outputs",
  dashboardDecisionTool: "An interactive scorecard or decision interface built on synthetic data",
  digitalExperience: "Clickable screens, only when the future state genuinely involves a digital product",
  scenarioSimulator: "Select or encounter scenarios and see how the proposed future state responds",
  roleWorkspace: "Show how each role experiences the process, information, responsibilities and actions",
};

export type StrategyPerspective = {
  archetype: PrototypeArchetype;
  role: string;
};

export type PrototypeStrategy = {
  primary: PrototypeArchetype;
  rationale: string;
  tests: string[];
  cannotTest: string[];
  perspectives: StrategyPerspective[];
  createdAt: number;
  edited?: boolean;
};

export type ExperienceBasis = "decision" | "proposal" | "assumption" | "unresolved";

export const BASIS_LABEL: Record<ExperienceBasis, string> = {
  decision: "Agreed decision",
  proposal: "Proposed",
  assumption: "Assumption",
  unresolved: "Unresolved",
};

export type ExperiencePersona = {
  id: string;
  name: string;
  role: string;
  goal: string;
  perspective: string;
};

export type ScenarioPriority = "primary" | "contested" | "edge";

export const SCENARIO_PRIORITY_ORDER: ScenarioPriority[] = ["primary", "contested", "edge"];

export const SCENARIO_PRIORITY_LABEL: Record<ScenarioPriority, string> = {
  primary: "Start here · primary flow",
  contested: "Contested · least settled",
  edge: "Edge case · exception",
};

export type ExperienceScenario = {
  id: string;
  name: string;
  premise: string;
  personaId: string;
  startStepId: string;
  syntheticData: { label: string; value: string }[];
  priority?: ScenarioPriority | undefined;
  focus?: string | undefined;
};

export type ExperienceChoice = {
  label: string;
  consequence: string;
  nextStepId: string;
  rule: string;
  basis: ExperienceBasis;
  basisNote: string;
};

export type ExperienceStep = {
  id: string;
  scenarioId: string;
  personaId: string;
  stage: string;
  title: string;
  situation: string;
  dataPoints: { label: string; value: string }[];
  backstage: { role: string; action: string }[];
  basis: ExperienceBasis;
  basisNote: string;
  testPrompt: string;
  choices: ExperienceChoice[];
};

export type PrototypeExperience = {
  title: string;
  howToUse: string;
  personas: ExperiencePersona[];
  scenarios: ExperienceScenario[];
  steps: ExperienceStep[];
};

export type PrototypeVersion = {
  id: string;
  createdAt: number;
  sourceVersionId: string;
  name: string;
  findings: Finding[];
  blueprint?: PrototypeBlueprint | undefined;
  assumptions?: string[] | undefined;
  strategy?: PrototypeStrategy | undefined;
  experience?: PrototypeExperience | undefined;
  openQuestions?: { question: string; impact: QuestionImpact; status: QuestionStatus }[] | undefined;
};

export type PrototypeConfidence = Confidence;

export type PrototypePhase = {
  title: string;
  summary: string;
  owner: string;
  participants: string[];
  input: string;
  output: string;
  rules: string[];
  decisions: string[];
  measures: string[];
  confidence: PrototypeConfidence;
  evidence: string;
};

export type RaciAssignment = {
  role: string;
  phase: string;
  responsibility: "R" | "A" | "C" | "I" | "?";
  confidence: PrototypeConfidence;
};

export type PrototypeModelItem = {
  title: string;
  detail: string;
  owner: string;
  trigger: string;
  phases: string[];
  confidence: PrototypeConfidence;
  evidence: string;
};

export type PrototypeBlueprint = {
  summary: string;
  changeSummary: string;
  gaps: string[];
  phases: PrototypePhase[];
  raci: RaciAssignment[];
  rules: PrototypeModelItem[];
  decisions: PrototypeModelItem[];
  metrics: PrototypeModelItem[];
  risks: PrototypeModelItem[];
  assumptions: PrototypeModelItem[];
  questions: PrototypeModelItem[];
};

export type Participant = { id: string; name: string; role: string };

export type Workshop = {
  id: string;
  name: string;
  objective: string;
  participants: Participant[];
  captures: Capture[];
  versions: InterpretationVersion[];
  currentVersionId: string | null;
  prototypes?: PrototypeVersion[] | undefined;
  questionState?: Record<string, QuestionOverride> | undefined;
  strategy?: PrototypeStrategy | undefined;
  createdAt: number;
  updatedAt: number;
};

export const CAPTURE_LABELS: Record<CaptureKind, string> = {
  transcript: "Transcript",
  document: "Documents",
  note: "Facilitator notes",
  artifact: "Workshop artifacts",
};

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function findingSemanticKey(section: SectionKey, title: string) {
  return `${section}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
