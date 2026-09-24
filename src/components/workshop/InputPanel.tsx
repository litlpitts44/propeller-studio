import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Mic,
  NotebookPen,
  Plus,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_FILE_TYPES, readWorkshopFile, readWorkshopFiles } from "@/lib/read-file";
import { blobToBase64, startRoomRecorder, type RoomRecorder } from "@/lib/room-recorder";
import { transcribeSegment } from "@/lib/transcribe.functions";
import { cn } from "@/lib/utils";
import { CAPTURE_LABELS, type Capture, type CaptureKind } from "@/lib/workshop-types";

const SEGMENT_MS = 25000;

const KIND_ICON: Record<CaptureKind, typeof Mic> = {
  transcript: Mic,
  document: FileText,
  note: NotebookPen,
  artifact: ImageIcon,
};

const KIND_PLACEHOLDER: Record<CaptureKind, string> = {
  transcript: "Paste what was said in the room…",
  document: "Paste document text, or drop a file below (PDF, Word, PowerPoint)…",
  note: "Your own observation from the session…",
  artifact: "Describe the whiteboard, sketch or sticky wall — or upload the photo…",
};

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InputPanel({
  captures,
  onAdd,
  onRemove,
  readOnly,
}: {
  captures: Capture[];
  onAdd: (capture: Omit<Capture, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean | undefined;
}) {
  const [kind, setKind] = useState<CaptureKind>("transcript");
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<
    { name: string; text: string; imageDataUrl?: string }[]
  >([]);
  const [image, setImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const [fileNotes, setFileNotes] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const transcribe = useServerFn(transcribeSegment);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<RoomRecorder | null>(null);
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;

  useEffect(() => {
    return () => {
      void recorderRef.current?.stop();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  async function handleSegment(wav: Blob) {
    setTranscribing((n) => n + 1);
    try {
      const audioBase64 = await blobToBase64(wav);
      const result = (await transcribe({ data: { audioBase64 } })) as { text: string };
      const said = result.text.trim();
      if (said) {
        onAddRef.current({
          kind: "transcript",
          title: `Room audio · ${timeOf(Date.now())}`,
          text: said,
        });
      }
    } catch (e) {
      setMicError(
        e instanceof Error ? e.message : "That stretch of audio could not be transcribed.",
      );
    } finally {
      setTranscribing((n) => Math.max(0, n - 1));
    }
  }

  async function toggleRecording() {
    setMicError(null);
    if (recording) {
      const rec = recorderRef.current;
      recorderRef.current = null;
      setRecording(false);
      await rec?.stop();
      return;
    }
    try {
      recorderRef.current = await startRoomRecorder({
        segmentMs: SEGMENT_MS,
        onSegment: (wav) => void handleSegment(wav),
      });
      setRecording(true);
      setRecordingSeconds(0);
    } catch {
      setMicError("Microphone access is needed to record the room.");
    }
  }

  const kinds: CaptureKind[] = ["transcript", "document", "note", "artifact"];

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setReading(true);
    setFileNotes([]);
    const read = await readWorkshopFiles(files);
    setReading(false);
    setFileNotes(read.filter((r) => r.error).map((r) => r.error as string));
    const usable = read.filter((r) => r.text.trim() || r.imageDataUrl);
    setPendingFiles((prev) => [
      ...prev,
      ...usable.map((r) => ({
        name: r.name,
        text: r.text,
        ...(r.imageDataUrl ? { imageDataUrl: r.imageDataUrl } : {}),
      })),
    ]);
  }

  async function handleImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setReading(true);
    const result = await readWorkshopFile(file);
    setReading(false);
    if (result.imageDataUrl) {
      setImage({ name: result.name, dataUrl: result.imageDataUrl });
      setFileNotes([]);
    } else {
      setFileNotes([result.error ?? `${result.name} could not be read as an image.`]);
    }
  }

  function submit() {
    if (pendingFiles.length) {
      pendingFiles.forEach((f) =>
        onAdd({
          kind: f.imageDataUrl ? "artifact" : "document",
          title: f.name,
          text: f.text.slice(0, 40000),
          ...(f.imageDataUrl ? { imageDataUrl: f.imageDataUrl } : {}),
        }),
      );
      setPendingFiles([]);
    }
    const body = text.trim();
    if (body || image) {
      onAdd({
        kind,
        title:
          kind === "artifact" && image
            ? image.name
            : `${CAPTURE_LABELS[kind]} · ${timeOf(Date.now())}`,
        text: body || (image ? "Workshop artifact captured with no description." : ""),
        ...(image ? { imageDataUrl: image.dataUrl } : {}),
      });
    }
    setText("");
    setImage(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-xs font-semibold text-accent">
          Live workshop
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {captures.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Start recording to capture the room, or add documents, notes, and workshop artifacts.
          </p>
        ) : (
          <ol className="space-y-3">
            {captures.map((c) => {
              const Icon = KIND_ICON[c.kind];
              return (
                <li
                  key={c.id}
                  className="group rounded-md border border-border bg-card px-4 py-3 shadow-[0_1px_0_0_var(--color-border)]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-accent" />
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {CAPTURE_LABELS[c.kind]}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">
                      {timeOf(c.createdAt)}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onRemove(c.id)}
                        aria-label="Remove entry"
                        className="ml-auto text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-foreground">{c.title}</p>
                  {c.imageDataUrl && (
                    <img
                      src={c.imageDataUrl}
                      alt={c.title}
                      className="mt-2 max-h-48 w-full rounded border border-border object-cover"
                    />
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                    {c.text.length > 900 ? `${c.text.slice(0, 900)}…` : c.text}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {!readOnly && (
        <div
          className="border-t border-border bg-secondary/40 px-5 py-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex flex-wrap gap-1">
            {kinds.map((k) => {
              const Icon = KIND_ICON[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
                    kind === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3" />
                  {CAPTURE_LABELS[k]}
                </button>
              );
            })}
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={KIND_PLACEHOLDER[kind]}
            className="mt-3 min-h-[92px] resize-y border-border bg-background text-[13px]"
          />

          {reading && (
            <p className="mt-2 text-[12px] text-muted-foreground">Reading file…</p>
          )}
          {fileNotes.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {fileNotes.map((note) => (
                <li key={note} className="text-[12px] text-destructive">
                  {note}
                </li>
              ))}
            </ul>
          )}
          {pendingFiles.length > 0 && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              {pendingFiles.map((f) => f.name).join(", ")} ready to add
            </p>
          )}
          {image && <p className="mt-2 text-[12px] text-muted-foreground">{image.name} attached</p>}

          <div className={cn("mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-3", recording ? "border-destructive/40 bg-destructive/5" : "border-border bg-background")}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  recording ? "animate-pulse bg-destructive" : "bg-muted-foreground/30",
                )}
              />
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                {recording ? "Recording live workshop" : "Live transcript"}
              </span>
              {transcribing > 0 && (
                <span className="text-[11px] text-muted-foreground/80">adding transcript…</span>
              )}
              {recording && <span className="font-mono text-[11px] tabular-nums text-foreground">{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>}
            </div>
            <Button
              type="button"
              size="sm"
              variant={recording ? "destructive" : "outline"}
              onClick={() => void toggleRecording()}
            >
              {recording ? (
                <>
                  <Square className="size-3.5" /> Stop
                </>
              ) : (
                <>
                  <Mic className="size-3.5" /> Start recording
                </>
              )}
            </Button>
          </div>
          {micError && <p className="mt-2 text-[12px] text-destructive">{micError}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImage(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" /> Upload file
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageRef.current?.click()}
            >
              <ImageIcon className="size-3.5" /> Artifact
            </Button>
            <Button
              type="button"
              size="sm"
              className="ml-auto max-sm:w-full"
              disabled={!text.trim() && !pendingFiles.length && !image}
              onClick={submit}
            >
              <Plus className="size-3.5" /> Add to workshop
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
