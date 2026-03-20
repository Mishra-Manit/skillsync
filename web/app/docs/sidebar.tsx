"use client";

import { useEffect, useState } from "react";

export type TocGroup = {
  group: string;
  items: { label: string; id: string }[];
};

export function Sidebar({ toc }: { toc: TocGroup[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const ids = toc.flatMap((g) => g.items.map((i) => i.id));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav className="sticky top-0 h-screen overflow-y-auto border-r border-border px-8 py-10">
        <div className="flex flex-col gap-8">
          {toc.map((group) => (
            <div key={group.group} className="flex flex-col gap-2">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-subtle">
                {group.group}
              </span>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`rounded-md px-2 py-1.5 font-sans text-[13px] transition-colors ${
                      activeId === item.id
                        ? "bg-bg-white font-medium text-accent"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
