"use client";

import type { CSSProperties, ClipboardEvent, DragEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Copy, Ellipsis, GripVertical, ImageIcon, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { createUploadTicket } from "@/app/admin/content-actions";
import { SkeletonImage } from "@/components/skeleton-image";
import { toast } from "@/components/toast";
import { missing, type SectionId } from "./content";
import { Modal, buttonCls, useConfirm } from "./modal";
import { useAdmin } from "./store";

export const inputCls =
  "w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-[14px] placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-card ${className}`}>
      {children}
    </section>
  );
}

export function Badge({ issues }: { issues: number }) {
  if (issues === 0) return null;
  return <span className="whitespace-nowrap text-sm text-muted">{issues} to fix</span>;
}

export function PageHeader({
  title,
  description,
  section,
}: {
  title: string;
  description: string;
  section?: SectionId;
}) {
  const { status } = useAdmin();
  const s = section ? status.sections.find((x) => x.id === section) : null;
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">{title}</h1>
        <p className="mt-1 text-[15px] text-muted">{description}</p>
      </div>
      {s && (
        <div className="flex items-center gap-3">
          <Badge issues={s.issues} />
          <VisibilityToggle section={s.id} />
        </div>
      )}
    </header>
  );
}

export function VisibilityToggle({ section }: { section: SectionId }) {
  const { draft, update } = useAdmin();
  const shown = !draft.site.hidden.includes(section);
  return (
    <Switch
      label="Show on site"
      checked={shown}
      onChange={(on) =>
        update((d) => ({
          ...d,
          site: {
            ...d.site,
            hidden: on ? d.site.hidden.filter((h) => h !== section) : [...d.site.hidden, section],
          },
        }))
      }
    />
  );
}

/** Accessible on/off switch. The whole label is clickable. */
export function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`inline-flex items-center gap-2.5 ${disabled ? "opacity-50" : ""}`}>
      <label htmlFor={id} className="cursor-pointer select-none text-sm font-medium text-fg-soft">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:rounded-full focus-visible:outline-offset-2 disabled:cursor-not-allowed ${
          checked ? "bg-accent hover:bg-accent-hover" : "bg-border-strong hover:bg-faint/60"
        }`}
      >
        <span
          aria-hidden
          className={`size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] group-active:scale-95 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Whether empty required fields are flagged straight away. On for existing
 * content (so gaps are easy to find), off in a blank "Add" form, where a field
 * is only flagged once you've been in it and left it empty.
 */
const EagerValidation = createContext(true);

