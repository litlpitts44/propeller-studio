import { useState } from "react";
import { Check, ChevronRight, CircleAlert, Clock, Pencil, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GATE_LABEL,
  IMPACT_LABEL,
  type QuestionImpact,
  type QuestionOverride,
  type Readiness,
  type ReadinessGate,
  type ReadinessQuestion,
} from "@/lib/workshop-types";

const GATE_STYLE: Record<ReadinessGate, string> = {
  ready: "border-accent bg-accent/10 text-foreground",
  assumptions: "border-border bg-muted text-foreground",
  decisions: "border-dashed border-border bg-card text-foreground",
};

const GATE_BLURB: Record<ReadinessGate, string> = {
  ready: "Everything this kind of prototype needs is evidenced.",
  assumptions: "A prototype can be generated now, with open points carried as labelled assumptions.",
  decisions: "One or more blocking questions must be answered, assumed, or deferred first.",
};

const IMPACT_STYLE: Record<QuestionImpact, string> = {
  blocking: "border-destructive/50 bg-destructive/10 text-destructive",
  important: "border-accent/50 bg-accent/10 text-accent-foreground",
  defer: "border-border bg-muted text-muted-foreground",
};

const IMPACT_ORDER: QuestionImpact[] = ["blocking", "important", "defer"];

const STATUS_LABEL: Record<ReadinessQuestion["status"], string> = {
  open: "Open",
  resolved: "Resolved",
  assumed: "Working assumption",
  deferred: "Deferred",
};

function QuestionRow({
  question,
  readOnly,
  onUpdate,
}: {
  question: ReadinessQuestion;
  readOnly?: boolean | undefined;
  onUpdate: (patch: QuestionOverride) => void;
}) {
  const [mode, setMode] = useState<"none" | "resolve" | "assume" | "edit">("none");
  const [value, setValue] = useState("");
  const [text, setText] = useState(question.question);

  return (
    <li className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase", IMPACT_STYLE[question.impact])}>
          {IMPACT_LABEL[question.impact]}
        </span>
        {question.status !== "open" && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {question.status === "resolved" ? <Check className="size-3" /> : question.status === "deferred" ? <Clock className="size-3" /> : <ShieldQuestion className="size-3" />}
            {STATUS_LABEL[question.status]}
          </span>
        )}
      </div>

      {mode === "edit" ? (
        <div className="mt-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} className="text-[13px]" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { onUpdate({ status: question.status, question: text }); setMode("none"); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-[13px] font-semibold leading-relaxed text-foreground">{question.question}</p>
      )}

      {question.impact === "blocking" && question.why && (
        <p className="mt-1 flex gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          {question.why}
        </p>
      )}
      {question.impact !== "blocking" && question.why && (
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{question.why}</p>
      )}

      {question.answer && question.status === "resolved" && (
        <p className="mt-2 border-l-2 border-accent pl-2 text-[12px] text-foreground"><span className="font-semibold">Resolved:</span> {question.answer}</p>
      )}
      {question.assumption && question.status === "assumed" && (
        <p className="mt-2 border-l-2 border-dashed border-accent pl-2 text-[12px] text-foreground"><span className="font-semibold">Assumption:</span> {question.assumption}</p>
      )}

      {!readOnly && (mode === "resolve" || mode === "assume") && (
        <div className="mt-2">
          <Textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "resolve" ? "What did the group decide?" : "Temporary assumption to design against…"}
            className="min-h-[60px] text-[13px]"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={!value.trim()}
              onClick={() => {
                onUpdate(mode === "resolve"
                  ? { status: "resolved", answer: value.trim() }
                  : { status: "assumed", assumption: value.trim() });
                setValue("");
                setMode("none");
              }}
            >
              {mode === "resolve" ? "Save decision" : "Use as assumption"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setValue(""); setMode("none"); }}>Cancel</Button>
          </div>
        </div>
      )}

      {!readOnly && mode === "none" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode("resolve")}>Resolve</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setMode("assume")}>Assume</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onUpdate({ status: question.status === "deferred" ? "open" : "deferred" })}>
            {question.status === "deferred" ? "Reopen" : "Defer"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setMode("edit")}><Pencil className="size-3" /> Edit</Button>
          {question.status !== "open" && question.status !== "deferred" && (
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onUpdate({ status: "open" })}>Reopen</Button>
          )}
        </div>
      )}
    </li>
  );
}

export function ReadinessPanel({
  readiness,
  gate,
  readOnly,
  onUpdateQuestion,
}: {
  readiness?: Readiness | undefined;
  gate: ReadinessGate;
  readOnly?: boolean | undefined;
  onUpdateQuestion: (key: string, patch: QuestionOverride) => void;
}) {
  const questions = readiness?.questions ?? [];
  const requirements = readiness?.requirements ?? [];
  const blockingOpen = questions.filter((q) => q.impact === "blocking" && q.status === "open");

  return (
    <section className="mb-6 border-b border-border pb-5">
      <p className="text-[11px] font-semibold text-accent">PROTOTYPE READINESS</p>
      <div className={cn("mt-2 rounded-md border px-4 py-3", GATE_STYLE[gate])}>
        <p className="font-display text-[17px] font-semibold">{GATE_LABEL[gate]}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{GATE_BLURB[gate]}</p>
        {readiness?.prototypeKind && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Judged as: <span className="font-semibold text-foreground">{readiness.prototypeKind}</span>
            {typeof readiness.score === "number" && <span> · rough confidence {Math.round(readiness.score / 10) * 10}%</span>}
          </p>
        )}
      </div>

      {blockingOpen.length > 0 && (
        <p className="mt-3 text-[12px] text-foreground">
          <span className="font-semibold">{blockingOpen.length} blocking question{blockingOpen.length > 1 ? "s" : ""}</span> — resolve, assume, or defer to unlock a prototype.
        </p>
      )}

      {requirements.length > 0 && (
        <details className="group mt-3 rounded-md border border-border bg-card px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold text-foreground">
            What this kind of prototype needs
            <span className="text-muted-foreground">{requirements.filter((r) => r.met).length}/{requirements.length}</span>
            <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <ul className="mt-2 space-y-1.5">
            {requirements.map((requirement) => (
              <li key={requirement.label} className="flex gap-2 text-[12px]">
                <span className={cn("mt-0.5 size-2 shrink-0 rounded-full", requirement.met ? "bg-accent" : "bg-muted-foreground/40")} />
                <span>
                  <span className="font-semibold text-foreground">{requirement.label}</span>
                  <span className="text-muted-foreground"> — {requirement.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {questions.length > 0 && (
        <div className="mt-4 space-y-4">
          {IMPACT_ORDER.map((impact) => {
            const items = questions.filter((q) => q.impact === impact);
            if (!items.length) return null;
            return (
              <div key={impact}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {IMPACT_LABEL[impact]} <span className="tabular-nums">{items.length}</span>
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {items.map((question) => (
                    <QuestionRow
                      key={question.key}
                      question={question}
                      readOnly={readOnly}
                      onUpdate={(patch) => onUpdateQuestion(question.key, patch)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {questions.length === 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          {readiness?.rationale ?? "Readiness fills in as the workshop understanding develops."}
        </p>
      )}
    </section>
  );
}
