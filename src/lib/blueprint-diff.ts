import type { Finding, ReadinessQuestion, SectionKey } from "./workshop-types";
import { SECTION_LABELS } from "./workshop-types";

export type ChangeKind =
  | "added"
  | "changed"
  | "decisionChanged"
  | "decisionAgreed"
  | "assumptionChallenged"
  | "assumptionAdded"
  | "resolved"
  | "dropped";

export const CHANGE_LABEL: Record<ChangeKind, string> = {
  added: "New information",
  changed: "Updated",
  decisionChanged: "Decision changed",
  decisionAgreed: "Decision agreed",
  assumptionChallenged: "Assumption challenged",
  assumptionAdded: "Assumption added",
  resolved: "Question resolved",
  dropped: "No longer supported",
};

export type BlueprintChange = {
  id: string;
  kind: ChangeKind;
  title: string;
  detail: string;
  section: string;
};

export type BlueprintDiff = {
  changes: BlueprintChange[];
  confirmedCount: number;
};

const live = (findings: Finding[]) => findings.filter((f) => f.status !== "dismissed");

function sectionLabel(section: SectionKey) {
  return SECTION_LABELS[section] ?? section;
}

export function diffBlueprint(
  before: Finding[],
  after: Finding[],
  beforeQuestions: { question: string; status: string }[] = [],
  afterQuestions: ReadinessQuestion[] = [],
): BlueprintDiff {
  const prior = new Map(before.map((f) => [f.semanticKey, f]));
  const changes: BlueprintChange[] = [];
  let confirmedCount = 0;

  for (const finding of live(after)) {
    const was = prior.get(finding.semanticKey);
    if (!was) {
      const kind: ChangeKind =
        finding.section === "assumptions"
          ? "assumptionAdded"
          : finding.interpretationType === "confirmedDecision"
            ? "decisionAgreed"
            : "added";
      changes.push({ id: finding.id, kind, title: finding.title, detail: finding.detail, section: sectionLabel(finding.section) });
      continue;
    }
    const detailChanged = was.detail.trim() !== finding.detail.trim();
    const typeChanged = was.interpretationType !== finding.interpretationType;
    if (!detailChanged && !typeChanged) {
      confirmedCount += 1;
      continue;
    }
    const becameDecision = finding.interpretationType === "confirmedDecision" && was.interpretationType !== "confirmedDecision";
    const kind: ChangeKind = becameDecision
      ? "decisionAgreed"
      : was.interpretationType === "confirmedDecision" || finding.interpretationType === "confirmedDecision"
        ? "decisionChanged"
        : finding.section === "assumptions"
          ? "assumptionChallenged"
          : "changed";
    changes.push({
      id: finding.id,
      kind,
      title: finding.title,
      detail: detailChanged ? `Was: ${was.detail}` : finding.detail,
      section: sectionLabel(finding.section),
    });
  }

  const nowKeys = new Set(live(after).map((f) => f.semanticKey));
  for (const was of live(before)) {
    if (nowKeys.has(was.semanticKey)) continue;
    changes.push({
      id: `dropped-${was.semanticKey}`,
      kind: was.section === "assumptions" ? "assumptionChallenged" : "dropped",
      title: was.title,
      detail: was.detail,
      section: sectionLabel(was.section),
    });
  }

  const resolvedNow = new Map(afterQuestions.map((q) => [q.question.trim().toLowerCase(), q]));
  for (const open of beforeQuestions) {
    if (open.status === "resolved") continue;
    const match = resolvedNow.get(open.question.trim().toLowerCase());
    if (match && match.status === "resolved") {
      changes.push({
        id: `resolved-${open.question}`,
        kind: "resolved",
        title: open.question,
        detail: match.answer ? `Answer: ${match.answer}` : "Resolved in the workshop.",
        section: "Open questions",
      });
    }
  }

  return { changes, confirmedCount };
}
