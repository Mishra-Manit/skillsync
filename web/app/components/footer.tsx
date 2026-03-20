const PRODUCT_LINKS = ["Features", "How It Works", "Docs"] as const;
const RESOURCE_LINKS = ["GitHub", "Changelog", "MIT License"] as const;

export function Footer() {
  return (
    <footer className="flex flex-col gap-8 bg-bg px-20 py-10">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-serif text-lg font-medium tracking-[-0.5px] text-fg">
            skillsync
          </span>
          <p className="font-sans text-[13px] leading-[1.5] text-subtle">
            Share Claude Code skills
            <br />
            across your team.
          </p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-sans text-[13px] font-semibold text-fg">
              Product
            </span>
            {PRODUCT_LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="font-sans text-[13px] text-muted"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-sans text-[13px] font-semibold text-fg">
              Resources
            </span>
            {RESOURCE_LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="font-sans text-[13px] text-muted"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
