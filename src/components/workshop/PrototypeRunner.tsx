import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, CornerDownRight, Play, RotateCcw, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ARCHETYPE_LABELS, BASIS_LABEL, SCENARIO_PRIORITY_LABEL, SCENARIO_PRIORITY_ORDER } from "@/lib/workshop-types";
import type { ExperienceBasis, PrototypeExperience, PrototypeVersion, ScenarioPriority } from "@/lib/workshop-types";

const PRIORITY_STYLE: Record<ScenarioPriority, string> = {
  primary: "border-primary bg-primary text-primary-foreground",
  contested: "border-accent bg-accent text-accent-foreground",
  edge: "border-muted-foreground bg-card text-muted-foreground",
};

const BASIS_STYLE: Record<ExperienceBasis, string> = {
  decision: "border-primary bg-primary text-primary-foreground",
  proposal: "border-accent bg-accent text-accent-foreground",
  assumption: "border-dashed border-muted-foreground bg-card text-muted-foreground",
  unresolved: "border-dashed border-destructive bg-card text-destructive",
};

export function BasisChip({ basis }: { basis: ExperienceBasis }) {
  return <span className={cn("inline-flex border px-2 py-0.5 text-[10px] font-semibold", BASIS_STYLE[basis])}>{BASIS_LABEL[basis]}</span>;
}

type Trail = { stepId: string; stepTitle: string; choice: string; consequence: string; basis: ExperienceBasis };

