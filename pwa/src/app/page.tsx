"use client";

import { useEffect } from "react";
import { useUiStore } from "@/state/uiStore";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function Home() {
  const onboardingComplete = useUiStore((state) => state.onboardingComplete);
  const hydrated = useUiStore((state) => state.hydrated);
  const hydrateOnboarding = useUiStore((state) => state.hydrateOnboarding);

  useEffect(() => {
    hydrateOnboarding();
  }, [hydrateOnboarding]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-navy text-text-primary">
        <div className="rounded-card border border-border-subtle bg-card-background/70 px-8 py-6 text-center shadow-vault">
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">
            Initializing
          </p>
          <p className="mt-2 font-display text-xl">Calibrating Guardian Surface</p>
          <p className="mt-1 text-sm text-text-secondary">
            Establishing secure ICP session…
          </p>
        </div>
      </div>
    );
  }

  return onboardingComplete ? <DashboardView /> : <OnboardingCarousel />;
}
