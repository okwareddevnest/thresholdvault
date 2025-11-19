"use client";

import { useEffect, useState } from "react";
import { useAuthClient } from "@/hooks/useAuthClient";
import { listGuardianVaults, submitGuardianShare } from "@/services/guardianService";
import { getVaultStatus } from "@/services/vaultService";
import type { VaultStatusResponse, GuardianRecord } from "@/types/vault";
import { AppHeader } from "@/components/layout/AppHeader";
import { truncateAddress } from "@/lib/format";

export default function GuardianDashboard() {
  const { principalText, login, logout } = useAuthClient();
  const isAuthenticated = !!principalText;
  const [vaults, setVaults] = useState<VaultStatusResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<bigint | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVaults();
    }
  }, [isAuthenticated]);

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const vaultIds = await listGuardianVaults();
      const details = await Promise.all(
        vaultIds.map((id) => getVaultStatus(id))
      );
      setVaults(details);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load vaults." });
    } finally {
      setLoading(false);
    }
  };

  const getMyGuardianRecord = (vault: VaultStatusResponse): GuardianRecord | undefined => {
    if (!principalText) return undefined;
    return vault.guardians.find(
      (g) => g.principalId && g.principalId.toString() === principalText
    );
  };

  const handleSubmitShare = async (vault: VaultStatusResponse) => {
    const myRecord = getMyGuardianRecord(vault);
    if (!myRecord) {
      setMessage({ type: "error", text: "Guardian record not found." });
      return;
    }

    setSubmitting(vault.summary.id);
    try {
      // Dummy payload for approval
      const payload = new TextEncoder().encode("APPROVED");
      await submitGuardianShare(
        vault.summary.id,
        myRecord.emailHash as Uint8Array,
        payload
      );
      setMessage({ type: "success", text: "Share submitted successfully." });
      fetchVaults(); // Refresh status
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSubmitting(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-navy text-text-primary">
        <div className="text-center">
          <h1 className="mb-4 font-display text-2xl">Guardian Portal</h1>
          <button
            onClick={login}
            className="rounded-full bg-icp-cyan px-6 py-3 font-semibold text-deep-navy"
          >
            Sign in with Internet Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy text-text-primary">
      <AppHeader
        isAuthenticated={isAuthenticated}
        principalText={principalText}
        onAuthenticate={logout}
        loading={false}
        onRefresh={fetchVaults}
      />
      
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl">Protected Vaults</h1>
        
        {message && (
          <div
            className={`mb-6 rounded border px-4 py-3 ${
              message.type === "success"
                ? "border-success-green/40 bg-success-green/10 text-success-green"
                : "border-error-red/40 bg-error-red/10 text-error-red"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-text-secondary">Loading vaults...</div>
        ) : vaults.length === 0 ? (
          <div className="rounded-card border border-border-subtle bg-card-background/60 p-8 text-center text-text-secondary">
            You are not protecting any vaults yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vaults.map((vault) => {
              const myRecord = getMyGuardianRecord(vault);
              const isPending = vault.summary.status === "InheritancePending";
              const hasSubmitted = myRecord?.status === "ShareSubmitted";

              return (
                <div
                  key={vault.summary.id.toString()}
                  className="rounded-card border border-border-subtle bg-card-background p-6 shadow-vault"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-xl">{vault.summary.name}</h3>
                      <p className="text-sm text-text-secondary">
                        ID: {vault.summary.id.toString()}
                      </p>
                    </div>
                    <div
                      className={`h-3 w-3 rounded-full ${
                        vault.summary.status === "Active"
                          ? "bg-success-green"
                          : vault.summary.status === "InheritancePending"
                          ? "animate-pulse bg-error-red"
                          : "bg-text-disabled"
                      }`}
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Status</span>
                      <span className="font-medium">{vault.summary.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Address</span>
                      <span className="font-mono">
                        {truncateAddress(vault.summary.bitcoinAddress)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">My Status</span>
                      <span className="font-medium text-icp-cyan">
                        {myRecord?.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    {isPending && !hasSubmitted ? (
                      <button
                        onClick={() => handleSubmitShare(vault)}
                        disabled={submitting === vault.summary.id}
                        className="w-full rounded-full bg-error-red px-4 py-2 font-semibold text-white transition-colors hover:bg-error-red/90 disabled:opacity-50"
                      >
                        {submitting === vault.summary.id
                          ? "Submitting..."
                          : "Submit Key Share"}
                      </button>
                    ) : hasSubmitted ? (
                      <div className="rounded bg-success-green/10 py-2 text-center text-sm font-medium text-success-green">
                        Share Submitted
                      </div>
                    ) : (
                      <div className="rounded bg-border-subtle/30 py-2 text-center text-sm text-text-secondary">
                        No Action Required
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

