const STEPS = [
  {
    num: "01",
    title: "Create a shared repo",
    desc: "One command creates a GitHub repo, invites teammates, and seeds it with your best skills.",
  },
  {
    num: "02",
    title: "Import your best work",
    desc: "Choose which agents and skills to share. Nothing is exported by default.",
  },
  {
    num: "03",
    title: "Everyone stays in sync",
    desc: "Teammates run skillsync join and get everything. A background daemon keeps it current.",
  },
] as const;

export function ProblemSolution() {
  return (
    <section id="how-it-works" className="flex flex-col gap-16 p-20">
      <div className="flex max-w-[800px] flex-col gap-4">
        <span className="font-sans text-[13px] font-medium uppercase tracking-[1px] text-muted">
          The Problem
        </span>
        <h2 className="font-serif text-5xl font-normal leading-[1.1] tracking-[-2px] text-fg">
          Team knowledge trapped on individual machines
        </h2>
        <p className="font-sans text-base leading-[1.6] text-muted">
          Agents and skills live in local dotfiles with no built-in way to share
          them. Teams duplicate work, new hires start from zero, and hard-won
          workflows disappear when people move on.
        </p>
      </div>

      <div className="flex gap-12">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="flex flex-1 flex-col gap-3 border-b border-border pb-8"
          >
            <span className="font-serif text-5xl font-normal tracking-[-2px] text-light">
              {step.num}
            </span>
            <span className="font-sans text-base font-semibold text-fg">
              {step.title}
            </span>
            <p className="font-sans text-sm leading-[1.6] text-muted">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
