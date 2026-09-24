/**
 * Captures microphone audio as raw PCM and emits complete 16 kHz mono WAV
 * segments on a fixed interval, so every upload is an independently
 * decodable file (recorder fragments are not).
 */

const TARGET_RATE = 16000;

function downsample(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate <= TARGET_RATE) return input;
  const ratio = inputRate / TARGET_RATE;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j] ?? 0;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  const samples = downsample(joined, inputRate);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let pos = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the recording."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export type RoomRecorder = {
  stop: () => Promise<void>;
  /** Peak level of the most recent audio frame, 0-1. */
  level: () => number;
};

export async function startRoomRecorder(options: {
  segmentMs: number;
  onSegment: (wav: Blob) => void;
}): Promise<RoomRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);

  let chunks: Float32Array[] = [];
  let peak = 0;
  let stopped = false;

  node.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    let max = 0;
    for (let i = 0; i < data.length; i += 64) max = Math.max(max, Math.abs(data[i] ?? 0));
    peak = max;
  };
  source.connect(node);
  node.connect(ctx.destination);

  const flush = () => {
    if (!chunks.length) return;
    const pending = chunks;
    chunks = [];
    const blob = encodeWav(pending, ctx.sampleRate);
    if (blob.size > 4096) options.onSegment(blob);
  };

  const interval = setInterval(flush, options.segmentMs);

  return {
    level: () => peak,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      node.onaudioprocess = null;
      flush();
      node.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}
