"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/state/vaultStore";
import { useUiStore } from "@/state/uiStore";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import {
  guardianSubmissionStatus,
  getVaultStatus,
  sendHeartbeat,
} from "@/services/vaultService";
import { HeartbeatRing } from "@/components/vault/HeartbeatRing";
import { GuardianList } from "@/components/guardians/GuardianList";
import type { VaultSummary } from "@/types/vault";
import type { VaultStatusResponse } from "@/types/vault";

type Props = {
  onRefresh?: () => void;
};

export function VaultDetailsPanel({ onRefresh }: Props) {
  const { vaults, selectedVaultId } = useVaultStore();
  const toggleCreateVault = useUiStore((state) => state.toggleCreateVault);
  const vault = useMemo<VaultSummary | undefined>(
    () => vaults.find((v) => v.id === selectedVaultId) ?? vaults[0],
    [selectedVaultId, vaults],
  );
  const [details, setDetails] = useState<VaultStatusResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nowSeconds, setNowSeconds] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setStatusMessage(null);
  }, [vault?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!vault) {
      setDetails(null);
      return;
    }
    const fetchDetails = async () => {
      setDetailLoading(true);
      try {
        const response = await getVaultStatus(vault.id);
        if (!cancelled) {
          setDetails(response);
        }
      } catch {
        if (!cancelled) {
          setDetails(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [vault]);

  if (!vault) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-card border border-border-subtle bg-card-background/60 p-10 text-center text-text-secondary">
        <p className="text-lg">Create a vault to see detailed telemetry.</p>
        <button
          type="button"
          className="mt-6 rounded-full bg-icp-cyan px-6 py-3 font-semibold text-deep-navy"
          onClick={() => toggleCreateVault(true)}
        >
          Create Vault
        </button>
      </div>
    );
  }

  const remainingDays = Math.max(
    0,
    Math.round((Number(vault.heartbeatDueInSeconds) - nowSeconds) / 86400),
  );

  const handleHeartbeat = async () => {
    await sendHeartbeat(vault.id);
    onRefresh?.();
  };

  const handleGuardianStatus = async () => {
    const status = await guardianSubmissionStatus(vault.id);
    setStatusMessage(
      `${Number(status.submitted)} of ${Number(
        vault.guardianThreshold,
      )} guardian shares submitted.`,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-card border border-border-subtle bg-card-background/70 p-6 shadow-vault"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-text-secondary">Vault Detail</p>
          <h2 className="mt-2 font-display text-2xl text-text-primary">
            {vault.name}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Taproot address: {truncateAddress(vault.bitcoinAddress, 8)}
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-border-subtle px-4 py-3">
          <HeartbeatRing daysRemaining={remainingDays} intervalDays={30} />
          <div>
            <p className="text-sm text-text-secondary">Next heartbeat due</p>
            <p className="text-lg text-text-primary">
              {formatTimestamp(vault.heartbeatDueInSeconds)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-sm text-text-secondary">Guardians</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {Number(vault.guardianThreshold)} / {Number(vault.guardianCount)}
          </p>
          <button
            type="button"
            onClick={handleGuardianStatus}
            className="mt-4 text-sm font-semibold text-icp-cyan"
          >
            View Guardian Progress
          </button>
        </div>
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-sm text-text-secondary">Status</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {vault.status}
          </p>
          <p className="text-sm text-text-secondary">
            Missed heartbeats escalate vault to inheritance mode automatically.
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-sm text-text-secondary">Heartbeat Control</p>
          <button
            type="button"
            onClick={handleHeartbeat}
            className="mt-3 w-full rounded-full bg-icp-cyan px-4 py-2 text-sm font-semibold text-deep-navy"
          >
            Send Proof of Life
          </button>
          <button
            type="button"
            onClick={() => requestAnimationFrame(() => onRefresh?.())}
            className="mt-2 w-full rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary"
          >
            Refresh Data
          </button>
        </div>
      </div>
      <div className="mt-6">
        {statusMessage && (
          <div className="mb-3 rounded border border-icp-cyan/40 bg-icp-cyan/10 px-4 py-2 text-sm text-text-primary">
            {statusMessage}
          </div>
        )}
        <p className="text-sm text-text-secondary">Guardian Roster</p>
        <div className="mt-2">
          {detailLoading ? (
            <div className="rounded border border-border-subtle p-4 text-sm text-text-secondary">
              Loading guardians…
            </div>
          ) : (
            <GuardianList guardians={details?.guardians ?? []} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
