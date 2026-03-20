const ROW_1 = [
  {
    title: "One-command sync",
    desc: "Run skillsync sync. Every agent, skill, and workflow updates instantly. No git pull, no manual copying.",
    border: "border-t border-r border-b border-border",
  },
  {
    title: "GitHub-backed",
    desc: "Skills live in a GitHub repo. Version history, access control, and code review come for free.",
    border: "border-t border-b border-border",
  },
] as const;

const ROW_2 = [
  {
    title: "Symlink-based",
    desc: "Symlinked into ~/.claude, not copied. One source of truth, zero duplication.",
    border: "border-b border-r border-border",
  },
  {
    title: "Daemon auto-sync",
    desc: "A background daemon watches for changes and syncs automatically. Start it once, forget about it.",
    border: "border-b border-r border-border",
  },
  {
    title: "Team management",
    desc: "Join, leave, import, delete, destroy. Every action is reversible, every command has a confirmation step.",
    border: "border-b border-border",
  },
] as const;

function FeatureCell({
  title,
  desc,
  border,
}: {
  title: string;
  desc: string;
  border: string;
}) {
  return (
    <div className={`flex flex-1 flex-col gap-3 px-8 py-10 ${border}`}>
      <h3 className="font-sans text-lg font-semibold text-fg">{title}</h3>
      <p className="font-sans text-sm leading-[1.6] text-muted">{desc}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="flex flex-col gap-16 bg-bg-white p-20">
      <div className="flex flex-col gap-4">
        <span className="font-sans text-[13px] font-medium uppercase tracking-[1px] text-muted">
          Features
        </span>
        <h2 className="max-w-[800px] font-serif text-5xl font-normal leading-[1.1] tracking-[-2px] text-fg">
          No new platform. Just Git.
        </h2>
      </div>

      <div className="flex flex-col">
        <div className="flex">
          {ROW_1.map((f) => (
            <FeatureCell key={f.title} {...f} />
          ))}
        </div>
        <div className="flex">
          {ROW_2.map((f) => (
            <FeatureCell key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
