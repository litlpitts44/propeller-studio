import { useMemo, useState } from "react";
import { ArrowRight, CircleAlert, GitBranch, ListChecks, Play, Scale, Target, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ARCHETYPE_LABELS } from "@/lib/workshop-types";
import { PrototypeMetadata, PrototypeRunner } from "@/components/workshop/PrototypeRunner";
import type { Confidence, Finding, PrototypeBlueprint, PrototypeModelItem, PrototypeVersion } from "@/lib/workshop-types";

const CONFIDENCE_LABEL: Record<Confidence, string> = { high: "Confirmed", medium: "Proposed", low: "Assumed" };
const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "border-primary bg-primary text-primary-foreground",
  medium: "border-accent bg-accent text-accent-foreground",
  low: "border-muted-foreground bg-card text-muted-foreground border-dashed",
};

function firstSentence(text: string) {
  const match = text.trim().match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text.trim();
}

function Badge({ confidence }: { confidence: Confidence }) {
  return <span className={cn("inline-flex border px-2 py-0.5 text-[10px] font-semibold", CONFIDENCE_STYLE[confidence])}>{CONFIDENCE_LABEL[confidence]}</span>;
}

function EvidenceLegend({ findings }: { findings: Finding[] }) {
  const counts = (["high", "medium", "low"] as const).map((confidence) => ({
    confidence,
    count: findings.filter((finding) => {
      if (finding.interpretationType === "confirmedDecision" || finding.status === "confirmed") return confidence === "high";
      if (finding.interpretationType === "hypothesis" || finding.confidence === "low") return confidence === "low";
      return confidence === finding.confidence;
    }).length,
  }));
  const unresolved = findings.filter((finding) => finding.section === "questions").length;
  return <div aria-label="Evidence strength" className="flex flex-wrap items-center gap-1.5">
    {counts.map(({ confidence, count }) => <span key={confidence} className={cn("border px-2 py-1 text-[10px] font-semibold", CONFIDENCE_STYLE[confidence])}>{CONFIDENCE_LABEL[confidence]} · {count}</span>)}
    <span className="border border-dashed border-destructive bg-card px-2 py-1 text-[10px] font-semibold text-destructive">Unresolved · {unresolved}</span>
  </div>;
}

function items(findings: Finding[], section: Finding["section"]): PrototypeModelItem[] {
  return findings.filter((finding) => finding.section === section).map((finding) => ({
    title: finding.title, detail: finding.detail, owner: "Unresolved", trigger: "Unresolved", phases: [],
    confidence: finding.confidence, evidence: finding.excerpt || "No direct evidence",
  }));
}

function fallbackBlueprint(prototype: PrototypeVersion): PrototypeBlueprint {
  const phases = prototype.findings.filter((finding) => finding.section === "process").map((finding) => ({
    title: finding.title, summary: finding.detail, owner: "Unresolved", participants: [], input: "Unresolved", output: "Unresolved",
    rules: [], decisions: [], measures: [], confidence: finding.confidence, evidence: finding.excerpt || "No direct evidence",
  }));
  const roles = prototype.findings.filter((finding) => finding.section === "actors").map((finding) => finding.title);
  return {
    summary: "This earlier prototype contains the captured future-state flow and evidence available when it was generated.",
    changeSummary: "Legacy prototype — generate a new version for fully linked views.",
    gaps: items(prototype.findings, "questions").map((item) => item.title), phases,
    raci: roles.flatMap((role) => phases.map((phase) => ({ role, phase: phase.title, responsibility: "?" as const, confidence: "low" as const }))),
    rules: items(prototype.findings, "rules"), decisions: items(prototype.findings, "decisions"),
    metrics: items(prototype.findings, "metrics"), risks: items(prototype.findings, "painPoints"),
    assumptions: items(prototype.findings, "assumptions"), questions: items(prototype.findings, "questions"),
  };
}

