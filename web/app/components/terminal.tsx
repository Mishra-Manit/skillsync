export function Terminal() {
  return (
    <div className="w-[600px] overflow-hidden rounded-2xl border border-border bg-terminal">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
      </div>

      <div className="flex flex-col gap-1.5 px-5 pb-5 pt-4">
        <p className="font-mono text-[13px] text-subtle">
          $ bunx skillsync create
        </p>
        <p className="font-mono text-[13px] text-accent">
          &nbsp;&nbsp;Creating team repository...
        </p>
        <p className="font-mono text-[13px] text-accent">
          &nbsp;&nbsp;Linked 3 skills, 2 agents
        </p>
        <p className="font-mono text-[13px] text-subtle">
          &nbsp;&nbsp;Your team is ready to sync.
        </p>
      </div>
    </div>
  );
}
