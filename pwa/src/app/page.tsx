"use client";

import { useUiStore } from "@/state/uiStore";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function Home() {
  const onboardingComplete = useUiStore(
    (state) => state.onboardingComplete,
  );
  return onboardingComplete ? <DashboardView /> : <OnboardingCarousel />;
}
