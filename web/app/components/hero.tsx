import { Terminal } from "./terminal";

function TerminalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-7 px-[120px] pb-[60px] pt-20">
      <div className="flex items-center gap-2 rounded-[20px] border border-border bg-bg-white px-4 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-sans text-xs font-medium text-muted">
          Now in public beta
        </span>
      </div>

      <h1 className="text-center font-serif text-5xl font-normal leading-[1.15] tracking-[-1px] text-fg">
        Share your Claude Code
        <br />
        skills with your team
      </h1>

      <p className="text-center font-sans text-[17px] leading-[1.6] text-muted">
        One CLI command syncs agents, skills, and workflows
        <br />
        across your entire team through GitHub.
      </p>

      <div className="flex items-center gap-3">
        <a
          href="#get-started"
          className="flex items-center gap-2 rounded-3xl bg-accent px-7 py-3.5 font-sans text-sm font-medium text-white"
        >
          <TerminalIcon />
          Get Started
        </a>
        <a
          href="/docs"
          className="rounded-3xl border border-border px-7 py-3.5 font-sans text-sm font-medium text-body-muted"
        >
          View Documentation
        </a>
      </div>

      <Terminal />
    </section>
  );
}
