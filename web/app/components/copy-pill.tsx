"use client";

import { useState, useCallback } from "react";

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

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const COMMAND = "npm install -g @manitmishra/skillsync";

export function CopyPill() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (copied) return;
    await navigator.clipboard.writeText(COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex max-w-full cursor-pointer items-center gap-2.5 rounded-3xl bg-accent px-4 py-4 transition-all duration-200 hover:brightness-110 active:scale-[0.98] md:px-7"
    >
      <span className="transition-transform duration-200">
        {copied ? <CheckIcon /> : <TerminalIcon />}
      </span>
      <span className="font-mono text-xs font-medium text-white md:text-sm">
        {copied ? "Copied to clipboard!" : COMMAND}
      </span>
    </button>
  );
}
