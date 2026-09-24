import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_FILE_TYPES, readWorkshopFiles } from "@/lib/read-file";
import { workshopRepo } from "@/lib/workshop-store";
import { newId, type Capture, type Participant } from "@/lib/workshop-types";

export const Route = createFileRoute("/workshops/new")({
  head: () => ({
    meta: [
      { title: "New workshop — Propeller Studio" },
      {
        name: "description",
        content:
          "Name the session, state the future state you are designing, and drop in any background documents.",
      },
      { property: "og:title", content: "New workshop — Propeller Studio" },
      {
        property: "og:description",
        content:
          "Name the session, state the future state you are designing, and drop in any background documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewWorkshop,
});

function NewWorkshop() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [docs, setDocs] = useState<{ name: string; text: string; imageDataUrl?: string }[]>([]);
  const [fileNotes, setFileNotes] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setReading(true);
    setFileNotes([]);
    const read = await readWorkshopFiles(files);
    setReading(false);
    setFileNotes(read.filter((r) => r.error).map((r) => r.error as string));
    setDocs((prev) => [
      ...prev,
      ...read
        .filter((r) => r.text.trim() || r.imageDataUrl)
        .map((r) => ({
          name: r.name,
          text: r.text,
          ...(r.imageDataUrl ? { imageDataUrl: r.imageDataUrl } : {}),
        })),
    ]);
  }

  function addParticipant() {
    if (!pName.trim()) return;
    setParticipants((prev) => [
      ...prev,
      { id: newId("p"), name: pName.trim(), role: pRole.trim() || "Participant" },
    ]);
    setPName("");
    setPRole("");
  }

  function create() {
    if (!name.trim()) return;
    const captures: Capture[] = docs.map((d) => ({
      id: newId("cap"),
      kind: d.imageDataUrl ? "artifact" : "document",
      title: d.name,
      text: d.text.slice(0, 40000),
      ...(d.imageDataUrl ? { imageDataUrl: d.imageDataUrl } : {}),
      createdAt: Date.now(),
    }));
    const workshop = workshopRepo.create({
      name: name.trim(),
      objective: objective.trim(),
      participants,
      captures,
    });
    void navigate({ to: "/workshops/$workshopId", params: { workshopId: workshop.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-[3px] border-t-accent border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Workshops
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-[11px] font-semibold text-accent">NEW ENGAGEMENT</p>
        <h1 className="mt-2 text-4xl font-bold text-foreground">
          Start a workshop
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Two things matter here. Everything else can arrive during the session.
        </p>

        <div className="mt-8 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Workshop name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Employee onboarding — future state"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objective">Objective</Label>
            <Textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What future state are we designing, and for whom?"
              className="min-h-[90px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Background documents (optional)</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleFiles(e.dataTransfer.files);
              }}
              className="rounded-md border border-dashed border-border bg-card px-5 py-7 text-center"
            >
              <p className="text-[13px] text-muted-foreground">
                Drop transcripts, PDFs, Word docs, PowerPoint decks or photos here, or{" "}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="font-medium text-accent underline underline-offset-2"
                >
                  browse
                </button>
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              {reading && (
                <p className="mt-3 text-[12px] text-muted-foreground">Reading files…</p>
              )}
              {fileNotes.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-left">
                  {fileNotes.map((note) => (
                    <li key={note} className="text-[12px] text-destructive">
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              {docs.length > 0 && (
                <ul className="mt-4 space-y-1 text-left">
                  {docs.map((d, i) => (
                    <li
                      key={`${d.name}-${i}`}
                      className="flex items-center gap-2 text-[13px] text-foreground"
                    >
                      <Upload className="size-3.5 text-accent" />
                      {d.name}
                      <button
                        type="button"
                        aria-label="Remove document"
                        onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                        className="ml-auto text-muted-foreground/60 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Participants (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Name"
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              />
              <Input
                value={pRole}
                onChange={(e) => setPRole(e.target.value)}
                placeholder="Role"
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              />
              <Button type="button" variant="outline" onClick={addParticipant}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {participants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-2 py-1 text-[12px] text-foreground"
                  >
                    {p.name}
                    <span className="text-muted-foreground">{p.role}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${p.name}`}
                      onClick={() =>
                        setParticipants((prev) => prev.filter((x) => x.id !== p.id))
                      }
                      className="text-muted-foreground/60 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button size="lg" disabled={!name.trim()} onClick={create}>
            Create workshop
          </Button>
        </div>
      </main>
    </div>
  );
}
