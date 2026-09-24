import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Blocks, Compass, History, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { AskAiPanel } from "@/components/workshop/AskAiPanel";
import { InputPanel } from "@/components/workshop/InputPanel";
import { UnderstandingPanel } from "@/components/workshop/UnderstandingPanel";
import { PrototypePanel } from "@/components/workshop/PrototypePanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StrategyDialog } from "@/components/workshop/StrategyDialog";
import { ChangesSincePrototype } from "@/components/workshop/IterationLoop";
import { diffBlueprint } from "@/lib/blueprint-diff";
import { generateExperience, generatePrototype, interpretWorkshop, recommendStrategy } from "@/lib/interpret.functions";
import { useWorkshop } from "@/lib/workshop-store";
import {
  SECTION_KEYS,
  computeGate,
  findingSemanticKey,
  newId,
  ARCHETYPE_LABELS,
  PROTOTYPE_ARCHETYPES,
  type PrototypeArchetype,
  type PrototypeStrategy,
  type QuestionOverride,
  type Readiness,
  type ReadinessGate,
  type Capture,
  type Finding,
  type InterpretationVersion,
  type PrototypeVersion,
  type SectionKey,
  type Workshop,
  type EvidenceOrigin,
  type InterpretationType,
} from "@/lib/workshop-types";

