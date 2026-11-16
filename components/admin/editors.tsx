"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Plus, X } from "lucide-react";
import { SkeletonImage } from "@/components/skeleton-image";
import { itemOk, type Content, type Link as LinkT } from "./content";
import { useConfirm } from "./modal";
import { useAdmin } from "./store";
import {
  Card,
  Field,
  IconBtn,
  ListField,
  PageHeader,
  Repeater,
  Switch,
  UploadField,
  inputCls,
  useFileDrop,
  useUpload,
} from "./ui";

/** Shorthand: patch one top-level key of the draft. */
function useSlice<K extends keyof Content>(key: K) {
  const { draft, update } = useAdmin();
  const set = (value: Content[K]) => update((d) => ({ ...d, [key]: value }));
  return [draft[key], set] as const;
}

/** Small uppercase heading that splits a long form into groups. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-5">
      <legend className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</legend>
      {children}
    </fieldset>
  );
}

export function HeroEditor() {
  const [p, set] = useSlice("profile");
  return (
    <div className="space-y-6">
      <PageHeader title="Hero & profile" description="The first thing visitors see at the top of the page." section="hero" />
      <Card className="grid gap-5 p-4 sm:p-6">
        <Field label="Display name" required value={p.name} onChange={(name) => set({ ...p, name })} />
        <Field
          label="Availability badge"
          value={p.availability}
          onChange={(availability) => set({ ...p, availability })}
          hint="Short status shown above your headline. Leave empty to hide it."
        />
        <Field
          label="Headline"
          required
          multiline
          rows={2}
          value={p.headline}
          onChange={(headline) => set({ ...p, headline })}
          hint="One line per row of the big heading."
        />
        <Field label="Intro" required multiline rows={3} value={p.tagline} onChange={(tagline) => set({ ...p, tagline })} />
      </Card>
    </div>
  );
}

export function AboutEditor() {
  const [a, set] = useSlice("about");
  return (
    <div className="space-y-6">
      <PageHeader title="About me" description="Your photo, story and a few quick numbers." section="about" />
      <Card className="grid gap-6 p-4 sm:grid-cols-[160px_1fr] sm:p-6">
        <div className="relative aspect-[4/5] w-full max-w-[160px] overflow-hidden rounded-xl border border-border bg-muted-card">
          {a.photo && !a.photo.includes("[") ? (
            <SkeletonImage key={a.photo} src={a.photo} alt="Current photo" sizes="160px" className="object-cover object-[50%_20%]" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-faint">No photo</div>
          )}
        </div>
        <div className="grid content-start gap-5">
          <UploadField
            kind="image"
            preview="none"
            label="Photo"
            required
            value={a.photo}
            onChange={(photo) => set({ ...a, photo })}
            hint="Upload, drop or paste a portrait, or paste an image URL."
          />
          <Field label="Heading" value={a.heading} onChange={(heading) => set({ ...a, heading })} />
        </div>
      </Card>
      <Card className="p-4 sm:p-6">
        <Field
          label="About text"
          required
          multiline
          rows={9}
          value={a.body}
          onChange={(body) => set({ ...a, body })}
          hint="Leave a blank line between paragraphs."
        />
      </Card>
      <Repeater
        items={a.stats}
        onChange={(stats) => set({ ...a, stats })}
        make={() => ({ value: "", label: "" })}
        title={(s) => s.label}
        subtitle={(s) => s.value}
        ok={itemOk.stat}
        noun="stat"
        heading="Stats"
        size="sm"
        render={(s, patch) => (
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="Value" required value={s.value} placeholder="12+" onChange={(value) => patch({ value })} />
            <Field label="Label" required value={s.label} placeholder="Projects shipped" onChange={(label) => patch({ label })} />
          </div>
        )}
      />
    </div>
  );
}

export function SkillsEditor() {
  const [skills, set] = useSlice("skills");
  return (
    <div className="space-y-6">
      <PageHeader title="Skills" description="Group the tools you use so recruiters can scan them quickly." section="skills" />
      <Repeater
        items={skills}
        onChange={set}
        make={() => ({ title: "", items: [] })}
        title={(s) => s.title}
        subtitle={(s) => s.items.filter((x) => x.trim()).join(", ")}
        ok={itemOk.skill}
        noun="skill group"
        heading={`${skills.length} skill ${skills.length === 1 ? "group" : "groups"}`}
        render={(s, patch) => (
          <>
            <Field label="Group name" required value={s.title} placeholder="Frontend" onChange={(title) => patch({ title })} />
            <ListField label="Skills" required value={s.items} placeholder="React, TypeScript…" onChange={(items) => patch({ items })} />
          </>
        )}
      />
    </div>
  );
}

const LINK_LABELS = ["Live site", "GitHub", "Case study", "Demo video", "Docs"];

function LinksEditor({ links, onChange }: { links: LinkT[]; onChange: (l: LinkT[]) => void }) {
  const listId = useId();
  const set = (i: number, patch: Partial<LinkT>) => onChange(links.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="grid gap-2">
      <datalist id={listId}>
        {LINK_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-fg">Links</p>
        <p className="text-xs text-faint">Shown as buttons on the project card.</p>
      </div>
      {links.length === 0 && <p className="text-sm text-muted">No links. Visitors won&rsquo;t have anywhere to click through to.</p>}
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            aria-label={`Link ${i + 1} label`}
            list={listId}
            value={l.label}
            placeholder="Label"
            onChange={(e) => set(i, { label: e.target.value })}
            className={`${inputCls} w-32 shrink-0 sm:w-36`}
          />
          <input
            aria-label={`Link ${i + 1} URL`}
            type="url"
            value={l.href}
            placeholder="https://"
            onChange={(e) => set(i, { href: e.target.value })}
            className={`${inputCls} min-w-0 flex-1 ${l.href.trim() ? "" : "border-amber-400/70"}`}
          />
          <IconBtn label={`Remove link ${i + 1}`} danger onClick={() => onChange(links.filter((_, j) => j !== i))}>
            <X className="size-4" />
          </IconBtn>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { label: links.length ? "" : "Live site", href: "" }])}
        className="flex w-fit items-center gap-1.5 rounded-md py-1 text-sm font-medium text-accent hover:underline"
      >
        <Plus className="size-4" /> Add link
      </button>
    </div>
  );
}

/**
 * Extra project screenshots, shown after the cover image in the public viewer.
 * Several files can be picked or dropped at once; each is appended as it finishes.
 */
