import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHANGE_LABEL, type BlueprintChange } from "@/lib/blueprint-diff";
import type { PrototypeVersion } from "@/lib/workshop-types";

const KIND_STYLE: Record<string, string> = {
  decisionChanged: "border-accent text-accent",
  decisionAgreed: "border-primary text-primary",
  assumptionChallenged: "border-muted-foreground border-dashed text-muted-foreground",
  assumptionAdded: "border-muted-foreground border-dashed text-muted-foreground",
  resolved: "border-primary text-primary",
  dropped: "border-muted-foreground text-muted-foreground",
};

export function ChangesSincePrototype({
  baseName,
  changes,
  confirmedCount,
  nextName,
  generating,
  onGenerate,
}: {
  baseName: string;
  changes: BlueprintChange[];
  confirmedCount: number;
  nextName: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (!changes.length) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 text-[12px] text-muted-foreground sm:px-6">
        <span>Nothing new since {baseName} — the workshop keeps confirming the current picture.</span>
      </div>
    );
  }
  return (
    <div className="border-b border-border bg-card px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-left text-[13px] font-semibold text-foreground">
          {open ? <ChevronDown className="size-3.5 text-accent" /> : <ChevronRight className="size-3.5 text-accent" />}
          {changes.length} meaningful change{changes.length === 1 ? "" : "s"} since {baseName}
        </button>
        {confirmedCount > 0 && <span className="text-[11px] text-muted-foreground">{confirmedCount} item{confirmedCount === 1 ? "" : "s"} unchanged</span>}
        <Button size="sm" className="ml-auto" disabled={generating} onClick={onGenerate}>
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {generating ? "Building…" : `Generate ${nextName}`}
        </Button>
      </div>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {changes.slice(0, 8).map((change) => (
            <li key={change.id} className="flex flex-wrap items-baseline gap-2 text-[12px]">
              <span className={cn("border px-1.5 py-px text-[10px] font-semibold", KIND_STYLE[change.kind] ?? "border-border text-muted-foreground")}>
                {CHANGE_LABEL[change.kind]}
              </span>
              <span className="font-medium text-foreground">{change.title}</span>
              <span className="text-muted-foreground">{change.detail}</span>
            </li>
          ))}
          {changes.length > 8 && <li className="text-[11px] text-muted-foreground">+ {changes.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}

export function PrototypeHistory({
  prototypes,
  selectedId,
  blueprintLabel,
  onSelect,
}: {
  prototypes: PrototypeVersion[];
  selectedId: string | null;
  blueprintLabel: (versionId: string) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="mb-5 flex flex-wrap gap-2">
      {prototypes.map((prototype) => (
        <li key={prototype.id}>
          <button
            type="button"
            onClick={() => onSelect(prototype.id)}
            className={cn(
              "border px-3 py-2 text-left",
              prototype.id === selectedId ? "border-accent bg-card" : "border-border bg-card/60 hover:border-accent",
            )}
          >
            <span className="block text-[12px] font-semibold text-foreground">{prototype.name}</span>
            <span className="block text-[10px] text-muted-foreground">
              {new Date(prototype.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {blueprintLabel(prototype.sourceVersionId)}
              {prototype.assumptions?.length ? ` · ${prototype.assumptions.length} assumption${prototype.assumptions.length === 1 ? "" : "s"}` : ""}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
