import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-16">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 underline underline-offset-4"
      >
        ← skillsync
      </Link>

      <h1 className="mt-8 text-3xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-4 text-zinc-500">
        skillsync is a CLI tool for sharing and syncing Claude Code agents and skills across a dev team.
      </p>

      <Section title="Installation">
        <CodeBlock>{"bunx skillsync"}</CodeBlock>
      </Section>

      <Section title="Commands">
        <CommandList />
      </Section>

      <Section title="How it works">
        <p className="text-zinc-600 leading-7">
          Each joined repo is cloned into <code className="font-mono text-sm bg-zinc-100 px-1 rounded">~/.skillsync/store/&lt;owner&gt;/&lt;repo&gt;/</code>.
          Tool directories (<code className="font-mono text-sm bg-zinc-100 px-1 rounded">~/.claude/skills/</code>, etc.) contain symlinks pointing into that store.
          This means you can be joined to multiple team repos simultaneously with no path collisions.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-zinc-900 px-6 py-4 text-sm text-green-400 overflow-x-auto">
      {children}
    </pre>
  );
}

function CommandList() {
  const commands = [
    { cmd: "skillsync join", desc: "Join a team GitHub repo and pull its agents/skills." },
    { cmd: "skillsync sync", desc: "Pull the latest from all joined repos and update symlinks." },
    { cmd: "skillsync import", desc: "Push your local agents/skills into the team repo." },
    { cmd: "skillsync status", desc: "Show joined repos, sync status, and linked tools." },
    { cmd: "skillsync create", desc: "Scaffold a new team skillsync repo on GitHub." },
    { cmd: "skillsync daemon start", desc: "Start the background watcher for auto-sync on file changes." },
    { cmd: "skillsync daemon stop", desc: "Stop the background watcher." },
    { cmd: "skillsync leave", desc: "Remove a repo and unlink its tools from this machine." },
    { cmd: "skillsync destroy", desc: "Delete the team repo from GitHub (destructive)." },
  ];

  return (
    <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
      {commands.map(({ cmd, desc }) => (
        <div key={cmd} className="flex gap-6 px-4 py-3 text-sm">
          <code className="font-mono text-zinc-900 shrink-0 w-52">{cmd}</code>
          <span className="text-zinc-500">{desc}</span>
        </div>
      ))}
    </div>
  );
}
