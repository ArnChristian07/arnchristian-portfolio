export const THUMB_KINDS = ["console", "swatches", "window"] as const;
type Kind = (typeof THUMB_KINDS)[number];

/** Lightweight, theme-aware illustrations for project cards (no image assets). */
export function ProjectThumb({ kind }: { kind: Kind }) {
  if (kind === "console") {
    return (
      <div className="grid h-full place-items-center bg-ink">
        <div className="relative flex h-[46%] w-[46%] items-center justify-between rounded-lg bg-[#3ccfb8] px-[7%] shadow-[0_14px_30px_-10px_rgb(60_207_184/0.55)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-3 group-hover:scale-[1.04]">
          <div className="h-[46%] w-[30%] rounded-[4px] bg-[#111a2e]" />
          <div className="flex flex-col gap-[18%]">
            <span className="size-2.5 rounded-full bg-[#111a2e]" />
            <span className="size-2.5 rounded-full bg-[#111a2e]" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "swatches") {
    const tones = ["#f6d5c3", "#e8b591", "#d8936d", "#c27a52", "#9a5a36", "#7a4325", "transparent", "#4a2614"];
    return (
      <div className="grid h-full place-items-center bg-art-card">
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {tones.map((c, i) => (
            <span
              key={i}
              style={{ background: c === "transparent" ? undefined : c, transitionDelay: `${i * 30}ms` }}
              className={`size-7 rounded-md transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1 sm:size-8 ${
                c === "transparent" ? "border-2 border-accent bg-card" : ""
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center bg-muted-card">
      <div className="w-[52%] rounded-lg border border-border bg-card p-3 shadow-lift transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1">
        <div className="h-1.5 w-2/3 rounded-full bg-fg/80" />
        <div className="mt-2 h-1 w-full rounded-full bg-border-strong" />
        <div className="mt-1.5 h-1 w-4/5 rounded-full bg-border-strong" />
        <div className="mt-3 h-3 w-2/5 rounded bg-accent" />
      </div>
    </div>
  );
}
