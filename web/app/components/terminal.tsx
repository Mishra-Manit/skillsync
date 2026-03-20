export function Terminal() {
  return (
    <div className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-border bg-terminal">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
      </div>

      <div className="flex flex-col gap-1.5 overflow-x-auto px-5 pb-5 pt-4">
        <p className="font-mono text-[13px] text-[#BFC5CC]">
          $ skillsync create
        </p>
        <p className="font-mono text-[13px] text-[#BFC5CC]">
          &nbsp;&nbsp;Authenticated as @Mishra-Manit
        </p>
        <p className="font-mono text-[13px] text-[#BFC5CC]">&nbsp;</p>
        <p className="font-mono text-[13px] text-[#A7D4B2]">
          &nbsp;&nbsp;+ design-system-agent
        </p>
        <p className="font-mono text-[13px] text-[#A7D4B2]">
          &nbsp;&nbsp;+ code-review
        </p>
        <p className="font-mono text-[13px] text-[#A7D4B2]">
          &nbsp;&nbsp;+ api-patterns
        </p>
        <p className="font-mono text-[13px] text-[#BFC5CC]">&nbsp;</p>
        <p className="font-mono text-[13px] text-[#ECEFF2]">
          &nbsp;&nbsp;<span className="font-semibold">Share this command with your
          team:</span>
        </p>
        <p className="font-mono text-[13px] text-[#A7D4B2]">
          &nbsp;&nbsp;&nbsp;&nbsp;skillsync join Mishra-Manit/superior-skills
        </p>
        <p className="font-mono text-[13px] text-[#BFC5CC]">&nbsp;</p>
        <p className="font-mono text-[13px] text-[#BFC5CC]">
          &nbsp;&nbsp;Created Mishra-Manit/superior-skills with 3 shared items.
        </p>
      </div>
    </div>
  );
}
