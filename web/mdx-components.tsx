import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

function getTextContent(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props: { children?: ReactNode } }).props;
    return getTextContent(props.children);
  }
  return "";
}

function slugify(node: ReactNode): string {
  return getTextContent(node)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-serif text-[40px] font-normal leading-[1.15] tracking-[-1px] text-fg">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2
        id={slugify(children)}
        className="mt-16 mb-6 scroll-mt-8 font-serif text-[28px] font-normal leading-[1.15] tracking-[-0.5px] text-fg"
      >
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3
        id={slugify(children)}
        className="mt-10 mb-4 scroll-mt-8 font-sans text-lg font-semibold text-fg"
      >
        {children}
      </h3>
    ),

    h4: ({ children }) => (
      <h4 className="mt-6 mb-3 font-sans text-base font-semibold text-fg">
        {children}
      </h4>
    ),

    p: ({ children }) => (
      <p className="my-4 font-sans text-[15px] leading-[1.75] text-body-muted">
        {children}
      </p>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        className="text-accent underline underline-offset-2 hover:text-fg transition-colors"
      >
        {children}
      </a>
    ),

    strong: ({ children }) => (
      <strong className="font-semibold text-fg">{children}</strong>
    ),

    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-xl bg-terminal px-6 py-5 font-mono text-[13px] leading-relaxed [&>code]:bg-transparent [&>code]:border-0 [&>code]:p-0 [&>code]:text-[13px] [&>code]:text-green-400 [&>code]:font-mono [&>code]:rounded-none">
        {children}
      </pre>
    ),

    code: ({ children }) => (
      <code className="rounded border border-border bg-bg-white px-1.5 py-0.5 font-mono text-[13px] text-fg">
        {children}
      </code>
    ),

    ul: ({ children }) => (
      <ul className="my-4 ml-6 list-disc space-y-2 font-sans text-[15px] leading-[1.75] text-body-muted marker:text-border">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="my-4 ml-6 list-decimal space-y-2 font-sans text-[15px] leading-[1.75] text-body-muted marker:text-muted">
        {children}
      </ol>
    ),

    li: ({ children }) => <li className="pl-1">{children}</li>,

    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-accent bg-bg-white rounded-r-lg py-1 pl-6 pr-4 [&>p]:text-muted [&>p]:italic">
        {children}
      </blockquote>
    ),

    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-bg-white text-left font-sans text-xs font-semibold uppercase tracking-wider text-muted">
        {children}
      </thead>
    ),

    th: ({ children }) => (
      <th className="border-b border-border px-4 py-3">{children}</th>
    ),

    td: ({ children }) => (
      <td className="border-b border-border px-4 py-3 font-sans text-[14px] text-body-muted last:border-b-0">
        {children}
      </td>
    ),

    tr: ({ children }) => (
      <tr className="last:[&>td]:border-b-0">{children}</tr>
    ),

    hr: () => <hr className="my-12 border-border" />,

    ...components,
  };
}