export function Field({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  placeholder,
  hint,
  type = "text",
  required,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  /** id of a <datalist> with suggestions. */
  list?: string;
}) {
  const id = useId();
  const noteId = useId();
  const eager = useContext(EagerValidation);
  const [touched, setTouched] = useState(false);
  const needs = required && missing(value) && (eager || touched);
  const common = {
    id,
    value,
    placeholder,
    "aria-describedby": needs ? noteId : undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    onBlur: () => setTouched(true),
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {needs && (
          <span id={noteId} className="text-xs text-amber-700 dark:text-amber-400">
            Needs details
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          {...common}
          rows={rows}
          // Grows with the text (where supported) instead of scrolling inside a tiny box.
          style={{ minHeight: `calc(${rows * 1.625}em + 1.1rem)` }}
          className={`${inputCls} field-sizing-content max-h-[32rem] resize-y leading-relaxed`}
        />
      ) : (
        <input {...common} type={type} list={list} className={inputCls} />
      )}
      {hint && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- upload -- */

const UPLOAD_RULES = {
  image: { accept: "image/png,image/jpeg,image/webp,image/avif,image/gif", maxMb: 10, noun: "an image", label: "Image" },
  document: { accept: "application/pdf", maxMb: 10, noun: "a PDF", label: "PDF" },
} as const;

type UploadKind = keyof typeof UPLOAD_RULES;

/** Sends files to Cloudinary through a signed ticket. Resolves to the URL, or null on failure (already reported). */
export function useUpload(kind: UploadKind) {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rule = UPLOAD_RULES[kind];

  async function upload(file: File, { quiet = false } = {}): Promise<string | null> {
    setError(null);
    const fail = (msg: string) => {
      setError(msg);
      toast.error(msg);
      return null;
    };
    if (!rule.accept.split(",").includes(file.type)) return fail(`“${file.name}” isn't ${rule.noun}.`);
    if (file.size > rule.maxMb * 1024 * 1024) return fail(`“${file.name}” is over ${rule.maxMb} MB.`);
    setPending((n) => n + 1);
    try {
      const res = await createUploadTicket(kind);
      if (!res.ok) throw new Error(res.error);
      const body = new FormData();
      for (const [k, v] of Object.entries(res.ticket.fields)) body.append(k, v);
      body.append("file", file);
      const up = await fetch(res.ticket.url, { method: "POST", body });
      const json = (await up.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
      if (!up.ok || !json?.secure_url) throw new Error(json?.error?.message ?? `Upload failed (${up.status}).`);
      if (!quiet) toast.success(`${rule.label} uploaded.`);
      return json.secure_url;
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPending((n) => n - 1);
    }
  }

  return { upload, busy: pending > 0, pending, error, accept: rule.accept };
}

/** Files carried by a drop or paste event, if any. */
function eventFiles(e: DragEvent | ClipboardEvent) {
  const list = "dataTransfer" in e ? e.dataTransfer?.files : e.clipboardData?.files;
  return list ? Array.from(list) : [];
}

/** Drag-over highlight plus drop and paste handling for a file target. */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  return {
    over,
    props: {
      onDragEnter: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current++;
        setOver(true);
      },
      onDragOver: (e: DragEvent) => {
        if (hasFiles(e)) e.preventDefault();
      },
      onDragLeave: () => {
        if (--depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      },
      onDrop: (e: DragEvent) => {
        depth.current = 0;
        setOver(false);
        const files = eventFiles(e);
        if (!files.length) return;
        e.preventDefault();
        onFiles(files);
      },
      onPaste: (e: ClipboardEvent) => {
        const files = eventFiles(e);
        if (!files.length) return;
        e.preventDefault();
        onFiles(files);
      },
    },
  };
}

const hasImage = (src: string) => !!src.trim() && !src.includes("[");

/**
 * URL field with an "Upload" button that sends the file to Cloudinary.
 * Files can also be dropped onto it or pasted into it. Images get a preview:
 * a small tile beside the field, or (`preview="wide"`) a large drop target below it.
 */
export function UploadField({
  kind,
  preview = kind === "image" ? "tile" : "none",
  ...field
}: Parameters<typeof Field>[0] & { kind: UploadKind; preview?: "tile" | "wide" | "none" }) {
  const picker = useRef<HTMLInputElement>(null);
  const { upload, busy, error, accept } = useUpload(kind);
  const send = async (file: File) => {
    const url = await upload(file);
    if (url) field.onChange(url);
  };
  const drop = useFileDrop((files) => void send(files[0]));
  const choose = () => picker.current?.click();
  const src = field.value;

  return (
    <div
      {...drop.props}
      className={`rounded-xl transition-shadow ${drop.over ? "ring-2 ring-accent ring-offset-4 ring-offset-card" : ""}`}
    >
      <div className="flex items-end gap-2">
        {preview === "tile" && (
          <button
            type="button"
            onClick={choose}
            aria-label={`Upload ${field.label.toLowerCase()}`}
            className="relative mb-px grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-lg border border-border-strong bg-muted-card text-faint transition-colors hover:text-fg sm:size-[38px]"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : hasImage(src) ? (
              <SkeletonImage key={src} src={src} alt="" sizes="42px" className="object-cover" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {/* Hint is rendered below the row so the button lines up with the input. */}
          <Field {...field} hint={undefined} placeholder={field.placeholder ?? "Paste a link, or upload a file"} />
        </div>
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          className="mb-px flex h-[42px] shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-medium text-fg transition-colors hover:bg-chip disabled:pointer-events-none disabled:opacity-50 sm:h-[38px]"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={picker}
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-hidden
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void send(f);
          }}
        />
      </div>

      {preview === "wide" && (
        <div className="group relative mt-3 aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted-card">
          {hasImage(src) ? (
            <>
              <SkeletonImage key={src} src={src} alt="" sizes="(min-width: 768px) 320px, 100vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/55 to-transparent p-2 pt-8 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                <button
                  type="button"
                  onClick={choose}
                  className="h-8 rounded-md bg-white/90 px-2.5 text-xs font-semibold text-slate-900 hover:bg-white"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("")}
                  className="h-8 rounded-md bg-white/90 px-2.5 text-xs font-semibold text-red-600 hover:bg-white"
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={choose}
              className="flex size-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-transparent p-4 text-center text-faint transition-colors hover:border-border-strong hover:text-fg-soft"
            >
              <ImagePlus className="size-6" />
              <span className="text-[13px]">
                <span className="font-medium text-fg-soft">Click to upload</span>, or drop or paste an image
              </span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-card/70 text-sm font-medium text-fg-soft">
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" /> Uploading…
              </span>
            </div>
          )}
        </div>
      )}

      {field.hint && !error && <p className="mt-1.5 text-xs text-faint">{field.hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ tags -- */

/** Chips you add with Enter or a comma (tags, skill items). Pasting "a, b, c" adds all three. */
export function ListField({
  label,
  value,
  onChange,
  required,
  placeholder = "Type and press Enter",
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const eager = useContext(EagerValidation);
  const [touched, setTouched] = useState(false);
  const [text, setText] = useState("");
  const items = value.filter((x) => x.trim());
  const needs = required && items.length === 0 && !text.trim() && (eager || touched);

  const commit = (raw: string) => {
    const seen = new Set(items.map((x) => x.toLowerCase()));
    const add: string[] = [];
    for (const part of raw.split(",")) {
      const t = part.trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        add.push(t);
      }
    }
    if (add.length) onChange([...items, ...add]);
    setText("");
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {needs && <span className="text-xs text-amber-700 dark:text-amber-400">Needs details</span>}
      </div>
      <div
        onClick={() => input.current?.focus()}
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-card p-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 sm:min-h-[38px]"
      >
        {items.map((t, i) => (
          <span
            key={t + i}
            className="inline-flex h-7 items-center gap-0.5 rounded-md bg-chip pl-2 pr-0.5 text-[13px] font-medium text-chip-fg"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(items.filter((_, j) => j !== i));
                input.current?.focus();
              }}
              className="grid size-6 place-items-center rounded text-faint transition-colors hover:bg-border-strong/60 hover:text-fg"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          value={text}
          placeholder={items.length ? "" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              // Add the chip instead of submitting the surrounding form.
              e.preventDefault();
              commit(text);
            } else if (e.key === "Backspace" && !text && items.length) {
              // Pull the last chip back into the box so it can be fixed.
              e.preventDefault();
              setText(items[items.length - 1]);
              onChange(items.slice(0, -1));
            }
          }}
          onBlur={() => {
            setTouched(true);
            commit(text);
          }}
          className="h-7 min-w-[8ch] flex-1 bg-transparent px-1.5 text-base text-fg outline-none placeholder:text-faint sm:text-[14px]"
        />
      </div>
      <p className="mt-1.5 text-xs text-faint">{hint ?? "Press Enter or type a comma to add. Backspace edits the last one."}</p>
    </div>
  );
}

/* -------------------------------------------------------------- repeater -- */

// Stable React keys for list items (plain objects with no id field).
const keys = new WeakMap<object, string>();
let keySeq = 0;
function keyOf(item: object) {
  let k = keys.get(item);
  if (!k) {
    k = `item-${++keySeq}`;
    keys.set(item, k);
  }
  return k;
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-border-strong bg-card px-1 font-sans text-[11px] font-medium text-muted">
      {children}
    </kbd>
  );
}

/**
 * Ordered list: drag (or use the arrows) to reorder, duplicate, remove with
 * undo. Items are edited (and added) in a modal form; changes land in the
 * draft when the form is applied, and Ctrl/Cmd+S applies and publishes at once.
 */
export function Repeater<T extends object>({
  items,
  onChange,
  make,
  title,
  subtitle,
  thumb,
  ok,
  noun,
  heading,
  size = "md",
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  title: (item: T, i: number) => string;
  subtitle?: (item: T) => string;
  /** Image URL shown at the start of each row. */
  thumb?: (item: T) => string;
  /** Whether an item is complete; drives the "Needs details" note. */
  ok?: (item: T) => boolean;
  /** Singular, lower-case name of one item ("project"). */
  noun: string;
  heading?: string;
  size?: "sm" | "md" | "lg" | "xl";
  render: (item: T, set: (patch: Partial<T>) => void, i: number) => ReactNode;
}) {
  const { saveSoon } = useAdmin();
  const confirm = useConfirm();
  const formId = useId();
  // index === null means a new item that isn't in the list yet.
  const [editing, setEditing] = useState<{ index: number | null; value: T; original: T } | null>(null);
  const changed = !!editing && JSON.stringify(editing.value) !== JSON.stringify(editing.original);

  // The undo in a "Removed" toast needs the list as it is when clicked, not when removed.
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  const undoToast = useRef<number | null>(null);
  useEffect(
    () => () => {
      // Leaving the page: an undo from here could no longer be applied safely.
      if (undoToast.current !== null) toast.dismiss(undoToast.current);
    },
    [],
  );

  const open = (index: number | null) => {
    const value = index === null ? make() : items[index];
    setEditing({ index, value, original: value });
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  const duplicate = (i: number) => {
    onChange([...items.slice(0, i + 1), structuredClone(items[i]), ...items.slice(i + 1)]);
    toast.info("Duplicated. The copy is right below the original.");
  };

  const remove = (i: number) => {
    const item = items[i];
    const name = title(item, i);
    onChange(items.filter((_, j) => j !== i));
    undoToast.current = toast.info(name ? `Removed “${name}”.` : `Removed ${noun}.`, {
      action: {
        label: "Undo",
        onClick: () => {
          const cur = latest.current;
          const at = Math.min(i, cur.length);
          onChange([...cur.slice(0, at), item, ...cur.slice(at)]);
        },
      },
    });
  };

  const apply = () => {
    if (!editing) return;
    const { index, value } = editing;
    if (index === null) onChange([...items, value]);
    else {
      // The edited copy keeps its row's key, so the row updates in place.
      keys.set(value, keyOf(items[index]));
      onChange(items.map((x, j) => (j === index ? value : x)));
    }
    setEditing(null);
  };

  const close = async () => {
    if (changed) {
      const yes = await confirm({
        title: editing?.index === null ? `Discard this new ${noun}?` : "Discard your edits?",
        body: "What you typed in this form hasn't been applied yet and will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        tone: "danger",
      });
      if (!yes) return;
    }
    setEditing(null);
  };

  // Shortcuts inside the form: Ctrl/Cmd+S applies and publishes, Ctrl/Cmd+Enter applies.
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  const isEditing = !!editing;
  useEffect(() => {
    if (!isEditing) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // A confirm dialog is on top of the form; leave the keys to it.
      if (document.querySelectorAll("dialog[open]").length > 1) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        applyRef.current();
        saveSoon();
      } else if (e.key === "Enter") {
        e.preventDefault();
        applyRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditing, saveSoon]);

  const addBtn = (
    <button
      type="button"
      onClick={() => open(null)}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-[transform,background-color] duration-200 hover:-translate-y-px hover:bg-accent-hover active:translate-y-0"
    >
      Add {noun}
    </button>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold text-fg">
            {heading ?? `${items.length} ${items.length === 1 ? "item" : "items"}`}
          </h2>
          {items.length > 1 && <p className="text-xs text-faint">Drag rows to change the order on the site.</p>}
        </div>
        {items.length > 0 && addBtn}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <p className="font-medium text-fg">Nothing here yet</p>
          <p className="mb-5 mt-1 text-sm text-muted">Add your first {noun} to show it on the site.</p>
          {addBtn}
        </div>
      ) : (
        <Reorder.Group as="ul" axis="y" values={items} onReorder={onChange} className="admin-rows divide-y divide-border">
          {items.map((item, i) => (
            <Row
              key={keyOf(item)}
              item={item}
              index={i}
              last={i === items.length - 1}
              title={title(item, i)}
              subtitle={subtitle?.(item)}
              thumb={thumb?.(item)}
              incomplete={ok ? !ok(item) : false}
              onOpen={() => open(i)}
              onMove={(dir) => move(i, dir)}
              onDuplicate={() => duplicate(i)}
              onRemove={() => remove(i)}
            />
          ))}
        </Reorder.Group>
      )}

      <Modal
        open={!!editing}
        onClose={() => void close()}
        dismissible={false}
        size={size}
        title={editing?.index === null ? `Add ${noun}` : `Edit ${noun}`}
        description={editing && editing.index !== null ? title(editing.value, editing.index) || undefined : undefined}
        footer={
          <>
            <p className="mr-auto hidden items-center gap-1 text-xs text-faint sm:flex">
              <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>S</Kbd>
              <span className="ml-1">applies and publishes</span>
            </p>
            <button type="button" onClick={() => void close()} className={buttonCls.secondary}>
              Cancel
            </button>
            <button type="submit" form={formId} className={buttonCls.primary}>
              {editing?.index === null ? `Add ${noun}` : "Done"}
            </button>
          </>
        }
      >
        {editing && (
          <EagerValidation.Provider value={editing.index !== null}>
            <form
              id={formId}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
              className="grid gap-5"
            >
              {render(
                editing.value,
                (patch) => setEditing((e) => (e ? { ...e, value: { ...e.value, ...patch } } : e)),
                editing.index ?? items.length,
              )}
            </form>
          </EagerValidation.Provider>
        )}
      </Modal>
    </Card>
  );
}

function Row<T extends object>({
  item,
  index,
  last,
  title,
  subtitle,
  thumb,
  incomplete,
  onOpen,
  onMove,
  onDuplicate,
  onRemove,
}: {
  item: T;
  index: number;
  last: boolean;
  title: string;
  subtitle?: string;
  thumb?: string;
  incomplete: boolean;
  onOpen: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const drag = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={drag}
      whileDrag={{ scale: 1.01, boxShadow: "0 18px 40px -16px rgb(15 23 42 / 0.35)" }}
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
      className="relative flex items-center gap-1 bg-card px-1.5 py-2 sm:gap-2 sm:px-4 sm:py-2.5"
    >
      {/* Pointer-only handle; keyboard and screen-reader users have the arrow buttons. */}
      <span
        aria-hidden
        title="Drag to reorder"
        onPointerDown={(e) => drag.start(e)}
        className="grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-faint transition-colors hover:bg-chip hover:text-fg active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-chip/60"
      >
        {thumb !== undefined && (
          <span className="relative grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted-card text-faint">
            {hasImage(thumb) ? (
              <SkeletonImage key={thumb} src={thumb} alt="" sizes="56px" className="object-cover" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {incomplete && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber-400 sm:hidden" />}
            <span className={`block truncate text-[15px] font-medium ${title ? "text-fg" : "italic text-faint"}`}>
              {title || "Untitled"}
            </span>
          </span>
          {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
        </span>
        {incomplete && (
          <span className="hidden shrink-0 text-xs text-amber-700 sm:inline dark:text-amber-400">Needs details</span>
        )}
      </button>
      <ActionMenu
        label={`Actions for ${title || "untitled item"}`}
        items={[
          { label: "Duplicate", icon: Copy, onSelect: onDuplicate },
          { label: "Move up", icon: ArrowUp, onSelect: () => onMove(-1), disabled: index === 0 },
          { label: "Move down", icon: ArrowDown, onSelect: () => onMove(1), disabled: last },
          { label: "Delete", icon: Trash2, onSelect: onRemove, danger: true, separated: true },
        ]}
      />
    </Reorder.Item>
  );
}

type MenuItem = {
  label: string;
  icon: typeof Copy;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Draw a divider above this item. */
  separated?: boolean;
};

const MENU_W = 176;

/**
 * "⋯" button with a dropdown of actions. The menu is portalled to <body> so the
 * list card's overflow (and the page's entrance transform) can't clip it, and
 * flips above the button when there's no room below.
 */
function ActionMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const show = () => {
    const r = btn.current!.getBoundingClientRect();
    const height = items.length * 38 + 16;
    const up = r.bottom + height + 8 > window.innerHeight && r.top > height + 8;
    setPos({
      top: up ? r.top - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
      up,
    });
  };
  const hide = (refocus = true) => {
    setPos(null);
    if (refocus) btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) hide(false);
    };
    const onMove = () => hide(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const all = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []);
    const i = all.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => all[(n + all.length) % all.length]?.focus();
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hide();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      go(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      hide(false);
    }
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? hide() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            show();
          }
        }}
        className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-chip hover:text-fg sm:size-8 ${
          open ? "bg-chip text-fg" : "text-faint"
        }`}
      >
        <Ellipsis className="size-4" />
      </button>
      {pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            onKeyDown={onKey}
            style={{
              top: pos.top,
              left: pos.left,
              width: MENU_W,
              transform: pos.up ? "translateY(-100%)" : undefined,
              transformOrigin: pos.up ? "bottom right" : "top right",
            }}
            className="admin-menu fixed z-50 rounded-xl border border-border bg-card p-1.5 shadow-lift"
          >
            {items.map(({ label: text, icon: Icon, onSelect, disabled, danger, separated }) => (
              <div key={text}>
                {separated && <div className="-mx-1.5 my-1.5 border-t border-border" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    hide();
                    onSelect();
                  }}
                  className={`flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                    danger
                      ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus-visible:bg-red-950/40"
                      : "text-fg-soft hover:bg-chip hover:text-fg focus-visible:bg-chip focus-visible:text-fg"
                  }`}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {text}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-9 shrink-0 place-items-center rounded-lg text-faint transition-[color,background-color,transform] hover:bg-chip active:scale-90 disabled:pointer-events-none disabled:opacity-30 sm:size-8 ${danger ? "hover:text-red-600" : "hover:text-fg"} ${className}`}
    >
      {children}
    </button>
  );
}
