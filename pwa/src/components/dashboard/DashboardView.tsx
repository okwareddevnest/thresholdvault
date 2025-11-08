"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { VaultGrid } from "@/components/vault/VaultGrid";
import { VaultDetailsPanel } from "@/components/vault/VaultDetailsPanel";
import { useAuthClient } from "@/hooks/useAuthClient";
import { useVaultData } from "@/hooks/useVaultData";
import { CreateVaultWizard } from "@/components/forms/CreateVaultWizard";
import { useVaultStore } from "@/state/vaultStore";

export function DashboardView() {
  const { principalText } = useAuthClient();
  const { refresh } = useVaultData(principalText || null);
  const loading = useVaultStore((state) => state.loading);
  const error = useVaultStore((state) => state.error);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-deep-navy text-text-primary">
      <OfflineBanner />
      <AppHeader onRefresh={() => refresh()} />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {error && (
          <div className="rounded border border-error-red/40 bg-error-red/10 px-4 py-3 text-sm text-text-primary">
            {error}
          </div>
        )}
        <section>
          {!principalText && (
            <div className="rounded-card border border-border-subtle bg-card-background/60 p-4 text-text-secondary">
              Sign in with Internet Identity to deploy on-chain vaults and sync guardians.
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Vaults</h2>
              <p className="text-text-secondary">
                Autonomous inheritance timelines with guardian oversight.
              </p>
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="rounded-card border border-border-subtle p-6 text-text-secondary">
                Loading vaults...
              </div>
            ) : (
              <VaultGrid />
            )}
          </div>
        </section>
        <section>
          <VaultDetailsPanel onRefresh={() => refresh()} />
        </section>
      </main>
      <CreateVaultWizard />
    </div>
  );
}
