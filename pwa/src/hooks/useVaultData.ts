'use client';

import useSWR from "swr";
import { Principal } from "@dfinity/principal";
import { listVaults } from "@/services/vaultService";
import { useVaultStore } from "@/state/vaultStore";

export function useVaultData(principalText: string | null) {
  const setVaults = useVaultStore((state) => state.setVaults);
  const setLoading = useVaultStore((state) => state.setLoading);
  const setError = useVaultStore((state) => state.setError);

  const fetcher = async () => {
    if (!principalText) return [];
    const principal = Principal.fromText(principalText);
    return listVaults(principal);
  };

  const { data, error, isLoading, mutate } = useSWR(
    principalText ? ["vaults", principalText] : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  setLoading(isLoading);
  if (error) {
    setError(error.message);
  }
  if (data) {
    setVaults(data);
  }

  return {
    refresh: mutate,
  };
}
