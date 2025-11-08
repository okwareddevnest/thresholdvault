"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useUiStore } from "@/state/uiStore";

type Slide = {
  title: string;
  subtitle: string;
  description: string;
  cta?: string;
};

const slides: Slide[] = [
  {
    title: "Never Lose Bitcoin Again",
    subtitle: "Autonomous inheritance vaults",
    description:
      "ThresholdVault watches over your Bitcoin with a dead-man switch backed by ICP timers and tECDSA.",
  },
  {
    title: "Your Guardians, Your Rules",
    subtitle: "Private social recovery",
    description:
      "Invite trusted guardians via vetKeys encryption. They never see your keys, only their encrypted share.",
  },
  {
    title: "Autonomous & Trustless",
    subtitle: "Pure Bitcoin settlement",
    description:
      "Native Taproot addresses, on-chain PSBT previews, and tamper-evident audit trails across devices.",
    cta: "Get Started",
  },
];

export function OnboardingCarousel() {
  const [index, setIndex] = useState(0);
  const setOnboardingComplete = useUiStore(
    (state) => state.setOnboardingComplete,
  );

  const next = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
    } else {
      setOnboardingComplete(true);
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-text-primary"
      style={{
        background:
          "linear-gradient(180deg, var(--color-deep-navy) 0%, var(--color-card-background) 100%)",
      }}
    >
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-card-background/80 p-8 shadow-vault backdrop-blur">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={slides[index].title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-sm uppercase tracking-widest text-text-secondary">
              {slides[index].subtitle}
            </p>
            <h1 className="mt-4 font-display text-3xl text-text-primary">
              {slides[index].title}
            </h1>
            <p className="mt-4 text-text-secondary">{slides[index].description}</p>
            <div className="mt-8 flex items-center justify-between text-text-secondary">
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <span
                    key={`dot-${i}`}
                    className={`h-2 w-6 rounded-full ${
                      i === index ? "bg-icp-cyan" : "bg-border-subtle"
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm">{index + 1} / {slides.length}</div>
            </div>
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                className="flex-1 rounded-full border border-border-subtle px-4 py-3 text-sm font-semibold text-text-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={next}
                className="flex-1 rounded-full bg-icp-cyan px-4 py-3 text-sm font-semibold text-deep-navy"
              >
                {slides[index].cta ?? "Next"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