function GalleryEditor({ images, onChange }: { images: string[]; onChange: (g: string[]) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const { upload, pending, accept } = useUpload("image");
  const [url, setUrl] = useState("");
  // Uploads finish one by one; append each to the list as it is then.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);
  const push = (src: string) => {
    latest.current = [...latest.current, src];
    onChange(latest.current);
  };
  const addFiles = (files: File[]) =>
    files.forEach(async (f) => {
      const src = await upload(f, { quiet: true });
      if (src) push(src);
    });
  const drop = useFileDrop(addFiles);
  const move = (i: number, by: number) => {
    const next = [...images];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const addUrl = () => {
    if (url.trim()) push(url.trim());
    setUrl("");
  };

  return (
    <div {...drop.props} className={`grid gap-2.5 rounded-xl transition-shadow ${drop.over ? "ring-2 ring-accent ring-offset-4 ring-offset-card" : ""}`}>
      <div>
        <p className="text-[13px] font-medium text-fg">Screenshots</p>
        <p className="mt-0.5 text-xs text-faint">Optional. Visitors flip through these after the cover. Drop several at once.</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {images.map((src, i) => (
          <li key={src + i} className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted-card">
            {src.trim() && <SkeletonImage src={src} alt={`Screenshot ${i + 1}`} sizes="160px" className="object-cover" />}
            <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 text-[11px] font-medium tabular-nums text-white">{i + 1}</span>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 pt-6 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
              <span className="flex">
                <TileBtn label={`Move screenshot ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowLeft className="size-3.5" />
                </TileBtn>
                <TileBtn label={`Move screenshot ${i + 1} later`} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                  <ArrowRight className="size-3.5" />
                </TileBtn>
              </span>
              <TileBtn label={`Remove screenshot ${i + 1}`} onClick={() => onChange(images.filter((_, j) => j !== i))}>
                <X className="size-3.5" />
              </TileBtn>
            </div>
          </li>
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <li key={`pending-${i}`} className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-lg border border-border">
            <div className="skeleton absolute inset-0" />
            <LoaderCircle className="relative size-4 animate-spin text-faint" />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus className="size-5" />
            Add screenshots
          </button>
        </li>
      </ul>
      <input
        ref={picker}
        type="file"
        multiple
        accept={accept}
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          addFiles(files);
        }}
      />
      <input
        aria-label="Add a screenshot by URL"
        type="url"
        value={url}
        placeholder="…or paste an image URL and press Enter"
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addUrl();
          }
        }}
        onBlur={addUrl}
        className={inputCls}
      />
    </div>
  );
}

function TileBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-md text-white transition-colors hover:bg-white/20 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function ProjectsEditor() {
  const [projects, set] = useSlice("projects");
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Your best work. Order here is the order on the site." section="projects" />
      <Repeater
        items={projects}
        onChange={set}
        make={() => ({ title: "", status: "", description: "", tags: [], links: [{ label: "Live site", href: "" }], image: "", gallery: [] })}
        title={(p) => p.title}
        subtitle={(p) => [p.status, p.tags.filter((t) => t.trim()).join(", ")].filter(Boolean).join(" · ")}
        thumb={(p) => p.image}
        ok={itemOk.project}
        noun="project"
        heading={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        size="xl"
        render={(p, patch) => (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
            <Group title="Details">
              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <Field label="Title" required value={p.title} onChange={(title) => patch({ title })} />
                <Field label="Status" value={p.status} placeholder="Live, In progress…" onChange={(status) => patch({ status })} />
              </div>
              <Field label="Description" required multiline rows={4} value={p.description} onChange={(description) => patch({ description })} />
              <ListField label="Tags" value={p.tags} placeholder="Next.js, Firebase…" onChange={(tags) => patch({ tags })} />
              <LinksEditor links={p.links} onChange={(links) => patch({ links })} />
            </Group>
            <Group title="Media">
              <UploadField
                kind="image"
                preview="wide"
                label="Cover image"
                value={p.image}
                onChange={(image) => patch({ image })}
                hint="Optional. Without one, the card uses the built-in illustration."
              />
              <GalleryEditor images={p.gallery} onChange={(gallery) => patch({ gallery })} />
            </Group>
          </div>
        )}
      />
    </div>
  );
}

export function ExperienceEditor() {
  const [items, set] = useSlice("experience");
  return (
    <div className="space-y-6">
      <PageHeader title="Experience" description="Work, freelance and education, newest first." section="experience" />
      <Repeater
        items={items}
        onChange={set}
        make={() => ({ period: "", title: "", body: "", current: false })}
        title={(e) => e.title}
        subtitle={(e) => (e.current ? `${e.period} · Current` : e.period)}
        ok={itemOk.experience}
        noun="timeline entry"
        heading={`${items.length} ${items.length === 1 ? "entry" : "entries"}`}
        size="lg"
        render={(e, patch) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Period" required value={e.period} placeholder="2024 — Present" onChange={(period) => patch({ period })} />
              <Field label="Role · Organization" required value={e.title} placeholder="Frontend Developer · Acme" onChange={(title) => patch({ title })} />
            </div>
            <Field label="What you did" required multiline rows={4} value={e.body} onChange={(body) => patch({ body })} />
            <Switch label="I’m currently here" checked={e.current} onChange={(current) => patch({ current })} />
          </>
        )}
      />
    </div>
  );
}

export function CertificatesEditor() {
  const [items, set] = useSlice("certificates");
  return (
    <div className="space-y-6">
      <PageHeader title="Certificates" description="Courses and credentials, with a link to verify each one." section="certificates" />
      <Repeater
        items={items}
        onChange={set}
        make={() => ({ name: "", meta: "", href: "", image: "" })}
        title={(c) => c.name}
        subtitle={(c) => c.meta}
        thumb={(c) => c.image}
        ok={itemOk.certificate}
        noun="certificate"
        heading={`${items.length} ${items.length === 1 ? "certificate" : "certificates"}`}
        size="lg"
        render={(c, patch) => (
          <>
            <Field label="Certificate name" required value={c.name} onChange={(name) => patch({ name })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Issuer · Year" required value={c.meta} placeholder="Google · 2025" onChange={(meta) => patch({ meta })} />
              <Field label="Verification link" required type="url" value={c.href} placeholder="https://" onChange={(href) => patch({ href })} />
            </div>
            <UploadField
              kind="image"
              preview="wide"
              label="Certificate image"
              value={c.image}
              onChange={(image) => patch({ image })}
              hint="Optional. A picture or scan of the certificate."
            />
          </>
        )}
      />
    </div>
  );
}

export function BlogsEditor() {
  const [items, set] = useSlice("posts");
  const [blog, setBlog] = useSlice("blog");
  const [about] = useSlice("about");
  const shown = blog.photo.trim() || about.photo;
  return (
    <div className="space-y-6">
      <PageHeader title="Blogs" description="Posts shown as a timeline feed. The newest three show on the home page; all of them are on the blog page." section="blogs" />
      <Card className="grid gap-6 p-4 sm:grid-cols-[96px_1fr] sm:items-center sm:p-6">
        <div className="relative size-24 overflow-hidden rounded-full border border-border bg-muted-card">
          {shown && !shown.includes("[") ? (
            <SkeletonImage key={shown} src={shown} alt="Blog profile picture" sizes="96px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-faint">No photo</div>
          )}
        </div>
        <UploadField
          kind="image"
          preview="none"
          label="Profile picture"
          value={blog.photo}
          onChange={(photo) => setBlog({ ...blog, photo })}
          hint="Shown next to every post. Leave empty to use your About me photo."
        />
      </Card>
      <Repeater
        items={items}
        onChange={set}
        make={() => ({ meta: "", title: "", summary: "", body: "", href: "", image: "" })}
        title={(p) => p.title}
        subtitle={(p) => p.meta}
        thumb={(p) => p.image}
        ok={itemOk.post}
        noun="post"
        heading={`${items.length} ${items.length === 1 ? "post" : "posts"}`}
        size="xl"
        render={(p, patch) => (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
            <Group title="Post">
              <Field label="Title" required value={p.title} onChange={(title) => patch({ title })} />
              <Field
                label="Summary"
                required
                multiline
                value={p.summary}
                onChange={(summary) => patch({ summary })}
                hint="The short text shown in the feed."
              />
              <Field
                label="Full post"
                multiline
                rows={10}
                value={p.body}
                onChange={(body) => patch({ body })}
                hint="Shown when a visitor taps “Show more”. Leave a blank line between paragraphs."
              />
            </Group>
            <Group title="Details">
              <Field label="Date · Read time" required value={p.meta} placeholder="Mar 2025 · 5 min read" onChange={(meta) => patch({ meta })} />
              <Field
                label="Original post URL"
                type="url"
                value={p.href}
                placeholder="https://"
                onChange={(href) => patch({ href })}
                hint="Optional. Adds an “Original” link under the post."
              />
              <UploadField
                kind="image"
                preview="wide"
                label="Image"
                value={p.image}
                onChange={(image) => patch({ image })}
                hint="Optional. Attached under the post text, like media in a tweet."
              />
            </Group>
          </div>
        )}
      />
    </div>
  );
}

export function ContactEditor() {
  const [c, set] = useSlice("contact");
  return (
    <div className="space-y-6">
      <PageHeader title="Contact & links" description="How people reach you, shown in the hero and footer." section="contact" />
      <Card className="grid gap-5 p-4 sm:p-6">
        <Field label="Email" required type="email" value={c.email} placeholder="you@example.com" onChange={(email) => set({ ...c, email })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="GitHub profile" required type="url" value={c.github} placeholder="https://github.com/username" onChange={(github) => set({ ...c, github })} />
          <Field label="LinkedIn profile" required type="url" value={c.linkedin} placeholder="https://www.linkedin.com/in/username" onChange={(linkedin) => set({ ...c, linkedin })} />
        </div>
        <UploadField
          kind="document"
          label="Résumé"
          required
          value={c.resume}
          onChange={(resume) => set({ ...c, resume })}
          hint="Upload a PDF (stored on Cloudinary) or paste a link."
        />
      </Card>
    </div>
  );
}

export function SettingsEditor() {
  const { draft, update, reset, user } = useAdmin();
  const confirm = useConfirm();
  const s = draft.site;
  const setSite = (patch: Partial<Content["site"]>) => update((d) => ({ ...d, site: { ...d.site, ...patch } }));
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Site details and your admin account." />
      <Card className="grid gap-5 p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-fg">Site</h2>
        <Field label="Address" value={s.domain} onChange={(domain) => setSite({ domain })} />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg">Accent color</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Accent color"
              value={/^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : "#2563eb"}
              onChange={(e) => setSite({ accent: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-border-strong bg-card p-1"
            />
            <input
              value={s.accent}
              onChange={(e) => setSite({ accent: e.target.value })}
              aria-label="Accent hex value"
              className="h-10 w-32 rounded-lg border border-border-strong bg-card px-3 font-mono text-base text-fg sm:text-sm"
            />
          </div>
        </div>
      </Card>

      <Card className="grid gap-3 p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-fg">Account</h2>
        <p className="text-[15px] text-fg-soft">
          Signed in as <span className="font-medium text-fg">{user}</span>.
        </p>
        <p className="text-sm text-muted">
          The admin username and password are set with <code className="rounded bg-chip px-1 font-mono text-xs">ADMIN_USERNAME</code> and{" "}
          <code className="rounded bg-chip px-1 font-mono text-xs">ADMIN_PASSWORD_HASH</code> (made with{" "}
          <code className="rounded bg-chip px-1 font-mono text-xs">npm run hash-password</code>) in{" "}
          <code className="rounded bg-chip px-1 font-mono text-xs">.env.local</code>.
          Change <code className="rounded bg-chip px-1 font-mono text-xs">ADMIN_SESSION_SECRET</code> to sign out every device.
        </p>
      </Card>

      <Card className="grid gap-3 border-red-200 p-4 sm:p-6 dark:border-red-900/60">
        <h2 className="font-display text-lg font-semibold text-fg">Reset content</h2>
        <p className="text-sm text-muted">
          Loads the starter content into the editor. Nothing changes on the live site until you save.
        </p>
        <button
          type="button"
          onClick={async () => {
            const yes = await confirm({
              title: "Reset to starter content?",
              body: "Everything in the editor is replaced with the starter content. Nothing changes on the live site until you save.",
              confirmLabel: "Reset content",
              tone: "danger",
            });
            if (yes) reset();
          }}
          className="flex w-fit items-center gap-2 rounded-lg border border-red-300 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
        >
          Reset to defaults
        </button>
      </Card>
    </div>
  );
}
