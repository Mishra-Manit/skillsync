const ROW_1 = [
  {
    title: "One-command sync",
    desc: "Run bunx skillsync sync and every shared agent, skill, and workflow on your machine updates instantly. No git pull, no manual copying.",
    border: "border-t border-r border-b border-border",
  },
  {
    title: "GitHub-backed",
    desc: "Your team\u2019s skills live in a standard GitHub repository. Version history, access control, and code review \u2014 tools you already know.",
    border: "border-t border-b border-border",
  },
] as const;

const ROW_2 = [
  {
    title: "Symlink-based",
    desc: "Skills are symlinked into your ~/.claude directory \u2014 not copied. One source of truth, zero duplication, instant updates across every project.",
    border: "border-b border-r border-border",
  },
  {
    title: "Daemon auto-sync",
    desc: "Start the background daemon and forget about it. File changes are watched and synced automatically \u2014 your team always has the latest version.",
    border: "border-b border-r border-border",
  },
  {
    title: "Team management",
    desc: "Join multiple team repos, leave when you want, or destroy a repo entirely. Full lifecycle management with clear, reversible commands.",
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
          Everything a team needs, nothing it doesn&apos;t
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
