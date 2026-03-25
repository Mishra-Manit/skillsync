import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Docs", href: "/docs" },
] as const;

const RESOURCE_LINKS = [
  { label: "GitHub", href: "https://github.com/manitmishra/skillsync" },
  { label: "npm", href: "https://www.npmjs.com/package/@manitmishra/skillsync" },
  { label: "MIT License", href: "https://github.com/manitmishra/skillsync/blob/main/LICENSE" },
] as const;

export function Footer() {
  return (
    <footer className="flex flex-col gap-8 bg-bg px-5 py-10 md:px-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
            {PRODUCT_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="font-sans text-[13px] text-muted hover:text-fg transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-sans text-[13px] font-semibold text-fg">
              Resources
            </span>
            {RESOURCE_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[13px] text-muted hover:text-fg transition-colors"
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
