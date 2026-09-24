import { useEffect, useState } from "react";
import { Compass, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ARCHETYPE_HINTS,
  ARCHETYPE_LABELS,
  PROTOTYPE_ARCHETYPES,
  type PrototypeArchetype,
  type PrototypeStrategy,
} from "@/lib/workshop-types";

function ListEditor({ label, hint, items, onChange }: { label: string; hint: string; items: string[]; onChange: (next: string[]) => void }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-accent">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(event) => onChange(items.map((value, i) => (i === index ? event.target.value : value)))}
              className="h-8 text-[13px]"
            />
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))} className="text-muted-foreground/70 hover:text-destructive">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => onChange([...items, ""])}>
        <Plus className="size-3.5" /> Add
      </Button>
    </div>
  );
}

export function StrategyDialog({
  open,
  onOpenChange,
  strategy,
  loading,
  error,
  generating,
  onRecommend,
  onSave,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: PrototypeStrategy | null;
  loading: boolean;
  error: string | null;
  generating: boolean;
  onRecommend: () => void;
  onSave: (strategy: PrototypeStrategy) => void;
  onGenerate: (strategy: PrototypeStrategy) => void;
}) {
  const [draft, setDraft] = useState<PrototypeStrategy | null>(strategy);

  useEffect(() => {
    setDraft(strategy);
  }, [strategy]);

  function patch(next: Partial<PrototypeStrategy>) {
    setDraft((value) => (value ? { ...value, ...next, edited: true } : value));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Compass className="size-4 text-accent" /> Prototype strategy
          </DialogTitle>
          <DialogDescription>
            How the future state should be made testable, recommended from the blueprint. Edit anything before generating.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</p>}

        {loading && !draft && (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-accent" /> Reading the blueprint and choosing a format…
          </p>
        )}

        {draft && (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold text-accent">PRIMARY FORMAT</p>
              <Select value={draft.primary} onValueChange={(value) => patch({ primary: value as PrototypeArchetype })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROTOTYPE_ARCHETYPES.map((archetype) => (
                    <SelectItem key={archetype} value={archetype}>{ARCHETYPE_LABELS[archetype]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-[12px] text-muted-foreground">{ARCHETYPE_HINTS[draft.primary]}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-accent">WHY THIS FORMAT</p>
              <Textarea value={draft.rationale} onChange={(event) => patch({ rationale: event.target.value })} className="mt-2 min-h-[84px] text-[13px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ListEditor label="WHAT IT WILL TEST" hint="Parts of the blueprint this format exercises" items={draft.tests} onChange={(tests) => patch({ tests })} />
              <ListEditor label="WHAT IT CANNOT TEST" hint="Important elements this format will not answer" items={draft.cannotTest} onChange={(cannotTest) => patch({ cannotTest })} />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-accent">ADDITIONAL PERSPECTIVES IN THE SAME PROTOTYPE</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Hybrids stay one prototype with several points of view, not separate products.</p>
              <ul className="mt-2 space-y-2">
                {draft.perspectives.map((perspective, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={perspective.archetype}
                      onValueChange={(value) => patch({ perspectives: draft.perspectives.map((item, i) => (i === index ? { ...item, archetype: value as PrototypeArchetype } : item)) })}
                    >
                      <SelectTrigger className="h-8 w-[260px] text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROTOTYPE_ARCHETYPES.map((archetype) => (
                          <SelectItem key={archetype} value={archetype}>{ARCHETYPE_LABELS[archetype]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={perspective.role}
                      placeholder="What this perspective adds…"
                      onChange={(event) => patch({ perspectives: draft.perspectives.map((item, i) => (i === index ? { ...item, role: event.target.value } : item)) })}
                      className="h-8 min-w-[180px] flex-1 text-[13px]"
                    />
                    <button type="button" aria-label="Remove perspective" onClick={() => patch({ perspectives: draft.perspectives.filter((_, i) => i !== index) })} className="text-muted-foreground/70 hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => patch({ perspectives: [...draft.perspectives, { archetype: "roleWorkspace", role: "" }] })}>
                <Plus className="size-3.5" /> Add perspective
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" disabled={loading || generating} onClick={onRecommend}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-recommend
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!draft || generating}
              onClick={() => { if (draft) { onSave(draft); onOpenChange(false); } }}
            >
              Save strategy
            </Button>
            <Button size="sm" disabled={!draft || generating} onClick={() => { if (draft) onGenerate(draft); }}>
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {generating ? "Building prototype…" : "Generate prototype"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
