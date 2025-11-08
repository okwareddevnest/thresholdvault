'use client';

import { create } from "zustand";
import type { VaultSummary } from "@/types/vault";

type VaultState = {
  vaults: VaultSummary[];
  selectedVaultId: bigint | null;
  loading: boolean;
  error: string | null;
  setVaults: (vaults: VaultSummary[]) => void;
  setSelectedVaultId: (id: bigint | null) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
};

export const useVaultStore = create<VaultState>((set) => ({
  vaults: [],
  selectedVaultId: null,
  loading: false,
  error: null,
  setVaults: (vaults) =>
    set((state) => ({
      vaults,
      selectedVaultId:
        state.selectedVaultId ?? vaults[0]?.id ?? null,
    })),
  setSelectedVaultId: (selectedVaultId) => set({ selectedVaultId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
