import { ArrowRight, FileText, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Content } from "./admin/content";
import { SkeletonImage } from "./skeleton-image";
import { BlogFeed, type FeedAuthor } from "./blog-feed";
import { CertificateGrid, ProjectGrid } from "./showcase";
import { Reveal, Stagger, StaggerItem } from "./reveal";
import { Timeline } from "./timeline";
import { GithubIcon, LinkedinIcon } from "./icons";
import { ContactForm } from "./contact-form";

/* ---------- primitives ---------- */

/** True for a real link: not empty and not a bare "#". */
const isLink = (href: string) => !!href.trim() && href.trim() !== "#";

function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

function Eyebrow({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
      {n} — {children}
    </p>
  );
}

function Heading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`mt-3 font-display text-3xl font-bold tracking-[-0.025em] text-fg sm:text-[2.1rem] ${className}`}
    >
      {children}
    </h2>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-full bg-chip px-2.5 py-1 text-[11.5px] font-medium text-chip-fg">
      {children}
    </li>
  );
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  // Pages on this site go through next/link; outside links stay plain anchors.
  const Tag = href.startsWith("/") ? Link : "a";
  return (
    <Tag
      href={href}
      className="group inline-flex items-center gap-1 text-[13px] font-medium text-fg-soft transition-colors hover:text-accent"
    >
      {children}
      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Tag>
  );
}

const card =
  "rounded-2xl border border-border bg-card shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:border-border-strong hover:shadow-lift";

const filled = (s: string) => s.trim() !== "";

/** Shown in place of a section's list when nothing has been added yet. */
function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Reveal className="mt-10">
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-12 text-center">
        <p className="max-w-sm text-[15px] leading-relaxed text-muted">{children}</p>
      </div>
    </Reveal>
  );
}

/* ---------- 01 About ---------- */

