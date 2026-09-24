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
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("AI is not configured. Set OPENAI_API_KEY on the server.");
    const baseUrl = (process.env["OPENAI_BASE_URL"] || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env["OPENAI_TRANSCRIPTION_MODEL"] || "gpt-transcribe";

    const bytes = base64ToBytes(data.audioBase64);
    if (bytes.byteLength < 2048) return { text: "" };
    if (bytes.byteLength > 20 * 1024 * 1024)
      throw new Error("That recording segment is too large to transcribe.");

    const form = new FormData();
    form.append("model", model);
    form.append(
      "file",
      new Blob([bytes as unknown as BlobPart], { type: "audio/wav" }),
      "segment.wav",
    );

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401)
        throw new Error("The OpenAI API key is missing or invalid.");
      if (res.status === 429)
        throw new Error("Transcription is busy right now. Try again in a moment.");
      throw new Error(`Transcription failed (${res.status}). ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { text?: string };
    return { text: (payload.text ?? "").trim() };
  });
