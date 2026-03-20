import { RotatingText } from "./rotating-text";
import { Terminal } from "./terminal";

function NpmIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M0 0v16h16V0H0zm13 13H8V5H5v8H3V3h10v10z" />
    </svg>
  );
}

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
    <section className="flex flex-col items-center gap-7 px-5 pb-[60px] pt-12 md:px-[120px] md:pt-20">
      <div className="flex items-center gap-2 rounded-[20px] border border-border bg-bg-white px-4 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-sans text-xs font-medium text-muted">
          Now in public beta
        </span>
      </div>

      <h1 className="text-center font-serif text-3xl font-normal leading-[1.15] tracking-[-1px] text-fg md:text-5xl">
        Share your Claude Code
        <br />
        skills with your <RotatingText />
      </h1>

      <p className="text-center font-sans text-[15px] leading-[1.6] text-muted md:text-[17px]">
        One CLI command syncs agents, skills, and workflows{" "}
        <br className="hidden md:inline" />
        across your entire team through GitHub.
      </p>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <a
          href="#get-started"
          className="flex items-center justify-center gap-2 rounded-3xl bg-accent px-7 py-3.5 font-sans text-sm font-medium text-white"
        >
          <TerminalIcon />
          Get Started
        </a>
        <a
          href="https://www.npmjs.com/package/@manitmishra/skillsync"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-3xl border border-border px-7 py-3.5 font-sans text-sm font-medium text-body-muted"
        >
          <NpmIcon />
          View on npm
        </a>
        <a
          href="/docs"
          className="flex items-center justify-center rounded-3xl border border-border px-7 py-3.5 font-sans text-sm font-medium text-body-muted"
        >
          View Documentation
        </a>
      </div>

      <Terminal />
    </section>
  );
}