export function PrototypeRunner({ experience }: { experience: PrototypeExperience }) {
  const [scenarioId, setScenarioId] = useState("");
  const [stepId, setStepId] = useState("");
  const [trail, setTrail] = useState<Trail[]>([]);
  const stepsById = useMemo(() => new Map(experience.steps.map((step) => [step.id, step])), [experience.steps]);
  const scenario = experience.scenarios.find((item) => item.id === scenarioId);
  const step = stepsById.get(stepId);
  const persona = experience.personas.find((item) => item.id === step?.personaId);
  const scenarioSteps = scenario ? experience.steps.filter((item) => item.scenarioId === scenario.id) : [];
  const orderedScenarios = useMemo(() => [...experience.scenarios].sort((a, b) => {
    const rank = (value?: ScenarioPriority) => (value ? SCENARIO_PRIORITY_ORDER.indexOf(value) : SCENARIO_PRIORITY_ORDER.length);
    return rank(a.priority) - rank(b.priority);
  }), [experience.scenarios]);
  const previousPersona = (() => {
    const last = trail.at(-1);
    const lastStep = last ? stepsById.get(last.stepId) : undefined;
    if (!lastStep || lastStep.personaId === step?.personaId) return undefined;
    return experience.personas.find((item) => item.id === lastStep.personaId);
  })();
  const currentPosition = step ? Math.max(1, scenarioSteps.findIndex((item) => item.id === step.id) + 1) : scenarioSteps.length;

  function selectScenario(id: string) {
    const next = experience.scenarios.find((item) => item.id === id);
    const start = next && stepsById.has(next.startStepId) ? next.startStepId : experience.steps.find((item) => item.scenarioId === id)?.id ?? "";
    setScenarioId(id); setStepId(start); setTrail([]);
  }

  function restart() {
    if (scenario) selectScenario(scenario.id);
  }

  function goBack() {
    const previous = trail.at(-1);
    if (!previous) return;
    setStepId(previous.stepId);
    setTrail((value) => value.slice(0, -1));
  }

  if (!scenario) return <div>
    <div className="max-w-2xl"><p className="text-[11px] font-semibold text-accent">CHOOSE A SCENARIO</p><h3 className="mt-2 font-display text-2xl font-semibold text-foreground">Where would you like to start?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Run the primary flow first so everyone shares the same baseline, then push into the contested and edge-case situations.</p></div>
    <div className="mt-6 grid gap-3 md:grid-cols-2">{orderedScenarios.map((item) => {
      const scenarioPersona = experience.personas.find((person) => person.id === item.personaId);
      const priority = item.priority;
      return <button key={item.id} type="button" onClick={() => selectScenario(item.id)} className="group border border-border bg-card p-5 text-left transition-colors hover:border-accent hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span className="flex items-start justify-between gap-4"><span className="min-w-0">{priority && <span className={cn("mb-2 inline-flex border px-2 py-0.5 text-[10px] font-semibold", PRIORITY_STYLE[priority])}>{SCENARIO_PRIORITY_LABEL[priority]}</span>}<span className="block text-base font-semibold text-foreground">{item.name}</span>{scenarioPersona && <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-primary"><Users className="size-3" />You play {scenarioPersona.role} — {scenarioPersona.name}</span>}</span><Play className="mt-1 size-4 shrink-0 text-accent" /></span>
        <span className="mt-3 block text-[13px] leading-6 text-muted-foreground">{item.premise}</span>
        {item.focus && <span className="mt-3 block border-l-2 border-accent pl-3 text-[12px] leading-5 text-foreground">Tests: {item.focus}</span>}
      </button>;
    })}</div>
  </div>;

  return <div className="mx-auto max-w-4xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><p className="text-[11px] font-semibold text-accent">{scenario.name}{scenario.priority ? ` · ${SCENARIO_PRIORITY_LABEL[scenario.priority]}` : ""}</p><p className="mt-1 text-[12px] text-muted-foreground">Step {currentPosition} of approximately {scenarioSteps.length}</p></div>
      <div className="flex gap-2"><Button size="sm" variant="ghost" disabled={!trail.length} onClick={goBack}><ArrowLeft className="size-3.5" /> Back</Button><Button size="sm" variant="ghost" onClick={restart}><RotateCcw className="size-3.5" /> Restart</Button><Button size="sm" variant="outline" onClick={() => { setScenarioId(""); setStepId(""); setTrail([]); }}>Change scenario</Button></div>
    </div>

    {step ? <section className="border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <span className="text-[11px] font-semibold text-muted-foreground">{step.stage}</span>
        <BasisChip basis={step.basis} />
      </header>
      {persona && <div className="border-b border-border bg-secondary px-5 py-3">
        <p className="text-[11px] font-semibold text-accent">YOU ARE ACTING AS</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground"><Users className="size-4 text-primary" />{persona.role} — {persona.name}</p>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{persona.goal}</p>
        {previousPersona && <p className="mt-2 text-[11px] font-semibold text-primary">Handoff: {previousPersona.role} → {persona.role}</p>}
      </div>}
      <div className="p-5 sm:p-7">
        <h3 className="max-w-2xl text-2xl font-bold text-foreground">{step.title}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground">{step.situation}</p>
        <div className="mt-7"><p className="text-[11px] font-semibold text-accent">{persona ? `AS ${persona.role.toUpperCase()}, WHAT DO YOU DO?` : "WHAT WOULD YOU DO?"}</p><div className="mt-3 grid gap-3">{step.choices.length ? step.choices.map((choice) => <button key={choice.label} type="button" onClick={() => { setTrail((value) => [...value, { stepId: step.id, stepTitle: step.title, choice: choice.label, consequence: choice.consequence, basis: choice.basis }]); setStepId(choice.nextStepId && stepsById.has(choice.nextStepId) ? choice.nextStepId : ""); }} className="group flex w-full items-start justify-between gap-4 border border-border bg-background px-4 py-4 text-left transition-colors hover:border-accent hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><span className="min-w-0"><span className="block text-[14px] font-semibold text-foreground">{choice.label}</span><span className="mt-1 block text-[12px] leading-5 text-muted-foreground">{choice.consequence}</span></span><span className="flex shrink-0 items-center gap-2"><BasisChip basis={choice.basis}/><Play className="size-3.5 text-accent"/></span></button>) : <p className="border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground">This path ends here.</p>}</div></div>
        {step.testPrompt && <div className="mt-7 border-l-4 border-primary bg-secondary px-4 py-3"><p className="text-[11px] font-semibold text-foreground">PAUSE AND REFLECT</p><p className="mt-1 text-[13px] text-foreground">{step.testPrompt}</p></div>}
        <Accordion type="single" collapsible className="mt-5"><AccordionItem value="support"><AccordionTrigger className="text-[12px] font-semibold hover:no-underline"><span className="flex items-center gap-2"><ChevronDown className="hidden size-3" />View supporting context</span></AccordionTrigger><AccordionContent><div className="grid gap-6 border-t border-border pt-4 md:grid-cols-2">{step.dataPoints.length > 0 && <div><p className="text-[11px] font-semibold text-accent">EXAMPLE DATA</p><dl className="mt-2 divide-y divide-border">{step.dataPoints.map((item) => <div key={item.label} className="flex justify-between gap-3 py-2 text-[12px]"><dt className="text-muted-foreground">{item.label}</dt><dd className="text-right font-semibold text-foreground">{item.value}</dd></div>)}</dl></div>}{step.backstage.length > 0 && <div><p className="text-[11px] font-semibold text-accent">BEHIND THE SCENES</p><ul className="mt-2 space-y-2">{step.backstage.map((item) => <li key={`${item.role}-${item.action}`} className="text-[12px]"><span className="font-semibold text-foreground">{item.role}</span><span className="block text-muted-foreground">{item.action}</span></li>)}</ul></div>}{step.basisNote && <p className="text-[11px] text-muted-foreground">Evidence note: {step.basisNote}</p>}</div></AccordionContent></AccordionItem></Accordion>
      </div>
    </section> : <section className="border border-border bg-card px-5 py-12 text-center"><p className="text-[11px] font-semibold text-accent">SCENARIO COMPLETE</p><h3 className="mt-2 text-xl font-bold text-foreground">Review the path you took</h3><ol className="mx-auto mt-5 max-w-xl space-y-3 text-left">{trail.map((entry, index) => <li key={`${entry.stepTitle}-${index}`} className="flex gap-3 text-[13px]"><CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-accent"/><span><span className="font-semibold text-foreground">{entry.choice}</span><span className="block text-muted-foreground">{entry.consequence}</span></span></li>)}</ol><div className="mt-6 flex justify-center gap-2"><Button size="sm" onClick={restart}><RotateCcw className="size-3.5" /> Try again</Button><Button size="sm" variant="outline" onClick={() => { setScenarioId(""); setStepId(""); setTrail([]); }}>Choose another scenario</Button></div></section>}

    {trail.length > 0 && step && <Accordion type="single" collapsible className="mt-4"><AccordionItem value="path"><AccordionTrigger className="text-[12px] font-semibold hover:no-underline">Path so far · {trail.length} choice{trail.length === 1 ? "" : "s"}</AccordionTrigger><AccordionContent><ol className="space-y-2">{trail.map((entry, index) => <li key={`${entry.stepTitle}-${index}`} className="flex gap-2 text-[12px]"><CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground"/><span><span className="font-semibold text-foreground">{entry.choice}</span><span className="ml-1 text-muted-foreground">— {entry.consequence}</span></span></li>)}</ol></AccordionContent></AccordionItem></Accordion>}
  </div>;
}

export function PrototypeMetadata({ prototype, blueprintVersionId, readiness }: { prototype: PrototypeVersion; blueprintVersionId: string; readiness: number }) {
  const archetypes = prototype.strategy ? [prototype.strategy.primary, ...prototype.strategy.perspectives.map((item) => item.archetype)] : [];
  return <section className="mt-9 border-t border-border pt-5"><p className="text-[11px] font-semibold text-accent">ABOUT THIS VERSION</p><dl className="mt-3 grid gap-x-8 gap-y-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-muted-foreground">Blueprint used</dt><dd className="mt-1 font-semibold text-foreground">{blueprintVersionId}</dd></div><div><dt className="text-muted-foreground">Readiness when generated</dt><dd className="mt-1 font-semibold text-foreground">{readiness}%</dd></div><div><dt className="text-muted-foreground">Blueprint items used</dt><dd className="mt-1 font-semibold text-foreground">{prototype.findings.length}</dd></div><div><dt className="text-muted-foreground">Format</dt><dd className="mt-1 font-semibold text-foreground">{archetypes.length ? archetypes.map((item) => ARCHETYPE_LABELS[item]).join(" + ") : "Not recorded"}</dd></div></dl></section>;
}