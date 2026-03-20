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

export function FinalCta() {
  return (
    <section
      id="get-started"
      className="flex flex-col items-center gap-7 bg-bg px-5 py-12 md:px-[120px] md:py-20"
    >
      <h2 className="text-center font-serif text-3xl font-normal leading-[1.1] tracking-[-0.5px] text-fg md:text-[40px]">
        Ready to sync
        <br />
        your team?
      </h2>

      <p className="text-center font-sans text-base text-muted">
        Get started in under a minute. No account required.
      </p>

      <div className="flex max-w-full items-center gap-2.5 rounded-3xl bg-accent px-4 py-4 md:px-7">
        <TerminalIcon />
        <span className="font-mono text-xs font-medium text-white md:text-sm">
          npm install -g @manitmishra/skillsync
        </span>
      </div>

      <a
        href="https://www.npmjs.com/package/@manitmishra/skillsync"
        target="_blank"
        rel="noopener noreferrer"
        className="font-sans text-xs text-subtle underline underline-offset-2"
      >
        Free and open source. MIT licensed.
      </a>
    </section>
  );
}
