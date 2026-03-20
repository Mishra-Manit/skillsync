export function Header() {
  return (
    <header className="flex items-center justify-between px-20 py-5">
      <span className="font-serif text-[22px] font-medium tracking-[-0.5px] text-fg">
        skillsync
      </span>

      <nav className="flex items-center gap-9">
        <a href="#features" className="font-sans text-sm text-muted">
          Features
        </a>
        <a href="#how-it-works" className="font-sans text-sm text-muted">
          How It Works
        </a>
        <a href="/docs" className="font-sans text-sm text-muted">
          Docs
        </a>
        <a
          href="#get-started"
          className="rounded-3xl bg-accent px-6 py-2.5 font-sans text-[13px] font-medium text-white"
        >
          Get Started
        </a>
      </nav>
    </header>
  );
}
