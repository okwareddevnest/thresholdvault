"use client";

import { useState } from "react";
import { useVaultStore } from "@/state/vaultStore";
import { useVaultStatus } from "@/hooks/useVaultStatus";
import { GuardianList } from "@/components/guardians/GuardianList";
import { truncateAddress } from "@/lib/format";

export function GuardiansView() {
  const vaults = useVaultStore((state) => state.vaults);
  const [selectedVaultId, setSelectedVaultId] = useState<bigint | undefined>(
    vaults[0]?.id
  );

  // Update selected vault if the list changes and current selection is invalid
  if (selectedVaultId === undefined && vaults.length > 0) {
    setSelectedVaultId(vaults[0].id);
  }

  const { status, loading, error } = useVaultStatus(selectedVaultId);

  if (vaults.length === 0) {
    return (
      <div className="rounded-card border border-border-subtle bg-card-background/60 p-10 text-center text-text-secondary">
        <p className="text-lg">No vaults found.</p>
        <p className="mt-2 text-sm">Create a vault to manage guardians.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-lg font-display text-text-primary">Select Vault</h3>
        <div className="space-y-2">
          {vaults.map((vault) => (
            <button
              key={vault.id.toString()}
              onClick={() => setSelectedVaultId(vault.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedVaultId === vault.id
                  ? "border-icp-cyan bg-icp-cyan/10"
                  : "border-border-subtle bg-card-background/40 hover:border-icp-cyan/50"
              }`}
            >
              <p className="font-semibold text-text-primary">{vault.name}</p>
              <p className="text-xs text-text-secondary">
                {Number(vault.guardianThreshold)} / {Number(vault.guardianCount)} Guardians
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="rounded-card border border-border-subtle bg-card-background/70 p-6">
          <h3 className="mb-4 text-lg font-display text-text-primary">
            Guardian Roster
          </h3>
          {loading ? (
            <div className="py-8 text-center text-text-secondary">
              Loading guardian details...
            </div>
          ) : error ? (
            <div className="rounded border border-error-red/40 bg-error-red/10 p-4 text-sm text-text-primary">
              {error}
            </div>
          ) : status ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-deep-navy/50 p-4">
                <div>
                  <p className="text-sm text-text-secondary">Threshold Status</p>
                  <p className="text-xl font-semibold text-text-primary">
                    {Number(status.summary.guardianThreshold)} of {Number(status.summary.guardianCount)} required
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">Bitcoin Address</p>
                  <p className="font-mono text-sm text-text-primary">
                    {truncateAddress(status.summary.bitcoinAddress)}
                  </p>
                </div>
              </div>
              
              <div>
                <GuardianList guardians={status.guardians} />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-text-secondary">
              Select a vault to view guardians.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

