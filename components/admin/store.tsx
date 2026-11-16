"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { saveContent } from "@/app/admin/content-actions";
import { starterContent } from "@/lib/seed";
import { toast } from "@/components/toast";
import { normalizeContent, readiness, SECTIONS, type Content, type SectionId } from "./content";

// Edits live in a draft until "Save changes", which writes them to Firestore
// and refreshes the public site.

// Where older versions of the admin kept edits. Read once to migrate them.
const LEGACY_KEY = "admin:content:v1";

/** Which parts of the content each admin section edits. */
const SECTION_KEYS: Record<SectionId, (keyof Content)[]> = {
  hero: ["profile"],
  about: ["about"],
  skills: ["skills"],
  projects: ["projects"],
  experience: ["experience"],
  certificates: ["certificates"],
  blogs: ["posts", "blog"],
  contact: ["contact"],
};

export type EditedArea = SectionId | "settings";

/** Sections whose draft differs from what's published. */
function editedAreas(draft: Content, saved: Content): EditedArea[] {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const out: EditedArea[] = SECTIONS.filter(
    (s) =>
      SECTION_KEYS[s.id].some((k) => !same(draft[k], saved[k])) ||
      draft.site.hidden.includes(s.id) !== saved.site.hidden.includes(s.id),
  ).map((s) => s.id);
  if (draft.site.domain !== saved.site.domain || draft.site.accent !== saved.site.accent) out.push("settings");
  return out;
}

type Store = {
  draft: Content;
  saved: Content;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  savedAt: Date | null;
  /** False until the first save creates the Firestore document. */
  stored: boolean;
  /** True when edits from this browser's old local storage were loaded into the draft. */
  migrated: boolean;
  user: string;
  /** Sections with unpublished edits. */
  edited: EditedArea[];
  update: (fn: (draft: Content) => Content) => void;
  save: () => void;
  /** Saves once the edits queued in this same event have landed in the draft. */
  saveSoon: () => void;
  discard: () => void;
  reset: () => void;
  status: ReturnType<typeof readiness>;
};

const Ctx = createContext<Store | null>(null);

export function useAdmin() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAdmin must be used inside <AdminProvider>");
  return s;
}

function readLegacy(): Content | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? normalizeContent(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function AdminProvider({
  user,
  initial,
  exists,
  updatedAt,
  children,
}: {
  user: string;
  initial: Content;
  exists: boolean;
  updatedAt: string | null;
  children: ReactNode;
}) {
  const [saved, setSaved] = useState<Content>(initial);
  const [draft, setDraft] = useState<Content>(initial);
  const [savedAt, setSavedAt] = useState<Date | null>(updatedAt ? new Date(updatedAt) : null);
  const [stored, setStored] = useState(exists);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // One-time migration: if Firestore is still empty but this browser has edits
  // from the old local-storage admin, load them as unsaved changes.
  useEffect(() => {
    if (exists) {
      clearLegacy();
      return;
    }
    const legacy = readLegacy();
    if (legacy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      setDraft(legacy);
      setMigrated(true);
    }
  }, [exists]);

  const edited = useMemo(() => editedAreas(draft, saved), [draft, saved]);
  const dirty = edited.length > 0;

  // Warn before leaving the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const update = useCallback((fn: (d: Content) => Content) => {
    setError(null);
    setDraft((d) => fn(d));
  }, []);

  const save = useCallback(() => {
    if (saving) return;
    const snapshot = draft;
    setError(null);
    startSaving(async () => {
      let res: Awaited<ReturnType<typeof saveContent>>;
      try {
        res = await saveContent(snapshot);
      } catch {
        res = { ok: false, error: "Couldn't reach the server. Check your connection and try again." } as typeof res;
      }
      if (!res.ok) {
        setError(res.error);
        toast.error(`Not saved: ${res.error}`);
        return;
      }
      setSaved(snapshot);
      setSavedAt(new Date(res.savedAt));
      setStored(true);
      setMigrated(false);
      clearLegacy();
      toast.success("Changes saved and published.");
    });
  }, [draft, saving]);

  const [saveQueued, setSaveQueued] = useState(false);
  const saveSoon = useCallback(() => setSaveQueued(true), []);
  useEffect(() => {
    if (!saveQueued) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot flag, consumed here
    setSaveQueued(false);
    if (dirty) save();
  }, [saveQueued, dirty, save]);

  const discard = useCallback(() => {
    setError(null);
    setDraft(saved);
    toast.info("Unsaved changes discarded.");
  }, [saved]);

  // Loads the starter text into the draft; it only goes live once saved.
  const reset = useCallback(() => {
    setError(null);
    setDraft(starterContent);
    toast.info("Starter content loaded. Save to publish it.");
  }, []);

  const status = useMemo(() => readiness(draft), [draft]);

  const value = useMemo(
    () => ({
      draft,
      saved,
      dirty,
      saving,
      error,
      savedAt,
      stored,
      migrated,
      user,
      edited,
      update,
      save,
      saveSoon,
      discard,
      reset,
      status,
    }),
    [draft, saved, dirty, saving, error, savedAt, stored, migrated, user, edited, update, save, saveSoon, discard, reset, status],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
