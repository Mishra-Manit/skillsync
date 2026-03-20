const ROW_1 = [
  {
    title: "One-command sync",
    desc: "Run skillsync sync. Every agent, skill, and workflow updates instantly. No git pull, no manual copying.",
    desktopBorder: "md:border-t md:border-r",
  },
  {
    title: "GitHub-backed",
    desc: "Skills live in a GitHub repo. Version history, access control, and code review come for free.",
    desktopBorder: "md:border-t",
  },
] as const;

const ROW_2 = [
  {
    title: "Symlink-based",
    desc: "Symlinked into ~/.claude, not copied. One source of truth, zero duplication.",
    desktopBorder: "md:border-r",
  },
  {
    title: "Daemon auto-sync",
    desc: "A background daemon watches for changes and syncs automatically. Start it once, forget about it.",
    desktopBorder: "md:border-r",
  },
  {
    title: "Team management",
    desc: "Join, leave, import, delete, destroy. Every action is reversible, every command has a confirmation step.",
    desktopBorder: "",
  },
] as const;

function FeatureCell({
  title,
  desc,
  desktopBorder,
}: {
  title: string;
  desc: string;
  desktopBorder: string;
}) {
  return (
    <div className={`flex flex-1 flex-col gap-3 border-b border-border px-5 py-6 md:px-8 md:py-10 ${desktopBorder}`}>
      <h3 className="font-sans text-lg font-semibold text-fg">{title}</h3>
      <p className="font-sans text-sm leading-[1.6] text-muted">{desc}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="flex flex-col gap-10 bg-bg-white p-5 md:gap-16 md:p-20">
      <div className="flex flex-col gap-4">
        <span className="font-sans text-[13px] font-medium uppercase tracking-[1px] text-muted">
          Features
        </span>
        <h2 className="max-w-[800px] font-serif text-3xl font-normal leading-[1.1] tracking-[-1px] text-fg md:text-5xl md:tracking-[-2px]">
          No new platform. Just Git.
        </h2>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row">
          {ROW_1.map((f) => (
            <FeatureCell key={f.title} {...f} />
          ))}
        </div>
        <div className="flex flex-col md:flex-row">
          {ROW_2.map((f) => (
            <FeatureCell key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
