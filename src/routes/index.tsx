import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkshops, workshopRepo } from "@/lib/workshop-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Workshops — Propeller Studio" },
      {
        name: "description",
        content:
          "Every future-state design workshop you are running, with its objective, captured input and interpretation history.",
      },
      { property: "og:title", content: "Workshops — Propeller Studio" },
      {
        property: "og:description",
        content:
          "Every future-state design workshop you are running, with its objective, captured input and interpretation history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function relative(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

function Dashboard() {
  const workshops = useWorkshops();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-[3px] border-t-accent border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <Layers className="size-5 text-accent" />
          <div>
            <p className="text-lg font-bold text-foreground">
              Propeller Studio
            </p>
            <p className="text-[12px] text-muted-foreground">
              Future-state design workshop facilitation
            </p>
          </div>
          <Button asChild size="sm" className="ml-auto">
            <Link to="/workshops/new">
              <Plus className="size-3.5" /> New workshop
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[11px] font-semibold text-accent">WORKSHOP PORTFOLIO</p>
        <h1 className="mt-2 text-4xl font-bold text-foreground">
          Workshops
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture the room on the left, watch the future state take shape on the right.
        </p>

        {workshops.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-border bg-card px-8 py-16 text-center">
            <p className="text-base font-bold text-foreground">
              No workshops yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start one with a name and the future state you are designing. Add the transcript,
              background documents and your notes as the session runs.
            </p>
            <Button asChild className="mt-6">
              <Link to="/workshops/new">
                Create your first workshop <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {workshops.map((w) => (
              <li key={w.id} className="group flex items-center gap-4 px-5 py-4">
                <Link
                  to="/workshops/$workshopId"
                  params={{ workshopId: w.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="text-[15px] font-bold text-foreground">
                    {w.name}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {w.objective || "No objective set"}
                  </p>
                </Link>
                <dl className="hidden shrink-0 gap-6 text-right sm:flex">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Captures
                    </dt>
                    <dd className="text-[13px] tabular-nums text-foreground">
                      {w.captures.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Versions
                    </dt>
                    <dd className="text-[13px] tabular-nums text-foreground">
                      {w.versions.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Updated
                    </dt>
                    <dd className="text-[13px] text-foreground">{relative(w.updatedAt)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  aria-label="Delete workshop"
                  onClick={() => workshopRepo.remove(w.id)}
                  className="shrink-0 text-muted-foreground/40 opacity-0 transition hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
