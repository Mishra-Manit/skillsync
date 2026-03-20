import { CopyPill } from "./copy-pill";

export function FinalCta() {
  return (
    <section
      id="get-started"
      className="flex flex-col items-center gap-7 bg-bg px-5 py-12 md:px-[120px] md:py-20"
    >
      <h2 className="text-center font-serif text-3xl font-normal leading-[1.1] tracking-[-0.5px] text-fg md:text-[40px]">
        Ready to sync
        <br />
        your team?
      </h2>

      <p className="text-center font-sans text-base text-muted">
        Get started in under a minute. No account required.
      </p>

      <CopyPill />

      <a
        href="https://www.npmjs.com/package/@manitmishra/skillsync"
        target="_blank"
        rel="noopener noreferrer"
        className="font-sans text-xs text-subtle underline underline-offset-2"
      >
        Free and open source. MIT licensed.
      </a>
    </section>
  );
}
