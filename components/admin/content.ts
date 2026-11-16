// The editable shape of the portfolio. The live copy is stored in Firestore
// (lib/content-store.ts); lib/seed.ts pre-fills the editor before the first save.

export type Link = { label: string; href: string };

export type Content = {
  profile: { name: string; availability: string; headline: string; tagline: string };
  about: { photo: string; heading: string; body: string; stats: { value: string; label: string }[] };
  skills: { title: string; items: string[] }[];
  /**
   * `image` is the cover (card thumbnail); empty means a built-in illustration is shown.
   * `gallery` holds extra screenshot URLs, shown after the cover in the project viewer.
   */
  projects: {
    title: string;
    status: string;
    description: string;
    tags: string[];
    links: Link[];
    image: string;
    gallery: string[];
  }[];
  experience: { period: string; title: string; body: string; current: boolean }[];
  /** `image` is a Cloudinary URL of the certificate; empty means a text-only card. */
  certificates: { name: string; meta: string; href: string; image: string }[];
  /**
   * `image` is the cover shown on the post card; empty means a built-in illustration.
   * `body` is the full text shown when the card is opened (blank lines split paragraphs).
   */
  posts: { meta: string; title: string; summary: string; body: string; href: string; image: string }[];
  /** Settings for the blog feed. `photo` is the author avatar; empty falls back to the About photo. */
  blog: { photo: string };
  contact: { email: string; github: string; linkedin: string; resume: string };
  site: { domain: string; accent: string; hidden: SectionId[] };
};

