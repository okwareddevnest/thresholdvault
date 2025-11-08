'use client';

import { create } from "zustand";

const ONBOARDING_STORAGE_KEY = "thresholdvault.onboarding";

type UiState = {
  onboardingComplete: boolean;
  offline: boolean;
  showCreateVault: boolean;
  setOnboardingComplete: (value: boolean) => void;
  setOffline: (value: boolean) => void;
  toggleCreateVault: (value: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  onboardingComplete:
    typeof window !== "undefined"
      ? localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1"
      : false,
  offline: false,
  showCreateVault: false,
  setOnboardingComplete: (value) => {
    if (typeof window !== "undefined") {
      if (value) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
      } else {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }
    set({ onboardingComplete: value });
  },
  setOffline: (value) => set({ offline: value }),
  toggleCreateVault: (value) => set({ showCreateVault: value }),
}));
