'use client';

import { useEffect } from "react";
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

  useEffect(() => {
    if (!principalText) {
      setVaults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(isLoading);
  }, [isLoading, principalText, setLoading, setVaults, setError]);

  useEffect(() => {
    if (error) {
      setError(error.message);
    } else {
      setError(null);
    }
  }, [error, setError]);

  useEffect(() => {
    if (data) {
      // Simple check to avoid unnecessary store updates if data hasn't changed
      // This helps prevent render loops if the parent component re-renders
      const currentVaults = useVaultStore.getState().vaults;
      const isSame = 
        currentVaults.length === data.length && 
        JSON.stringify(currentVaults, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        ) === JSON.stringify(data, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        );
      
      if (!isSame) {
        setVaults(data);
      }
    }
  }, [data, setVaults]);

  return {
    refresh: mutate,
  };
}
