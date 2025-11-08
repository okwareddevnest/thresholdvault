"use client";

import { useVaultStore } from "@/state/vaultStore";
import { VaultCard } from "@/components/vault/VaultCard";

export function VaultGrid() {
  const { vaults, selectedVaultId, setSelectedVaultId } = useVaultStore();

  if (!vaults.length) {
    return (
      <div className="rounded-card border border-dashed border-border-subtle p-8 text-center text-text-secondary">
        No vaults yet. Create your first autonomous inheritance vault to get started.
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4 lg:grid-cols-2">
      {vaults.map((vault) => (
        <VaultCard
          key={vault.id.toString()}
          vault={vault}
          isSelected={selectedVaultId === vault.id}
          onSelect={(id) => setSelectedVaultId(id)}
        />
      ))}
    </div>
  );
}
