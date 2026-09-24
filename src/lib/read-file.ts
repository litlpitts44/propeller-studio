export const ACCEPTED_FILE_TYPES =
  ".txt,.md,.markdown,.csv,.tsv,.json,.log,.rtf,.html,.htm,.xml,.vtt,.srt,.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*";

export type ReadResult = {
  name: string;
  text: string;
  imageDataUrl?: string;
  error?: string;
};

function readAsText(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return pages.filter(Boolean).join("\n\n");
}

async function readDocx(file: File): Promise<string> {
  const mammoth = await import(/* @vite-ignore */ "mammoth/mammoth.browser.js" as string);
  const buffer = await file.arrayBuffer();
  const result = await (
    mammoth as unknown as {
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }
  ).extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}

/** Pulls the visible text out of each slide of a .pptx, in slide order. */
async function readPptx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const num = (s: string) => Number(s.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return num(a) - num(b);
    });
  const notesFor = (slideName: string) =>
    slideName.replace("ppt/slides/slide", "ppt/notesSlides/notesSlide");

  const decode = (s: string) =>
    s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");

  const textOf = (xml: string) =>
    Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
      .map((m) => decode(m[1] ?? "").trim())
      .filter(Boolean)
      .join("\n");

  const slides: string[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const name = slideNames[i] as string;
    const xml = await zip.files[name]!.async("string");
    const body = textOf(xml);
    const notesFile = zip.files[notesFor(name)];
    const notes = notesFile ? textOf(await notesFile.async("string")) : "";
    const parts = [`Slide ${i + 1}`];
    if (body) parts.push(body);
    if (notes) parts.push(`Speaker notes: ${notes}`);
    if (body || notes) slides.push(parts.join("\n"));
  }
  return slides.join("\n\n");
}

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|log|rtf|html?|xml|vtt|srt|yml|yaml)$/i;

/** Reads a dropped or browsed file into workshop input: text, PDF, Word, or image. */
export async function readWorkshopFile(file: File): Promise<ReadResult> {
  const name = file.name;
  try {
    if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(name)) {
      const imageDataUrl = await readAsDataUrl(file);
      return { name, text: `Workshop artifact: ${name}`, imageDataUrl };
    }
    if (file.type === "application/pdf" || /\.pdf$/i.test(name)) {
      const text = await readPdf(file);
      return text
        ? { name, text }
        : {
            name,
            text: "",
            error: `${name} has no selectable text — it may be a scan. Paste the key parts instead.`,
          };
    }
    if (/\.docx?$/i.test(name) || file.type.includes("wordprocessingml")) {
      if (/\.doc$/i.test(name)) {
        return {
          name,
          text: "",
          error: `${name} is an old Word format. Save it as .docx or PDF and try again.`,
        };
      }
      const text = await readDocx(file);
      return text ? { name, text } : { name, text: "", error: `No text found in ${name}.` };
    }
    if (/\.pptx?$/i.test(name) || file.type.includes("presentationml")) {
      if (/\.ppt$/i.test(name)) {
        return {
          name,
          text: "",
          error: `${name} is an old PowerPoint format. Save it as .pptx or PDF and try again.`,
        };
      }
      const text = await readPptx(file);
      return text
        ? { name, text }
        : {
            name,
            text: "",
            error: `${name} has no readable slide text — it may be all images. Upload the slides as a PDF or photos instead.`,
          };
    }
    if (file.type.startsWith("text/") || TEXT_EXTENSIONS.test(name)) {
      const text = await readAsText(file);
      return text.trim()
        ? { name, text }
        : { name, text: "", error: `${name} appears to be empty.` };
    }
    // Last resort: try plain text, otherwise report it.
    const text = await readAsText(file);
    if (text.trim() && !text.includes("\u0000")) return { name, text };
    return {
      name,
      text: "",
      error: `${name} isn't a supported file type. Use text, PDF, Word or an image.`,
    };
  } catch {
    return { name, text: "", error: `${name} could not be read.` };
  }
}

export async function readWorkshopFiles(files: FileList | File[]): Promise<ReadResult[]> {
  return Promise.all(Array.from(files).map(readWorkshopFile));
}
