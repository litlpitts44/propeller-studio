import { useState } from "react";
import { Check, ChevronRight, Info, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadinessPanel } from "@/components/workshop/ReadinessPanel";
import { cn } from "@/lib/utils";
import {
  SECTION_HINTS,
  SECTION_KEYS,
  SECTION_LABELS,
  type Finding,
  type InterpretationType,
  type QuestionOverride,
  type Readiness,
  type ReadinessGate,
  type SectionKey,
} from "@/lib/workshop-types";

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-accent/15 text-accent-foreground border-accent/40",
  medium: "bg-muted text-muted-foreground border-border",
  low: "bg-background text-muted-foreground border-dashed border-border",
};

type UnderstandingGroup = "context" | "emerging" | "decisions" | "unresolved";

const GROUPS: { key: UnderstandingGroup; label: string; hint: string }[] = [
  { key: "context", label: "Known context", hint: "Established observations and background evidence" },
  { key: "emerging", label: "Emerging future state", hint: "Developing proposals and design elements" },
  { key: "decisions", label: "Confirmed decisions", hint: "Choices explicitly agreed in the workshop" },
  { key: "unresolved", label: "Still unresolved", hint: "Questions, conflicts, and hypotheses to validate" },
];

const TYPE_LABEL: Record<InterpretationType, string> = {
  observation: "Observation",
  hypothesis: "Hypothesis",
  proposal: "Proposal",
  confirmedDecision: "Confirmed decision",
};

function groupFor(finding: Finding): UnderstandingGroup {
  if (finding.status === "stale" || finding.section === "questions" || finding.section === "assumptions" || finding.interpretationType === "hypothesis") return "unresolved";
  if (finding.status === "confirmed" || finding.interpretationType === "confirmedDecision") return "decisions";
  if (finding.sourceOrigin === "background" && finding.interpretationType === "observation") return "context";
  return "emerging";
}