function ItemList({ title, items: modelItems }: { title: string; items: PrototypeModelItem[] }) {
  return <section><h3 className="border-b border-border pb-2 text-lg font-bold text-foreground">{title}</h3><div className="divide-y divide-border">{modelItems.length ? modelItems.map((item) => <article key={`${title}-${item.title}`} className="grid gap-3 py-4 md:grid-cols-[1fr_180px]"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-foreground">{item.title}</h4><Badge confidence={item.confidence} /></div><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.detail}</p><p className="mt-2 border-l-2 border-accent pl-3 text-[11px] italic text-muted-foreground">“{item.evidence}”</p></div><dl className="space-y-2 text-[11px]"><div><dt className="font-semibold text-foreground">Owner</dt><dd className="text-muted-foreground">{item.owner}</dd></div><div><dt className="font-semibold text-foreground">Trigger</dt><dd className="text-muted-foreground">{item.trigger}</dd></div>{item.phases.length > 0 && <div><dt className="font-semibold text-foreground">Workflow impact</dt><dd className="text-muted-foreground">{item.phases.join(", ")}</dd></div>}</dl></article>) : <p className="py-6 text-sm text-muted-foreground">Not yet supported by workshop evidence.</p>}</div></section>;
}

export function PrototypePanel({ prototype, objective, readiness, blueprintLabel }: { prototype: PrototypeVersion; objective: string; readiness: number; blueprintLabel?: string }) {
  const blueprint = useMemo(() => prototype.blueprint ?? fallbackBlueprint(prototype), [prototype]);
  const [primaryView, setPrimaryView] = useState("overview");
  const [activePhase, setActivePhase] = useState(blueprint.phases[0]?.title ?? "");
  const phase = blueprint.phases.find((item) => item.title === activePhase) ?? blueprint.phases[0];
  const roles = Array.from(new Set(blueprint.raci.map((item) => item.role)));
  const assumptions = prototype.assumptions ?? [];
  const openQuestions = prototype.openQuestions ?? [];
  const scenarioAssumptions = useMemo(() => {
    const experience = prototype.experience;
    if (!experience) return [] as string[];
    const list: string[] = [];
    for (const step of experience.steps) {
      if (step.basis === "assumption") list.push(step.basisNote || step.title);
      for (const choice of step.choices) if (choice.basis === "assumption") list.push(choice.basisNote || choice.label);
    }
    return Array.from(new Set(list));
  }, [prototype.experience]);
  const assumptionCount = assumptions.length + scenarioAssumptions.length;

  return <div className="mx-auto max-w-6xl">
    <header className="sticky top-0 z-20 -mx-6 border-b border-border bg-background/95 px-6 pb-4 pt-1 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold text-accent">FUTURE-STATE PROTOTYPE</p><h2 className="mt-1 text-2xl font-bold text-foreground">{prototype.name}</h2><p className="mt-1 text-[12px] text-muted-foreground">{blueprintLabel ?? prototype.sourceVersionId} · {new Date(prototype.createdAt).toLocaleString()}</p></div>
        <EvidenceLegend findings={prototype.findings} />
      </div>
    </header>

    <Tabs value={primaryView} onValueChange={setPrimaryView} className="mt-5">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border border-border bg-card p-1">
        <TabsTrigger value="overview" className="rounded-none py-2.5 text-[12px] data-[state=active]:bg-secondary data-[state=active]:shadow-none">1. Overview</TabsTrigger>
        <TabsTrigger value="run" disabled={!prototype.experience} className="rounded-none py-2.5 text-[12px] data-[state=active]:bg-secondary data-[state=active]:shadow-none">2. Try a scenario</TabsTrigger>
        <TabsTrigger value="review" className="rounded-none py-2.5 text-[12px] data-[state=active]:bg-secondary data-[state=active]:shadow-none">3. Review insights</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 py-7">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.8fr]">
          <section>
            <p className="text-[11px] font-semibold text-accent">OBJECTIVE</p>
            <h3 className="mt-2 max-w-3xl font-display text-2xl font-semibold text-foreground">{objective}</h3>
            {prototype.strategy && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Format: {ARCHETYPE_LABELS[prototype.strategy.primary]}.</span> {firstSentence(prototype.strategy.rationale)}</p>}
            <Button className="mt-6" disabled={!prototype.experience} onClick={() => setPrimaryView("run")}><Play className="size-4" /> Start with the primary scenario</Button>
            <Accordion type="single" collapsible className="mt-5 max-w-2xl border-t border-border">
              <AccordionItem value="summary" className="border-b-0"><AccordionTrigger className="py-3 text-[12px] font-semibold hover:no-underline">Read the full future-state summary</AccordionTrigger><AccordionContent><p className="text-sm leading-7 text-muted-foreground">{blueprint.summary}</p>{prototype.strategy && <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{prototype.strategy.rationale}</p>}</AccordionContent></AccordionItem>
            </Accordion>
          </section>
          <section className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <p className="text-[11px] font-semibold text-accent">WHAT TO TEST</p>
            <ol className="mt-3 space-y-4">{(prototype.strategy?.tests.length ? prototype.strategy.tests : blueprint.gaps).slice(0, 3).map((item, index) => <li key={item} className="flex gap-3 text-sm leading-6 text-foreground"><span className="font-display text-xl text-accent">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ol>
          </section>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-px bg-border sm:grid-cols-4">{[[GitBranch, blueprint.phases.length, "Workflow phases"],[Users, roles.length, "Roles"],[ListChecks, assumptionCount, "Assumptions"],[CircleAlert, openQuestions.length, "Open questions"]].map(([Icon, value, label]) => { const C = Icon as typeof GitBranch; return <div key={String(label)} className="bg-card p-4"><C className="size-4 text-accent"/><p className="mt-3 text-2xl font-bold text-foreground">{String(value)}</p><p className="text-[11px] text-muted-foreground">{String(label)}</p></div>; })}</div>
      </TabsContent>

      {prototype.experience && <TabsContent value="run" className="mt-0 py-7"><PrototypeRunner experience={prototype.experience} /></TabsContent>}

      <TabsContent value="review" className="mt-0 py-7">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section><p className="text-[11px] font-semibold text-accent">WHAT TO VALIDATE NEXT</p><h3 className="mt-2 text-xl font-bold text-foreground">Questions raised by this prototype</h3><ul className="mt-4 space-y-3">{blueprint.gaps.slice(0, 6).map((gap) => <li key={gap} className="border-l-2 border-accent pl-3 text-sm leading-6 text-foreground">{gap}</li>)}</ul></section>
          <section><p className="text-[11px] font-semibold text-accent">CURRENT BASIS</p><h3 className="mt-2 text-xl font-bold text-foreground">What needs care in discussion</h3><div className="mt-4 space-y-4">{assumptions.length > 0 && <div><p className="text-[12px] font-semibold text-foreground">Facilitator working assumptions</p><p className="text-[11px] text-muted-foreground">Entered in readiness so the prototype could be built.</p><ul className="mt-2 space-y-2">{assumptions.slice(0, 5).map((item) => <li key={item} className="text-[13px] text-muted-foreground"><span className="mr-2 border border-dashed border-muted-foreground px-1.5 py-px text-[10px] font-semibold text-muted-foreground">Assumed</span>{item}</li>)}</ul></div>}{scenarioAssumptions.length > 0 && <div><p className="text-[12px] font-semibold text-foreground">Scenario design assumptions</p><p className="text-[11px] text-muted-foreground">Gaps filled inside the scenarios; these show as “Assumption” while you play.</p><ul className="mt-2 space-y-2">{scenarioAssumptions.slice(0, 6).map((item) => <li key={item} className="text-[13px] text-muted-foreground"><span className="mr-2 border border-dashed border-muted-foreground px-1.5 py-px text-[10px] font-semibold text-muted-foreground">Assumed</span>{item}</li>)}</ul></div>}{openQuestions.length > 0 && <div><p className="text-[12px] font-semibold text-foreground">Still unresolved</p><ul className="mt-2 space-y-2">{openQuestions.slice(0, 5).map((item) => <li key={item.question} className="text-[13px] text-muted-foreground">{item.question}</li>)}</ul></div>}</div></section>
        </div>
        <PrototypeMetadata prototype={prototype} blueprintVersionId={blueprintLabel ?? prototype.sourceVersionId} readiness={readiness} />
      </TabsContent>
    </Tabs>

    <Accordion type="single" collapsible className="mt-3 border-t border-border">
      <AccordionItem value="blueprint" className="border-b-0">
        <AccordionTrigger className="py-5 text-[13px] font-semibold hover:no-underline"><span><span className="block text-left text-foreground">Explore the supporting blueprint</span><span className="mt-1 block text-left text-[11px] font-normal text-muted-foreground">Workflow, roles, decisions, rules, measures, and risks</span></span></AccordionTrigger>
        <AccordionContent className="pb-8">
          <Tabs defaultValue="workflow">
            <div className="overflow-x-auto border-b border-border"><TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">{([[
              "workflow", "Workflow",
            ], ["raci", "RACI"], ["decisions", "Decisions & rules"], ["measures", "Measures & risks"]] as const).map(([value, label]) => <TabsTrigger key={value} value={value} className="rounded-none border-b-[3px] border-transparent px-4 py-3 text-[12px] shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">{label}</TabsTrigger>)}</TabsList></div>
            <TabsContent value="workflow" className="mt-0 py-6"><div className="overflow-x-auto pb-3"><div className="flex min-w-max items-stretch">{blueprint.phases.map((item, index) => <div key={item.title} className="flex items-center"><Button variant="outline" onClick={() => setActivePhase(item.title)} className={cn("h-28 w-44 whitespace-normal rounded-none border-l-4 px-4 text-left", phase?.title === item.title ? "border-l-accent bg-secondary" : "border-l-primary")}><span><span className="block text-[10px] text-muted-foreground">PHASE {index + 1}</span><span className="mt-2 block font-semibold text-foreground">{item.title}</span><span className="mt-2 block"><Badge confidence={item.confidence}/></span></span></Button>{index < blueprint.phases.length - 1 && <ArrowRight className="mx-2 size-4 text-muted-foreground"/>}</div>)}</div></div>{phase ? <div className="mt-4 border-t border-border pt-5"><div className="grid gap-6 lg:grid-cols-[1.3fr_1fr_1fr]"><div><h3 className="text-xl font-bold text-foreground">{phase.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.summary}</p><p className="mt-4 border-l-2 border-accent pl-3 text-[12px] italic text-muted-foreground">“{phase.evidence}”</p></div><dl className="space-y-3 text-[12px]"><div><dt className="font-semibold">Owner</dt><dd className="text-muted-foreground">{phase.owner}</dd></div><div><dt className="font-semibold">Participants</dt><dd className="text-muted-foreground">{phase.participants.join(", ") || "Unresolved"}</dd></div><div><dt className="font-semibold">Input → output</dt><dd className="text-muted-foreground">{phase.input} → {phase.output}</dd></div></dl><dl className="space-y-3 text-[12px]"><div><dt className="font-semibold">Rules</dt><dd className="text-muted-foreground">{phase.rules.join("; ") || "None evidenced"}</dd></div><div><dt className="font-semibold">Decisions</dt><dd className="text-muted-foreground">{phase.decisions.join("; ") || "None evidenced"}</dd></div><div><dt className="font-semibold">Measures</dt><dd className="text-muted-foreground">{phase.measures.join("; ") || "None evidenced"}</dd></div></dl></div></div> : <p className="text-sm text-muted-foreground">No ordered workflow is evidenced yet.</p>}</TabsContent>
            <TabsContent value="raci" className="mt-0 py-6"><div className="mb-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span><b className="text-foreground">R</b> Responsible</span><span><b className="text-foreground">A</b> Accountable</span><span><b className="text-foreground">C</b> Consulted</span><span><b className="text-foreground">I</b> Informed</span><span><b className="text-accent">?</b> Validate</span></div><Table className="min-w-[720px]"><TableHeader><TableRow><TableHead className="sticky left-0 z-10 min-w-44 bg-card font-semibold text-foreground">Role</TableHead>{blueprint.phases.map((item) => <TableHead key={item.title} className="min-w-36 text-center text-foreground">{item.title}</TableHead>)}</TableRow></TableHeader><TableBody>{roles.map((role) => <TableRow key={role}><TableCell className="sticky left-0 bg-card font-semibold text-foreground">{role}</TableCell>{blueprint.phases.map((item) => { const assignment = blueprint.raci.find((entry) => entry.role === role && entry.phase === item.title); return <TableCell key={item.title} className="text-center"><span className={cn("inline-flex size-7 items-center justify-center border text-xs font-bold", assignment?.responsibility === "?" ? "border-dashed border-accent text-accent" : "border-primary bg-primary text-primary-foreground")}>{assignment?.responsibility ?? "—"}</span></TableCell>; })}</TableRow>)}</TableBody></Table></TabsContent>
            <TabsContent value="decisions" className="mt-0 grid gap-8 py-6 lg:grid-cols-2"><ItemList title="Decisions" items={blueprint.decisions}/><ItemList title="Business rules" items={blueprint.rules}/></TabsContent>
            <TabsContent value="measures" className="mt-0 py-6"><div className="grid gap-8 lg:grid-cols-2"><ItemList title="Measures of success" items={blueprint.metrics}/><ItemList title="Risks & friction" items={blueprint.risks}/><ItemList title="Assumptions to test" items={blueprint.assumptions}/><ItemList title="Open questions" items={blueprint.questions}/></div></TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>;
}