export const SECTIONS = [
  { id: "hero", label: "Hero & profile", href: "/admin/hero" },
  { id: "about", label: "About me", href: "/admin/about" },
  { id: "skills", label: "Skills", href: "/admin/skills" },
  { id: "projects", label: "Projects", href: "/admin/projects" },
  { id: "experience", label: "Experience", href: "/admin/experience" },
  { id: "certificates", label: "Certificates", href: "/admin/certificates" },
  { id: "blogs", label: "Blogs", href: "/admin/blogs" },
  { id: "contact", label: "Contact & links", href: "/admin/contact" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const DEFAULT_ACCENT = "#2563eb";

/** Content with nothing filled in. The public site only shows what Firestore holds. */
export const emptyContent: Content = {
  profile: { name: "", availability: "", headline: "", tagline: "" },
  about: { photo: "", heading: "", body: "", stats: [] },
  skills: [],
  projects: [],
  experience: [],
  certificates: [],
  posts: [],
  blog: { photo: "" },
  contact: { email: "", github: "", linkedin: "", resume: "" },
  site: { domain: "arnchristian-portfolio.vercel.app", accent: DEFAULT_ACCENT, hidden: [] },
};

/* ------------------------------------------------------------- normalize -- */

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const rec = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
function list<T>(v: unknown, fallback: T[], map: (x: Record<string, unknown>) => T): T[] {
  return Array.isArray(v) ? v.map((x) => map(rec(x))) : fallback;
}
const SECTION_IDS = new Set<string>(SECTIONS.map((s) => s.id));

/**
 * Coerces data read from Firestore (or sent by the admin) into a complete
 * `Content`. Missing keys become empty, so documents saved by an older shape
 * still load, and unexpected fields are dropped.
 */
export function normalizeContent(input: unknown): Content {
  const d = emptyContent;
  const c = rec(input);
  const profile = rec(c.profile);
  const about = rec(c.about);
  const contact = rec(c.contact);
  const blog = rec(c.blog);
  const s = rec(c.site);
  const link = (l: Record<string, unknown>) => ({ label: str(l.label), href: str(l.href) });
  return {
    profile: {
      name: str(profile.name, d.profile.name),
      availability: str(profile.availability, d.profile.availability),
      headline: str(profile.headline, d.profile.headline),
      tagline: str(profile.tagline, d.profile.tagline),
    },
    about: {
      photo: str(about.photo, d.about.photo),
      heading: str(about.heading, d.about.heading),
      body: str(about.body, d.about.body),
      stats: list(about.stats, d.about.stats, (x) => ({ value: str(x.value), label: str(x.label) })),
    },
    skills: list(c.skills, d.skills, (x) => ({ title: str(x.title), items: strs(x.items) })),
    projects: list(c.projects, d.projects, (x) => ({
      title: str(x.title),
      status: str(x.status),
      description: str(x.description),
      tags: strs(x.tags),
      links: list(x.links, [], link),
      image: str(x.image),
      gallery: strs(x.gallery),
    })),
    experience: list(c.experience, d.experience, (x) => ({
      period: str(x.period),
      title: str(x.title),
      body: str(x.body),
      current: x.current === true,
    })),
    certificates: list(c.certificates, d.certificates, (x) => ({
      name: str(x.name),
      meta: str(x.meta),
      href: str(x.href),
      image: str(x.image),
    })),
    posts: list(c.posts, d.posts, (x) => ({
      meta: str(x.meta),
      title: str(x.title),
      summary: str(x.summary),
      body: str(x.body),
      href: str(x.href),
      image: str(x.image),
    })),
    blog: { photo: str(blog.photo, d.blog.photo) },
    contact: {
      email: str(contact.email, d.contact.email),
      github: str(contact.github, d.contact.github),
      linkedin: str(contact.linkedin, d.contact.linkedin),
      resume: str(contact.resume, d.contact.resume),
    },
    site: {
      domain: str(s.domain, d.site.domain),
      accent: str(s.accent, d.site.accent),
      hidden: strs(s.hidden).filter((h): h is SectionId => SECTION_IDS.has(h)),
    },
  };
}

/* ---------------------------------------------------------------- checks -- */

const PLACEHOLDER = /\[[^\]]+\]/;

/** Empty, "[PLACEHOLDER]" or bare "#" links count as not filled in. */
export function missing(v: string | undefined) {
  const s = (v ?? "").trim();
  return !s || s === "#" || PLACEHOLDER.test(s);
}

const profileUrl = (v: string) => {
  if (missing(v)) return false;
  try {
    return new URL(v).pathname.replace(/\/+$/, "").length > 0;
  } catch {
    return false;
  }
};

export type Task = { section: SectionId; text: string };
export type SectionStatus = {
  id: SectionId;
  label: string;
  href: string;
  count: number | null;
  summary: string;
  issues: number;
  tasks: Task[];
};

type Check = { ok: boolean; fix: string };

function listTasks(section: SectionId, oks: boolean[], noun: string): Task[] {
  const bad = oks.filter((o) => !o).length;
  if (!bad) return [];
  return [{ section, text: `${bad} of ${oks.length} ${noun} still need details` }];
}

/** Per-item completeness checks, shared by the readiness score and the admin lists. */
export const itemOk = {
  stat: (s: Content["about"]["stats"][number]) => !missing(s.value) && !missing(s.label),
  skill: (s: Content["skills"][number]) => !missing(s.title) && s.items.some((i) => !missing(i)),
  project: (p: Content["projects"][number]) =>
    !missing(p.title) && !missing(p.description) && p.links.every((l) => !missing(l.href)),
  experience: (e: Content["experience"][number]) => !missing(e.period) && !missing(e.title) && !missing(e.body),
  certificate: (x: Content["certificates"][number]) => !missing(x.name) && !missing(x.meta) && !missing(x.href),
  post: (x: Content["posts"][number]) =>
    !missing(x.title) && !missing(x.meta) && !missing(x.summary),
};

function sectionChecks(c: Content) {
  const p = c.profile;
  const heroChecks: Check[] = [
    { ok: !missing(p.name), fix: "Add your name" },
    { ok: !missing(p.headline), fix: "Write your headline" },
    { ok: !missing(p.tagline), fix: "Write a short intro line" },
  ];
  const aboutChecks: Check[] = [
    { ok: !missing(c.about.photo), fix: "Add your photo" },
    { ok: !missing(c.about.body), fix: "Replace the placeholder in about text" },
  ];
  const stats = c.about.stats.map(itemOk.stat);
  const skills = c.skills.map(itemOk.skill);
  const projects = c.projects.map(itemOk.project);
  const exp = c.experience.map(itemOk.experience);
  const certs = c.certificates.map(itemOk.certificate);
  const posts = c.posts.map(itemOk.post);
  const k = c.contact;
  const contactChecks: Check[] = [
    { ok: !missing(k.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k.email), fix: "Add your contact email" },
    { ok: profileUrl(k.github), fix: "Link your GitHub profile" },
    { ok: profileUrl(k.linkedin), fix: "Link your LinkedIn profile" },
    { ok: !missing(k.resume), fix: "Upload or link your résumé" },
  ];

  return {
    hero: { flat: heroChecks, list: [] as boolean[], noun: "" },
    about: { flat: aboutChecks, list: stats, noun: "stats" },
    skills: { flat: [], list: skills, noun: "skill groups" },
    projects: { flat: [], list: projects, noun: "projects" },
    experience: { flat: [], list: exp, noun: "timeline entries" },
    certificates: { flat: [], list: certs, noun: "certificates" },
    blogs: { flat: [], list: posts, noun: "posts" },
    contact: { flat: contactChecks, list: [] as boolean[], noun: "" },
  } satisfies Record<SectionId, { flat: Check[]; list: boolean[]; noun: string }>;
}

function summary(id: SectionId, c: Content): string {
  const names = (xs: string[]) => xs.filter(Boolean).join(", ");
  switch (id) {
    case "hero":
      return c.profile.headline.split("\n")[0] || "No headline yet";
    case "about":
      return `${c.about.stats.length} stats · ${names(c.about.stats.map((s) => s.label))}`;
    case "skills":
      return `${c.skills.length} skill groups · ${names(c.skills.map((s) => s.title))}`;
    case "projects":
      return `${c.projects.length} projects · ${names(c.projects.map((p) => p.title))}`;
    case "experience":
      return `${c.experience.length} entries · ${names(c.experience.map((e) => e.title.split(" · ")[0]))}`;
    case "certificates":
      return `${c.certificates.length} certificates · ${names(c.certificates.map((x) => x.name))}`;
    case "blogs":
      return `${c.posts.length} posts · ${names(c.posts.map((x) => x.title))}`;
    case "contact":
      return missing(c.contact.email) ? "No email yet" : c.contact.email;
  }
}

function count(id: SectionId, c: Content): number | null {
  switch (id) {
    case "about": return c.about.stats.length;
    case "skills": return c.skills.length;
    case "projects": return c.projects.length;
    case "experience": return c.experience.length;
    case "certificates": return c.certificates.length;
    case "blogs": return c.posts.length;
    default: return null;
  }
}

export function readiness(c: Content) {
  const checks = sectionChecks(c);
  let ok = 0;
  let total = 0;
  const sections: SectionStatus[] = SECTIONS.map((s) => {
    const { flat, list, noun } = checks[s.id];
    const all = [...flat.map((f) => f.ok), ...list];
    ok += all.filter(Boolean).length;
    total += all.length;
    const tasks: Task[] = [
      ...flat.filter((f) => !f.ok).map((f) => ({ section: s.id, text: f.fix })),
      ...listTasks(s.id, list, noun),
    ];
    return {
      ...s,
      count: count(s.id, c),
      summary: summary(s.id, c),
      issues: all.filter((x) => !x).length,
      tasks,
    };
  });
  const percent = total ? Math.round((ok / total) * 100) : 100;
  const left = total - ok;
  return { percent, left, sections, tasks: sections.flatMap((s) => s.tasks) };
}
