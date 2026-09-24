import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranscribeInput = z.object({
  /** base64-encoded 16 kHz mono WAV file (no data: prefix) */
  audioBase64: z.string().min(1),
});

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const transcribeSegment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const bytes = base64ToBytes(data.audioBase64);
    if (bytes.byteLength < 2048) return { text: "" };
    if (bytes.byteLength > 20 * 1024 * 1024)
      throw new Error("That recording segment is too large to transcribe.");

    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append(
      "file",
      new Blob([bytes as unknown as BlobPart], { type: "audio/wav" }),
      "segment.wav",
    );

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 402)
        throw new Error("AI credits are exhausted. Add credits to keep transcribing.");
      if (res.status === 429)
        throw new Error("Transcription is busy right now. Try again in a moment.");
      throw new Error(`Transcription failed (${res.status}). ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { text?: string };
    return { text: (payload.text ?? "").trim() };
  });
