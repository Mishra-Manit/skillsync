"use client";

import { TypeAnimation } from "react-type-animation";

const WORDS = [
  "hackathon team",
  2000,
  "friends",
  2000,
  "twitter fans",
  2000,
  "annoying boss",
  2000,
] as const;

export function RotatingText() {
  return (
    <span className="rotating-text-wrapper">
      <TypeAnimation
        sequence={[...WORDS]}
        wrapper="span"
        speed={45}
        deletionSpeed={65}
        repeat={Infinity}
        cursor={false}
        className="rotating-text"
        preRenderFirstString={true}
      />
    </span>
  );
}