export function About({ about, name }: { about: Content["about"]; name: string }) {
  // Blank lines in the admin's "About text" separate paragraphs.
  const paragraphs = about.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <section id="about" className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.5fr] lg:gap-16">
        <div>
          <Reveal>
            <div className="group relative mx-auto aspect-[4/5] w-full max-w-[280px] lg:mx-0">
              <div className="absolute inset-0 -rotate-[4deg] rounded-2xl bg-accent-soft transition-transform duration-500 group-hover:-rotate-[6deg]" />
              <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-muted-card shadow-lift transition-transform duration-500 group-hover:rotate-1">
                {filled(about.photo) ? (
                  <SkeletonImage
                    src={about.photo}
                    alt={name ? `Portrait of ${name}` : "Portrait"}
                    sizes="(min-width: 1024px) 280px, 80vw"
                    className="object-cover object-[50%_20%] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.03]"
                  />
                ) : (
                  // No photo yet: a monogram instead of an empty frame.
                  <div className="grid h-full place-items-center bg-gradient-to-br from-accent-soft to-muted-card">
                    {filled(name) ? (
                      <span aria-hidden className="font-display text-7xl font-bold text-accent">
                        {name.trim()[0].toUpperCase()}
                      </span>
                    ) : (
                      <UserRound aria-hidden className="size-20 text-accent" strokeWidth={1.4} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 text-center lg:text-left">
            <Eyebrow n="01">About me</Eyebrow>
            <Heading className="mx-auto max-w-[16ch] leading-[1.1] lg:mx-0">
              {filled(about.heading) ? about.heading : "A little about me."}
            </Heading>
          </Reveal>
        </div>

        <div>
          <Reveal className="mx-auto max-w-prose space-y-5 text-center text-[15px] leading-[1.75] text-muted lg:mx-0 lg:max-w-none lg:text-left">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>
                I’m a developer who enjoys building web and mobile apps and learning how things
                work. A fuller introduction is on its way, so check back soon.
              </p>
            )}
          </Reveal>
          {about.stats.some((s) => filled(s.value)) && (
          <Stagger className="mt-8 grid grid-cols-3 gap-3 sm:gap-4" delay={0.1}>
            {about.stats.filter((s) => filled(s.value)).map((s, i) => (
              <StaggerItem key={i}>
                <div className="h-full rounded-xl border border-border bg-muted-card p-4 text-center transition-colors hover:border-border-strong sm:p-5 lg:text-left">
                  <p className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[1.7rem]">
                    {s.value}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-snug text-muted sm:text-xs">
                    {s.label}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          )}
        </div>
      </Container>
    </section>
  );
}

/* ---------- 02 Skills ---------- */

export function Skills({ skills: all }: { skills: Content["skills"] }) {
  const skills = all.filter((s) => filled(s.title) || s.items.some(filled));
  return (
    <section id="skills" className="bg-bg-alt py-20 sm:py-28">
      <Container>
        <Reveal className="text-center lg:text-left">
          <Eyebrow n="02">Skills</Eyebrow>
          <Heading>Tools I reach for.</Heading>
        </Reveal>
        {skills.length === 0 ? (
          <EmptyState>My toolkit is being written up. Check back soon to see what I work with.</EmptyState>
        ) : (
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((s, idx) => {
            return (
              <StaggerItem key={idx} className="h-full">
                <div className={`h-full p-6 text-center sm:text-left ${card}`}>
                  <h3 className="font-display text-[15px] font-semibold text-fg">
                    {s.title}
                  </h3>
                  <ul className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {s.items.filter((i) => i.trim()).map((i, n) => (
                      <Chip key={n}>{i}</Chip>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
        )}
      </Container>
    </section>
  );
}

/* ---------- 03 Projects ---------- */

export function Projects({ projects: all, github }: { projects: Content["projects"]; github: string }) {
  const projects = all.filter((p) => filled(p.title));
  return (
    <section id="projects" className="py-20 sm:py-28">
      <Container>
        <Reveal className="flex flex-col items-center gap-4 text-center lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:text-left">
          <div>
            <Eyebrow n="03">Projects</Eyebrow>
            <Heading>Selected work.</Heading>
          </div>
          {isLink(github) && <TextLink href={github}>All repositories</TextLink>}
        </Reveal>

        {projects.length === 0 ? (
          <EmptyState>Projects are on their way. Check back soon to see what I’ve been building.</EmptyState>
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </Container>
    </section>
  );
}

/* ---------- 04 Experience ---------- */

export function Experience({ items: all }: { items: Content["experience"] }) {
  const items = all.filter((e) => filled(e.title));
  return (
    <section id="experience" className="bg-bg-alt py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.5fr] lg:gap-16">
        <Reveal className="text-center lg:text-left lg:sticky lg:top-28 lg:self-start">
          <Eyebrow n="04">Experience</Eyebrow>
          <Heading className="mx-auto max-w-[12ch] leading-[1.1] lg:mx-0">
            Where I&apos;ve worked and learned.
          </Heading>
        </Reveal>
        {items.length === 0 ? (
          <div className="-mt-10 lg:mt-0">
            <EmptyState>
              My work and education timeline is being put together. Check back soon.
            </EmptyState>
          </div>
        ) : (
          <Timeline items={items} />
        )}
      </Container>
    </section>
  );
}

/* ---------- 05 Certificates ---------- */

export function Certificates({ items: all }: { items: Content["certificates"] }) {
  const items = all.filter((c) => filled(c.name));
  return (
    <section id="certificates" className="py-20 sm:py-28">
      <Container>
        <Reveal className="text-center lg:text-left">
          <Eyebrow n="05">Certificates</Eyebrow>
          <Heading>Credentials.</Heading>
        </Reveal>
        {items.length === 0 ? (
          <EmptyState>Certificates and courses will be listed here soon.</EmptyState>
        ) : (
          <CertificateGrid items={items} />
        )}
      </Container>
    </section>
  );
}

/* ---------- 06 Blogs ---------- */

/** How many posts the home page shows before pointing to /blogs. */
export const HOME_POSTS = 3;

/** One bordered column, like a timeline. */
const feedCard = "overflow-hidden rounded-2xl border border-border bg-card shadow-card";

export function Blogs({ posts: all, author }: { posts: Content["posts"]; author: FeedAuthor }) {
  const posts = all.filter((p) => filled(p.title));
  const more = posts.length > HOME_POSTS;
  return (
    <section id="blogs" className="bg-bg-alt py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-14">
        <Reveal className="text-center lg:text-left lg:sticky lg:top-28 lg:self-start">
          <Eyebrow n="06">Blogs</Eyebrow>
          <Heading>Notes from the desk.</Heading>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted lg:mx-0">
            Short updates and longer write-ups about what I’m building, breaking and learning along the way.
          </p>
          {posts.length > 0 && (
            <div className="mt-6">
              <TextLink href="/blogs">Open the full feed</TextLink>
            </div>
          )}
        </Reveal>

        {posts.length === 0 ? (
          <EmptyState>No posts yet. I’ll share write-ups about what I’m building here soon.</EmptyState>
        ) : (
          <Reveal className={feedCard}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <p className="font-display text-[15px] font-semibold text-fg">Latest posts</p>
              <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            </div>
            <BlogFeed posts={posts.slice(0, HOME_POSTS)} author={author} />
            <Link
              href="/blogs"
              className="group flex items-center justify-center gap-1.5 border-t border-border px-5 py-4 text-sm font-medium text-accent transition-colors hover:bg-muted-card/60"
            >
              {more ? `Show all ${posts.length} posts` : "Go to the feed"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        )}
      </Container>
    </section>
  );
}

/** The full feed on /blogs: the usual page header, then every post in one column. */
export function BlogIndex({ posts: all, author }: { posts: Content["posts"]; author: FeedAuthor }) {
  const posts = all.filter((p) => filled(p.title));
  return (
    <section className="flex-1 bg-gradient-to-b from-[var(--hero-from)] to-[var(--hero-to)] pb-20 pt-32 sm:pb-28 sm:pt-36">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <Reveal>
          <Link
            href="/#blogs"
            className="group inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-accent"
          >
            <ArrowRight className="size-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back home
          </Link>
          <p className="mt-8 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Blog · {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-fg sm:text-5xl">
            Notes from the desk.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            Short updates and longer write-ups about what I’m building, breaking and learning along the way.
          </p>
        </Reveal>
        {posts.length === 0 ? (
          <EmptyState>No posts yet. I’ll share write-ups about what I’m building here soon.</EmptyState>
        ) : (
          <Reveal className={`mt-12 ${feedCard}`}>
            <BlogFeed posts={posts} author={author} expandFirst />
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ---------- 07 Contact ---------- */

export function Contact({ contact }: { contact: Content["contact"] }) {
  const email = contact.email.trim();
  const links = [
    { label: "GitHub", href: contact.github, Icon: GithubIcon },
    { label: "LinkedIn", href: contact.linkedin, Icon: LinkedinIcon },
    { label: "Résumé", href: contact.resume, Icon: FileText },
  ].filter((l) => isLink(l.href));
  return (
    <section id="contact" className="py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal className="text-center lg:text-left lg:sticky lg:top-28 lg:self-start">
          <Eyebrow n="07">Contact</Eyebrow>
          <Heading className="mx-auto max-w-[14ch] leading-[1.1] lg:mx-0">Let&apos;s build something.</Heading>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted lg:mx-0">
            Open to OJT placements, internships and freelance front-end work. Send a message and I
            usually reply within a day.
          </p>
          {(filled(email) || links.length > 0) && (
            <ul className="mt-8 flex flex-col items-center gap-2.5 lg:items-start">
              {filled(email) && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="group inline-flex items-center gap-3 text-[14.5px] font-medium text-fg transition-colors hover:text-accent"
                  >
                    <span className="grid size-9 place-items-center rounded-lg border border-border bg-card text-accent">
                      <Mail className="size-4" />
                    </span>
                    {email}
                  </a>
                </li>
              )}
              {links.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-3 text-[14.5px] font-medium text-fg-soft transition-colors hover:text-accent"
                  >
                    <span className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted transition-colors group-hover:text-accent">
                      <Icon className="size-4" />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
        <Reveal delay={0.1} className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-8">
          <ContactForm />
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- Footer ---------- */

export function Footer({ contact, name }: { contact: Content["contact"]; name: string }) {
  const links = [
    { label: "GitHub", href: contact.github, Icon: GithubIcon },
    { label: "LinkedIn", href: contact.linkedin, Icon: LinkedinIcon },
    { label: "Résumé", href: contact.resume, Icon: null },
  ].filter((l) => isLink(l.href));
  return (
    <footer className="bg-ink text-ink-fg">
      <Container className="flex flex-col items-center gap-4 py-8 text-center text-[12.5px] text-ink-fg/55 lg:flex-row lg:justify-between lg:text-left">
        <p>© 2026 {filled(name) ? name : "Arn Christian"}. All rights reserved.</p>
        {links.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-5 lg:justify-start">
            {links.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-fg">
                  {Icon && <Icon className="size-3.5" />} {label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </footer>
  );
}
