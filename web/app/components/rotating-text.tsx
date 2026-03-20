"use client";

import { TypeAnimation } from "react-type-animation";

const WORDS = [
  "hackathon team",
  2000,
  "friends",
  2000,
  "twitter fans",
  2000,
  "colleagues",
  2000,
] as const;

export function RotatingText() {
  return (
    <TypeAnimation
      sequence={[...WORDS]}
      wrapper="span"
      speed={45}
      deletionSpeed={65}
      repeat={Infinity}
      cursor={true}
      className="rotating-text"
      preRenderFirstString={true}
    />
  );
}
