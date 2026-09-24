import { useCallback, useEffect, useState } from "react";
import type { Finding, SectionKey, Workshop } from "./workshop-types";
import { SECTION_KEYS, findingSemanticKey, newId } from "./workshop-types";

const STORAGE_KEY = "workshop-interpreter:v1";

type Listener = () => void;
const listeners = new Set<Listener>();

const VALID_SECTIONS = new Set<string>(SECTION_KEYS);

function normalizeFinding(finding: Finding, versionCreatedAt: number): Finding {
  const section = (VALID_SECTIONS.has(finding.section) ? finding.section : "questions") as SectionKey;
  const confirmedDecision = section === "decisions" && finding.status === "confirmed";
  return {
    ...finding,
    section,
    semanticKey: finding.semanticKey ?? findingSemanticKey(section, finding.title),
    sourceOrigin: finding.sourceOrigin ?? "live",
    sourceCaptureIds: Array.isArray(finding.sourceCaptureIds) ? finding.sourceCaptureIds : [],
    interpretationType: finding.interpretationType ?? (confirmedDecision ? "confirmedDecision" : section === "assumptions" ? "hypothesis" : "observation"),
    firstIntroducedAt: finding.firstIntroducedAt ?? versionCreatedAt,
    lastChangedAt: finding.lastChangedAt ?? versionCreatedAt,
  };
}

function normalizeWorkshop(workshop: Workshop): Workshop {
  return {
    ...workshop,
    versions: (workshop.versions ?? []).map((version) => ({
      ...version,
      findings: (version.findings ?? []).map((finding) => normalizeFinding(finding, version.createdAt)),
    })),
    prototypes: workshop.prototypes?.map((prototype) => ({
      ...prototype,
      findings: (prototype.findings ?? []).map((finding) => normalizeFinding(finding, prototype.createdAt)),
    })),
  };
}

function read(): Workshop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Workshop[];
    return Array.isArray(parsed) ? parsed.map(normalizeWorkshop) : [];
  } catch {
    return [];
  }
}

function write(workshops: Workshop[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workshops));
  } catch {
    /* quota or private mode — keep the in-memory state */
  }
  listeners.forEach((l) => l());
}

export const workshopRepo = {
  list(): Workshop[] {
    return read().sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Workshop | undefined {
    return read().find((w) => w.id === id);
  },
  create(input: Pick<Workshop, "name" | "objective" | "participants" | "captures">): Workshop {
    const now = Date.now();
    const workshop: Workshop = {
      id: newId("ws"),
      name: input.name,
      objective: input.objective,
      participants: input.participants,
      captures: input.captures,
      versions: [],
      currentVersionId: null,
      createdAt: now,
      updatedAt: now,
    };
    write([workshop, ...read()]);
    return workshop;
  },
  update(id: string, updater: (w: Workshop) => Workshop) {
    const all = read();
    const idx = all.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const next = updater(all[idx]!);
    all[idx] = { ...next, updatedAt: Date.now() };
    write(all);
  },
  remove(id: string) {
    write(read().filter((w) => w.id !== id));
  },
};

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkshops() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  useEffect(() => {
    const sync = () => setWorkshops(workshopRepo.list());
    sync();
    return subscribe(sync) as unknown as () => void;
  }, []);
  return workshops;
}

export function useWorkshop(id: string) {
  const [workshop, setWorkshop] = useState<Workshop | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setWorkshop(workshopRepo.get(id) ?? null);
    sync();
    return subscribe(sync) as unknown as () => void;
  }, [id]);

  const mutate = useCallback(
    (updater: (w: Workshop) => Workshop) => {
      workshopRepo.update(id, updater);
    },
    [id],
  );

  return { workshop, mutate };
}
