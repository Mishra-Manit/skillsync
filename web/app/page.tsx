import { Header } from "./components/header";
import { Hero } from "./components/hero";
import { ProblemSolution } from "./components/problem-solution";
import { Features } from "./components/features";
import { FinalCta } from "./components/final-cta";
import { Footer } from "./components/footer";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden bg-bg">
      <Header />
      <Hero />
      <ProblemSolution />
      <Features />
      <FinalCta />
      <hr className="border-border" />
      <Footer />
    </main>
  );
}
