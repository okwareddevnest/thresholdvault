import { useState, useEffect } from "react";
import { getVaultStatus } from "@/services/vaultService";
import type { VaultStatusResponse } from "@/types/vault";

export function useVaultStatus(vaultId: bigint | undefined) {
  const [status, setStatus] = useState<VaultStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (vaultId === undefined) {
      setStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVaultStatus(vaultId);
        if (!cancelled) {
          setStatus(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch vault status");
          setStatus(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  return { status, loading, error };
}

