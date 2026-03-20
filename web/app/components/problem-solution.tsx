const STEPS = [
  {
    num: "01",
    title: "Create a shared repo",
    desc: "One command sets up a GitHub repository as your team\u2019s single source of truth for Claude Code configurations.",
  },
  {
    num: "02",
    title: "Import your best work",
    desc: "Select the agents, skills, and workflows you want to share. Nothing is shared by default \u2014 you choose what goes to the team.",
  },
  {
    num: "03",
    title: "Everyone stays in sync",
    desc: "Teammates join with a single command. A background daemon keeps everything current \u2014 no manual pulling, no merge headaches.",
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
          Your best prompts die in personal dotfiles
        </h2>
        <p className="font-sans text-base leading-[1.6] text-muted">
          Every developer on your team builds Claude Code agents and skills
          independently. The result: duplicated effort, inconsistent quality, and
          tribal knowledge locked in individual machines. When someone leaves,
          their workflows leave with them.
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