export const Route = createFileRoute("/workshops/$workshopId")({
  head: () => ({
    meta: [
      { title: "Workshop session — Propeller Studio" },
      {
        name: "description",
        content:
          "Workshop input on the left, a structured picture of the emerging future state on the right.",
      },
      { property: "og:title", content: "Workshop session — Propeller Studio" },
      {
        property: "og:description",
        content:
          "Workshop input on the left, a structured picture of the emerging future state on the right.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkshopSession,
});

type RawFinding = {
  semanticKey: string;
  title: string; detail: string; confidence: string; excerpt: string;
  sourceOrigin: string; sourceCaptureIds: string[]; interpretationType: string;
};
const PROTOTYPE_READINESS_THRESHOLD = 60;

function mergeFindings(
  previous: Finding[],
  incoming: Record<string, RawFinding[]>,
  isFirstRun: boolean,
): Finding[] {
  const now = Date.now();
  const dismissedTitles = new Set(
    previous.filter((f) => f.status === "dismissed").map((f) => f.semanticKey),
  );
  const merged: Finding[] = [];
  const seen = new Set<string>();

  for (const section of SECTION_KEYS) {
    for (const item of incoming[section] ?? []) {
      const key = item.semanticKey || findingSemanticKey(section, item.title);
      if (seen.has(key)) continue;
      seen.add(key);
      const prior = previous.find(
        (f) => f.semanticKey === key || (f.section === section && f.title.toLowerCase() === item.title.toLowerCase()),
      );
      if (dismissedTitles.has(key)) {
        merged.push({ ...(prior as Finding), status: "dismissed" });
        continue;
      }
      const liveOverridesBackground = prior?.sourceOrigin === "background" && item.sourceOrigin === "live";
      if (prior && (prior.edited || (prior.status === "confirmed" && !liveOverridesBackground))) {
        merged.push({ ...prior, excerpt: item.excerpt || prior.excerpt });
        continue;
      }
      merged.push({
        id: prior?.id ?? newId("fnd"),
        semanticKey: key,
        section: section as SectionKey,
        title: item.title,
        detail: item.detail,
        confidence: (["high", "medium", "low"].includes(item.confidence)
          ? item.confidence
          : "medium") as Finding["confidence"],
        excerpt: item.excerpt,
        status: prior ? "current" : isFirstRun ? "current" : "new",
        sourceOrigin: (item.sourceOrigin === "background" ? "background" : "live") as EvidenceOrigin,
        sourceCaptureIds: item.sourceCaptureIds,
        interpretationType: (["observation", "hypothesis", "proposal", "confirmedDecision"].includes(item.interpretationType)
          ? item.interpretationType
          : "observation") as InterpretationType,
        firstIntroducedAt: prior?.firstIntroducedAt ?? now,
        lastChangedAt: prior && prior.detail === item.detail && prior.confidence === item.confidence && prior.interpretationType === item.interpretationType
          ? prior.lastChangedAt
          : now,
      });
    }
  }

  // Preserve every prior item; disappearing evidence becomes visible uncertainty.
  for (const prior of previous) {
    const key = prior.semanticKey;
    if (seen.has(key)) continue;
    merged.push({ ...prior, status: prior.status === "dismissed" ? "dismissed" : "stale", lastChangedAt: now });
  }

  return merged;
}

function signatureOf(captures: Capture[]) {
  return captures.map((c) => `${c.id}:${c.text.length}`).join("|");
}

function WorkshopSession() {
  const { workshopId } = Route.useParams();
  const { workshop, mutate } = useWorkshop(workshopId);
  const interpret = useServerFn(interpretWorkshop);
  const generate = useServerFn(generatePrototype);
  const recommend = useServerFn(recommendStrategy);
  const buildExperience = useServerFn(generateExperience);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [rightView, setRightView] = useState<"understanding" | "prototypes">("understanding");
  const [prototypeId, setPrototypeId] = useState<string | null>(null);
  const [generatingPrototype, setGeneratingPrototype] = useState(false);
  const [prototypeError, setPrototypeError] = useState<string | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const lastSignature = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentVersion: InterpretationVersion | null = useMemo(() => {
    if (!workshop) return null;
    const id = viewingVersionId ?? workshop.currentVersionId;
    return workshop.versions.find((v) => v.id === id) ?? null;
  }, [workshop, viewingVersionId]);

  const isHistorical =
    !!workshop && !!viewingVersionId && viewingVersionId !== workshop.currentVersionId;

  const runInterpretation = useCallback(
    async (target: Workshop) => {
      if (!target.captures.length) return;
      setRunning(true);
      setError(null);
      try {
        const previous =
          target.versions.find((v) => v.id === target.currentVersionId)?.findings ?? [];
        const result = await interpret({
          data: {
            name: target.name,
            objective: target.objective,
            participants: target.participants.map((p) => ({ name: p.name, role: p.role })),
            captures: target.captures.map((c) => ({
              id: c.id,
              kind: c.kind,
              title: c.title,
              text: c.text,
              createdAt: c.createdAt,
            })),
            existing: previous.map((f) => ({
              semanticKey: f.semanticKey, section: f.section, title: f.title, detail: f.detail,
              interpretationType: f.interpretationType, sourceOrigin: f.sourceOrigin,
            })),
            openQuestions: (target.versions.find((v) => v.id === target.currentVersionId)?.readiness?.questions ?? []).map((q) => ({
              key: q.key,
              question: target.questionState?.[q.key]?.question ?? q.question,
              status: target.questionState?.[q.key]?.status ?? q.status,
              impact: q.impact,
              answer: target.questionState?.[q.key]?.answer ?? q.answer ?? "",
              assumption: target.questionState?.[q.key]?.assumption ?? q.assumption ?? "",
            })),
          },
        });

        const findings = mergeFindings(previous, result.findings, previous.length === 0);
        const overrides = target.questionState ?? {};
        const version: InterpretationVersion = {
          id: newId("ver"),
          createdAt: Date.now(),
          findings,
          captureIds: target.captures.map((c) => c.id),
          readiness: {
            ...result.readiness,
            questions: result.readiness.questions.map((q) => ({
              ...q,
              question: overrides[q.key]?.question ?? q.question,
              status: overrides[q.key]?.status ?? "open",
              answer: overrides[q.key]?.answer,
              assumption: overrides[q.key]?.assumption,
            })),
          },
        };
        mutate((w) => ({
          ...w,
          versions: [...w.versions, version],
          currentVersionId: version.id,
        }));
        setViewingVersionId(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "The analysis could not be completed. Try again.",
        );
      } finally {
        setRunning(false);
      }
    },
    [interpret, mutate],
  );

  // Understanding builds itself: run shortly after new input settles.
  useEffect(() => {
    if (!workshop || !workshop.captures.length) return;
    const sig = signatureOf(workshop.captures);
    if (lastSignature.current === null) {
      lastSignature.current = workshop.currentVersionId ? sig : "";
    }
    if (lastSignature.current === sig || running) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSignature.current = sig;
      void runInterpretation(workshop);
    }, 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [workshop, running, runInterpretation]);

  if (workshop === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (workshop === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-lg font-semibold text-foreground">Workshop not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been created on another device — workshops are stored on this browser.
        </p>
        <Button asChild>
          <Link to="/">Back to workshops</Link>
        </Button>
      </div>
    );
  }

  const findings = currentVersion?.findings ?? [];
  const prototypes = workshop.prototypes ?? [];
  const selectedPrototype = prototypes.find((prototype) => prototype.id === prototypeId) ?? prototypes.at(-1) ?? null;
  const readinessScore = currentVersion?.readiness?.score ?? 0;
  const overrides = workshop.questionState ?? {};
  const baseReadiness = currentVersion?.readiness;
  const readiness: Readiness | undefined = baseReadiness
    ? {
        ...baseReadiness,
        questions: (baseReadiness.questions ?? []).map((q) => ({
          ...q,
          question: overrides[q.key]?.question ?? q.question,
          status: overrides[q.key]?.status ?? q.status ?? "open",
          answer: overrides[q.key]?.answer ?? q.answer,
          assumption: overrides[q.key]?.assumption ?? q.assumption,
        })),
      }
    : undefined;
  const readinessQuestions = readiness?.questions ?? [];
  const gate: ReadinessGate = readinessQuestions.length
    ? computeGate(readinessQuestions)
    : readinessScore >= PROTOTYPE_READINESS_THRESHOLD
      ? "assumptions"
      : "decisions";
  const workingAssumptions = readinessQuestions
    .filter((q) => q.status === "assumed" && q.assumption)
    .map((q) => `${q.question} → ${q.assumption}`);
  const canGeneratePrototype = Boolean(currentVersion && findings.length > 0 && gate !== "decisions");
  const activeWorkshop = workshop;

  const strategy = workshop.strategy ?? null;

  const latestPrototype = prototypes.at(-1) ?? null;
  const diff = latestPrototype
    ? diffBlueprint(latestPrototype.findings, findings, latestPrototype.openQuestions ?? [], readinessQuestions)
    : null;
  const blueprintLabel = (versionId: string) => {
    const index = workshop.versions.findIndex((v) => v.id === versionId);
    return index === -1 ? "Blueprint —" : `Blueprint v${index + 1}`;
  };

  async function runRecommendation() {
    if (!currentVersion) return;
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const result = await recommend({ data: {
        objective: activeWorkshop.objective,
        prototypeKind: readiness?.prototypeKind ?? "",
        findings: currentVersion.findings.filter((finding) => finding.status !== "dismissed").map((finding) => ({
          section: finding.section, title: finding.title, detail: finding.detail,
          confidence: finding.confidence, interpretationType: finding.interpretationType,
        })),
      } });
      const asArchetype = (value: string): PrototypeArchetype =>
        (PROTOTYPE_ARCHETYPES as readonly string[]).includes(value) ? (value as PrototypeArchetype) : "workflowSimulator";
      const next: PrototypeStrategy = {
        primary: asArchetype(result.primary),
        rationale: result.rationale,
        tests: result.tests.filter(Boolean),
        cannotTest: result.cannotTest.filter(Boolean),
        perspectives: result.perspectives.map((p) => ({ archetype: asArchetype(p.archetype), role: p.role })),
        createdAt: Date.now(),
      };
      mutate((value) => ({ ...value, strategy: next }));
    } catch (cause) {
      setStrategyError(cause instanceof Error ? cause.message : "The strategy could not be recommended.");
    } finally {
      setStrategyLoading(false);
    }
  }

  function openStrategy() {
    setStrategyOpen(true);
    if (!strategy && !strategyLoading) void runRecommendation();
  }

  async function createPrototype(usedStrategy: PrototypeStrategy | null) {
    if (!currentVersion || gate === "decisions") return;
    setGeneratingPrototype(true);
    setPrototypeError(null);
    try {
      const blueprint = await generate({ data: {
        objective: activeWorkshop.objective,
        participants: activeWorkshop.participants.map((person) => ({ name: person.name, role: person.role })),
        findings: currentVersion.findings.filter((finding) => finding.status !== "dismissed").map((finding) => ({
          section: finding.section, title: finding.title, detail: finding.detail, confidence: finding.confidence,
          excerpt: finding.excerpt, sourceOrigin: finding.sourceOrigin, interpretationType: finding.interpretationType,
        })),
        assumptions: workingAssumptions,
        previousName: prototypes.at(-1)?.name ?? "",
        ...(usedStrategy ? { strategy: {
          primary: usedStrategy.primary,
          primaryLabel: ARCHETYPE_LABELS[usedStrategy.primary],
          rationale: usedStrategy.rationale,
          tests: usedStrategy.tests,
          cannotTest: usedStrategy.cannotTest,
          perspectives: usedStrategy.perspectives.map((p) => ({ label: ARCHETYPE_LABELS[p.archetype], role: p.role })),
        } } : {}),
      } });
    const liveFindings = currentVersion.findings.filter((finding) => finding.status !== "dismissed");
    const remaining = readinessQuestions.filter((q) => q.status !== "resolved");
    const experience = await buildExperience({ data: {
      objective: activeWorkshop.objective,
      archetypeLabel: usedStrategy ? ARCHETYPE_LABELS[usedStrategy.primary] : "",
      perspectiveLabels: usedStrategy ? usedStrategy.perspectives.map((p) => `${ARCHETYPE_LABELS[p.archetype]} (${p.role})`) : [],
      tests: usedStrategy?.tests ?? [],
      participants: activeWorkshop.participants.map((person) => ({ name: person.name, role: person.role })),
      findings: liveFindings.map((finding) => ({
        section: finding.section, title: finding.title, detail: finding.detail,
        confidence: finding.confidence, interpretationType: finding.interpretationType,
      })),
      assumptions: workingAssumptions,
      openQuestions: remaining.map((q) => `${q.question} (${q.impact}/${q.status})`),
      blueprintSummary: blueprint.summary,
    } }).catch(() => undefined);
    const prototype: PrototypeVersion = {
      id: newId("proto"),
      createdAt: Date.now(),
      sourceVersionId: currentVersion.id,
      name: `Prototype v${prototypes.length + 1}`,
      findings: liveFindings,
      blueprint,
      assumptions: workingAssumptions,
      strategy: usedStrategy ?? undefined,
      experience,
      openQuestions: remaining.map((q) => ({ question: q.question, impact: q.impact, status: q.status })),
    };
    mutate((value) => ({ ...value, prototypes: [...(value.prototypes ?? []), prototype], ...(usedStrategy ? { strategy: usedStrategy } : {}) }));
    setPrototypeId(prototype.id);
    setStrategyOpen(false);
    setRightView("prototypes");
    } catch (cause) {
      setPrototypeError(cause instanceof Error ? cause.message : "The prototype could not be generated.");
    } finally {
      setGeneratingPrototype(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 border-t-[3px] border-t-accent border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <Link
            to="/"
            aria-label="Back to workshops"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <input
              value={workshop.name}
              onChange={(e) => mutate((w) => ({ ...w, name: e.target.value }))}
              className="w-full bg-transparent font-display text-[17px] font-semibold tracking-tight text-foreground outline-none"
              aria-label="Workshop name"
            />
            <input
              value={workshop.objective}
              onChange={(e) => mutate((w) => ({ ...w, objective: e.target.value }))}
              placeholder="Add the objective for this session…"
              className="w-full bg-transparent text-[12px] text-muted-foreground outline-none"
              aria-label="Workshop objective"
            />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            {workshop.versions.length > 0 && (
              <Select
                value={viewingVersionId ?? workshop.currentVersionId ?? ""}
                onValueChange={(v) => setViewingVersionId(v)}
              >
                <SelectTrigger className="h-8 w-[190px] text-[13px]">
                  <History className="size-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {[...workshop.versions].reverse().map((v, i) => (
                    <SelectItem key={v.id} value={v.id}>
                      {i === 0 ? "Latest · " : `v${workshop.versions.length - i} · `}
                      {new Date(v.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isHistorical && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const restore = currentVersion;
                  if (!restore) return;
                  const copy: InterpretationVersion = {
                    ...restore,
                    id: newId("ver"),
                    createdAt: Date.now(),
                  };
                  mutate((w) => ({
                    ...w,
                    versions: [...w.versions, copy],
                    currentVersionId: copy.id,
                  }));
                  setViewingVersionId(null);
                }}
              >
                <RotateCcw className="size-3.5" /> Restore
              </Button>
            )}
            <AskAiPanel
              objective={workshop.objective}
              captures={workshop.captures}
              findings={findings}
              onApply={(question, answer) => mutate((value) => ({
                ...value,
                captures: [...value.captures, {
                  id: newId("cap"),
                  createdAt: Date.now(),
                  kind: "note",
                  title: "Decision from AI Improvements",
                  text: `${question}\nDecision: ${answer}`,
                }],
              }))}
            />
            <Button
              size="sm"
              variant="ghost"
              className="hidden sm:inline-flex"
              disabled={running || !workshop.captures.length}
              onClick={() => {
                lastSignature.current = signatureOf(workshop.captures);
                void runInterpretation(workshop);
              }}
            >
              {running ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-[52vh] w-full flex-col border-b border-border bg-card lg:min-h-0 lg:w-[42%] lg:min-w-[340px] lg:border-r lg:border-b-0">
          <InputPanel
            captures={workshop.captures}
            readOnly={isHistorical}
            onAdd={(capture) =>
              mutate((w) => ({
                ...w,
                captures: [...w.captures, { ...capture, id: newId("cap"), createdAt: Date.now() }],
              }))
            }
            onRemove={(id) =>
              mutate((w) => ({ ...w, captures: w.captures.filter((c) => c.id !== id) }))
            }
          />
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-card px-4 py-2 sm:px-6">
            <Button className="min-w-0" size="sm" variant={rightView === "understanding" ? "secondary" : "ghost"} onClick={() => setRightView("understanding")}>Live understanding</Button>
            <Button className="min-w-0" size="sm" variant={rightView === "prototypes" ? "secondary" : "ghost"} onClick={() => setRightView("prototypes")}><Blocks className="size-3.5" /> Prototypes <span className="tabular-nums text-muted-foreground">{prototypes.length}</span></Button>
            <div className="w-full sm:ml-auto sm:w-auto">
              <Button size="sm" className="w-full" disabled={!canGeneratePrototype || generatingPrototype} onClick={openStrategy}>{generatingPrototype ? <Loader2 className="size-3.5 animate-spin" /> : <Compass className="size-3.5" />} {generatingPrototype ? "Building prototype…" : "Plan prototype"}</Button>
              {!canGeneratePrototype && currentVersion && <p className="mt-1 text-right text-[10px] text-muted-foreground">Blocking questions open</p>}
              {canGeneratePrototype && strategy && <p className="mt-1 text-right text-[10px] text-muted-foreground">Strategy: {ARCHETYPE_LABELS[strategy.primary]}</p>}
            </div>
          </div>
          {latestPrototype && diff && !isHistorical && (
            <ChangesSincePrototype
              baseName={latestPrototype.name}
              changes={diff.changes}
              confirmedCount={diff.confirmedCount}
              nextName={`Prototype v${prototypes.length + 1}`}
              generating={generatingPrototype}
              onGenerate={() => {
                if (strategy) void createPrototype(strategy);
                else openStrategy();
              }}
            />
          )}
          {isHistorical && (
            <p className="border-b border-border bg-muted px-6 py-2 text-[12px] text-muted-foreground">
              Viewing an earlier interpretation. Restore it to keep working from here.
            </p>
          )}
          <div className="min-h-0 flex-1">
            {rightView === "understanding" ? (
            <UnderstandingPanel
              findings={findings}
              running={running}
              error={error}
              readiness={readiness}
              gate={gate}
              readOnly={isHistorical}
              onUpdateQuestion={(key, patch) => {
                const existing = readinessQuestions.find((q) => q.key === key);
                mutate((value) => {
                  const previousOverride: QuestionOverride | undefined = value.questionState?.[key];
                  const next: QuestionOverride = {
                    status: patch.status,
                    question: patch.question ?? previousOverride?.question,
                    answer: patch.status === "resolved" ? (patch.answer ?? previousOverride?.answer) : undefined,
                    assumption: patch.status === "assumed" ? (patch.assumption ?? previousOverride?.assumption) : undefined,
                  };
                  const captures = patch.status === "resolved" && patch.answer
                    ? [...value.captures, {
                        id: newId("cap"),
                        createdAt: Date.now(),
                        kind: "note" as const,
                        title: "Decision from readiness question",
                        text: `${patch.question ?? existing?.question ?? key}\nDecision: ${patch.answer}`,
                      }]
                    : value.captures;
                  return { ...value, captures, questionState: { ...(value.questionState ?? {}), [key]: next } };
                });
              }}
              onUpdateFinding={(id, patch) =>
                mutate((w) => ({
                  ...w,
                  versions: w.versions.map((v) =>
                    v.id === w.currentVersionId
                      ? {
                          ...v,
                          findings: v.findings.map((f) => (f.id === id ? {
                            ...f,
                            ...patch,
                            interpretationType: patch.status === "confirmed" ? "confirmedDecision" : (patch.interpretationType ?? f.interpretationType),
                            lastChangedAt: Date.now(),
                          } : f)),
                        }
                      : v,
                  ),
                }))
              }
            />
            ) : (
              <div className="h-full overflow-y-auto bg-secondary/30 px-6 py-5">
                {selectedPrototype ? (
                  <div>
                    <div className="mb-5 flex justify-end">
                      <Select value={selectedPrototype.id} onValueChange={setPrototypeId}>
                        <SelectTrigger className="h-9 w-full max-w-[300px] bg-card text-[12px]" aria-label="Choose prototype version">
                          <History className="size-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...prototypes].reverse().map((prototype) => <SelectItem key={prototype.id} value={prototype.id}>{prototype.name} · {blueprintLabel(prototype.sourceVersionId)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {prototypeError && <p className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{prototypeError}</p>}
                    <PrototypePanel prototype={selectedPrototype} objective={workshop.objective} readiness={readinessScore} blueprintLabel={blueprintLabel(selectedPrototype.sourceVersionId)} />
                  </div>
                ) : (
                  <div className="mx-auto max-w-md py-24 text-center"><Blocks className="mx-auto size-7 text-accent" /><h2 className="mt-3 font-display text-xl font-semibold text-foreground">No prototype versions yet</h2><p className="mt-2 text-sm text-muted-foreground">First agree a prototype strategy — the format that best tests this future state — then generate from it.</p>{prototypeError && <p className="mt-3 text-sm text-destructive">{prototypeError}</p>}<Button className="mt-5" disabled={!canGeneratePrototype || generatingPrototype} onClick={openStrategy}>{generatingPrototype ? <Loader2 className="size-4 animate-spin" /> : <Compass className="size-4" />}{generatingPrototype ? "Building prototype…" : "Plan the prototype"}</Button>{currentVersion && !canGeneratePrototype && <p className="mt-2 text-[12px] text-muted-foreground">Resolve the blocking questions first.</p>}</div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <StrategyDialog
        open={strategyOpen}
        onOpenChange={setStrategyOpen}
        strategy={strategy}
        loading={strategyLoading}
        error={strategyError ?? prototypeError}
        generating={generatingPrototype}
        onRecommend={() => void runRecommendation()}
        onSave={(next) => mutate((value) => ({ ...value, strategy: next }))}
        onGenerate={(next) => {
          mutate((value) => ({ ...value, strategy: next }));
          void createPrototype(next);
        }}
      />
    </div>
  );
}
