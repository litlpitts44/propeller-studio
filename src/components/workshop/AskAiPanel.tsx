import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { suggestImprovement } from "@/lib/interpret.functions";
import type { Capture, Finding } from "@/lib/workshop-types";

type Improvement = { question: string; why: string; answers: string[] };

export function AskAiPanel({
  objective,
  captures,
  findings,
  onApply,
}: {
  objective: string;
  captures: Capture[];
  findings: Finding[];
  onApply: (question: string, answer: string) => void;
}) {
  const suggest = useServerFn(suggestImprovement);
  const [improvement, setImprovement] = useState<Improvement | null>(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadImprovement() {
    setBusy(true);
    setError(null);
    try {
      const result = await suggest({
        data: {
          objective,
          captures: captures.map((capture) => ({ id: capture.id, kind: capture.kind, title: capture.title, text: capture.text, createdAt: capture.createdAt })),
          findings: findings.map((finding) => ({
            section: finding.section,
            title: finding.title,
            detail: finding.detail,
            confidence: finding.confidence,
          })),
        },
      });
      setImprovement(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "An improvement could not be suggested right now.");
    } finally {
      setBusy(false);
    }
  }

  function apply(answer: string) {
    if (!improvement || !answer.trim()) return;
    onApply(improvement.question, answer.trim());
    setOpen(false);
    setImprovement(null);
    setCustom("");
  }

  return (
    <Sheet open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next && !improvement && !busy) void loadImprovement();
    }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Lightbulb className="size-3.5" /> AI Improvements
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display tracking-tight">AI Improvements</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
          <p className="text-[13px] text-muted-foreground">
            Resolve the most important gap in the blueprint. Your answer becomes a workshop decision.
          </p>
          {busy && <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Finding the highest-impact gap…</div>}
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</p>}
          {improvement && (
            <div className="space-y-4">
              <div className="border-l-2 border-accent pl-3">
                <p className="font-display text-base font-semibold text-foreground">{improvement.question}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{improvement.why}</p>
              </div>
              <div className="space-y-2">
                {improvement.answers.map((answer) => (
                  <Button key={answer} type="button" variant="outline" onClick={() => apply(answer)} className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left text-[13px] leading-relaxed">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" /> {answer}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Enter the group’s answer…" className="text-[13px]" />
                <Button onClick={() => apply(custom)} disabled={!custom.trim()}>Apply</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}