function FindingRow({
  finding,
  readOnly,
  onUpdate,
}: {
  finding: Finding;
  readOnly?: boolean | undefined;
  onUpdate: (patch: Partial<Finding>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(finding.title);
  const [detail, setDetail] = useState(finding.detail);
  const [open, setOpen] = useState(false);

  if (editing) {
    return (
      <li className="rounded-md border border-foreground/30 bg-card p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[13px]" />
        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="mt-2 min-h-[64px] text-[13px]"
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onUpdate({ title, detail, edited: true, status: "current" });
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group rounded-md border bg-card px-3 py-2 transition-colors",
        finding.status === "dismissed" && "opacity-40",
        finding.status === "new" ? "border-accent/60 bg-accent/5" : "border-border",
        finding.status === "stale" && "border-dashed",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 text-muted-foreground/60 hover:text-foreground"
          aria-label="Show evidence"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">{finding.title}</span>
            <span
              className={cn(
                "rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase",
                CONFIDENCE_STYLE[finding.confidence],
              )}
            >
              {finding.confidence}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {finding.sourceOrigin === "background" ? "Background" : "Live"} · {TYPE_LABEL[finding.interpretationType]}
            </span>
            {finding.status === "new" && (
              <span className="text-[10px] font-semibold uppercase text-accent">
                new
              </span>
            )}
            {finding.status === "stale" && (
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                no longer evidenced
              </span>
            )}
            {finding.status === "confirmed" && (
              <Check className="size-3.5 text-accent" aria-label="Confirmed" />
            )}
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {finding.detail}
          </p>
          {open && finding.excerpt && (
            <div className="mt-2 border-l-2 border-accent/50 pl-3">
              <blockquote className="text-[12px] italic leading-relaxed text-muted-foreground">“{finding.excerpt}”</blockquote>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {finding.sourceOrigin === "background" ? "Background material" : "Live workshop"} · {TYPE_LABEL[finding.interpretationType]} · Introduced {new Date(finding.firstIntroducedAt).toLocaleString()}
                {finding.lastChangedAt > finding.firstIntroducedAt ? ` · Updated ${new Date(finding.lastChangedAt).toLocaleString()}` : ""}
              </p>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label="Confirm"
              onClick={() => onUpdate({ status: "confirmed" })}
              className="text-muted-foreground/60 hover:text-accent"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => setEditing(true)}
              className="text-muted-foreground/60 hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() =>
                onUpdate({ status: finding.status === "dismissed" ? "current" : "dismissed" })
              }
              className="text-muted-foreground/60 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function UnderstandingPanel({
  findings,
  running,
  error,
  readOnly,
  onUpdateFinding,
  readiness,
  gate,
  onUpdateQuestion,
}: {
  findings: Finding[];
  running: boolean;
  error: string | null;
  readOnly?: boolean | undefined;
  onUpdateFinding: (id: string, patch: Partial<Finding>) => void;
  readiness?: Readiness | undefined;
  gate: ReadinessGate;
  onUpdateQuestion: (key: string, patch: QuestionOverride) => void;
}) {
  const bySection = (key: SectionKey) => findings.filter((f) => f.section === key);
  const hasAny = findings.length > 0;

  return (
    <div className="flex h-full flex-col bg-secondary/30">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <h2 className="text-xs font-semibold text-accent">
          Live understanding
        </h2>
        {running && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-accent">
            <Loader2 className="size-3 animate-spin" /> updating…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <ReadinessPanel
          readiness={readiness}
          gate={gate}
          readOnly={readOnly}
          onUpdateQuestion={onUpdateQuestion}
        />

        <details className="group mb-6 rounded-md border border-border bg-card px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold text-foreground">
            <Info className="size-3.5 text-accent" /> How confidence works
            <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-3">
            <p><span className="font-semibold text-foreground">High</span><br />Explicitly stated.</p>
            <p><span className="font-semibold text-foreground">Medium</span><br />Strongly implied.</p>
            <p><span className="font-semibold text-foreground">Low</span><br />An inference to validate.</p>
          </div>
        </details>
        {error && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </p>
        )}

        {!hasAny && !running && !error && (
          <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Understanding builds itself as input arrives. Add a transcript chunk or a note on the
            left and the picture of the future state starts filling in here.
          </p>
        )}

        <Tabs defaultValue="emerging">
          <div className="overflow-x-auto border-b border-border">
            <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
              {GROUPS.map((group) => {
                const count = findings.filter((finding) => groupFor(finding) === group.key && finding.status !== "dismissed").length;
                return <TabsTrigger key={group.key} value={group.key} className="rounded-none border-b-[3px] border-transparent px-3 py-3 text-[11px] shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none">{group.label} <span className="text-muted-foreground">{count}</span></TabsTrigger>;
              })}
            </TabsList>
          </div>
          {GROUPS.map((group) => (
            <TabsContent key={group.key} value={group.key} className="mt-0 pt-5">
              <div className="mb-5 border-l-2 border-accent pl-3">
                <h3 className="text-base font-bold text-foreground">{group.label}</h3>
                <p className="text-[12px] text-muted-foreground">{group.hint}</p>
              </div>
              <div className="space-y-7">
          {SECTION_KEYS.map((key) => {
            const items = bySection(key).filter((finding) => groupFor(finding) === group.key);
            if (!items.length) return null;
            return (
              <section key={key} id={`section-${group.key}-${key}`}>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[15px] font-bold text-foreground">
                    {SECTION_LABELS[key]}
                  </h3>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {items.length}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground/70">
                    {SECTION_HINTS[key]}
                  </span>
                </div>

                {key === "process" ? (
                  <ol className="mt-2 flex flex-wrap items-stretch gap-1.5">
                    {items.map((f, i) => (
                      <li key={f.id} className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "rounded-md border bg-card px-3 py-2",
                            f.status === "new" ? "border-accent/60 bg-accent/5" : "border-border",
                            f.status === "dismissed" && "opacity-40",
                          )}
                          title={f.detail}
                        >
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Step {i + 1}
                          </span>
                          <p className="text-[13px] font-semibold text-foreground">{f.title}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{f.sourceOrigin === "background" ? "Background" : "Live"} · {TYPE_LABEL[f.interpretationType]}</p>
                        </div>
                        {i < items.length - 1 && (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {items.map((f) => (
                      <FindingRow
                        key={f.id}
                        finding={f}
                        readOnly={readOnly}
                        onUpdate={(patch) => onUpdateFinding(f.id, patch)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
