import type { Metadata } from "next";
import Link from "next/link";
import Content from "./content.mdx";
import { Sidebar, type TocGroup } from "./sidebar";

export const metadata: Metadata = {
  title: "Documentation — skillsync",
  description:
    "Complete documentation for the skillsync CLI tool. Commands, architecture, configuration, and troubleshooting.",
};

const TOC: TocGroup[] = [
  {
    group: "Getting Started",
    items: [
      { label: "Installation", id: "installation" },
      { label: "Quick Start", id: "quick-start" },
    ],
  },
  {
    group: "Commands",
    items: [
      { label: "create", id: "create" },
      { label: "join", id: "join" },
      { label: "sync", id: "sync" },
      { label: "import", id: "import" },
      { label: "status", id: "status" },
      { label: "delete", id: "delete" },
      { label: "leave", id: "leave" },
      { label: "destroy", id: "destroy" },
      { label: "daemon", id: "daemon" },
      { label: "check-git", id: "check-git" },
    ],
  },
  {
    group: "Reference",
    items: [
      { label: "Architecture", id: "architecture" },
      { label: "Configuration", id: "configuration" },
      { label: "Troubleshooting", id: "troubleshooting" },
    ],
  },
];

function DocsHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-5 lg:px-20">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="font-serif text-[22px] font-medium tracking-[-0.5px] text-fg"
        >
          skillsync
        </Link>
        <span className="text-border">/</span>
        <span className="font-sans text-sm text-muted">docs</span>
      </div>

      <nav className="flex items-center gap-9">
        <Link href="/" className="font-sans text-sm text-muted hover:text-fg transition-colors">
          Home
        </Link>
        <a
          href="https://github.com/manitmishra/skillsync"
          className="font-sans text-sm text-muted hover:text-fg transition-colors"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-bg">
      <DocsHeader />
      <div className="flex flex-1">
        <Sidebar toc={TOC} />
        <article className="min-w-0 flex-1 px-8 py-12 lg:px-16 lg:py-16">
          <div className="mx-auto max-w-[720px]">
            <Content />
          </div>
        </article>
      </div>
    </main>
  );
}
