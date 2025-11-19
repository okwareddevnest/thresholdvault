"use client";

import { useVaultStore } from "@/state/vaultStore";
import { formatTimestamp } from "@/lib/format";
import { sendHeartbeat } from "@/services/vaultService";
import { HeartbeatRing } from "@/components/vault/HeartbeatRing";
import { useState } from "react";

export function HeartbeatView() {
  const vaults = useVaultStore((state) => state.vaults);
  const [processing, setProcessing] = useState<bigint | null>(null);

  const handlePulse = async (vaultId: bigint) => {
    setProcessing(vaultId);
    try {
      await sendHeartbeat(vaultId);
      // In a real app, we'd trigger a refresh here, but for now we rely on the user or auto-refresh
      // Ideally, we should call a refresh function passed as prop or from store
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    } finally {
      setProcessing(null);
    }
  };

  if (vaults.length === 0) {
    return (
      <div className="rounded-card border border-border-subtle bg-card-background/60 p-10 text-center text-text-secondary">
        <p className="text-lg">No vaults active.</p>
        <p className="mt-2 text-sm">Heartbeat monitor is empty.</p>
      </div>
    );
  }

  const sortedVaults = [...vaults].sort((a, b) => {
    const aDue = Number(a.heartbeatDueInSeconds);
    const bDue = Number(b.heartbeatDueInSeconds);
    return aDue - bDue;
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sortedVaults.map((vault) => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const remainingDays = Math.max(
          0,
          Math.round((Number(vault.heartbeatDueInSeconds) - nowSeconds) / 86400)
        );
        const isProcessing = processing === vault.id;

        return (
          <div
            key={vault.id.toString()}
            className="flex flex-col justify-between rounded-card border border-border-subtle bg-card-background/70 p-6 shadow-sm transition hover:border-icp-cyan/30"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg text-text-primary">
                    {vault.name}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    ID: {vault.id.toString()}
                  </p>
                </div>
                <div className={`h-3 w-3 rounded-full ${
                  remainingDays > 7 ? "bg-success-green" : remainingDays > 3 ? "bg-bitcoin-gold" : "bg-error-red"
                }`} />
              </div>

              <div className="mt-6 flex justify-center">
                <HeartbeatRing daysRemaining={remainingDays} intervalDays={30} />
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-text-secondary">Next Due</p>
                <p className="font-mono text-lg text-text-primary">
                  {formatTimestamp(vault.heartbeatDueInSeconds)}
                </p>
              </div>
            </div>

            <button
              onClick={() => handlePulse(vault.id)}
              disabled={isProcessing}
              className="mt-6 w-full rounded-xl bg-icp-cyan/10 py-3 text-sm font-semibold text-icp-cyan hover:bg-icp-cyan/20 disabled:opacity-50"
            >
              {isProcessing ? "Sending..." : "Send Pulse"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

