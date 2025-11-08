"use client";

import { truncateAddress } from "@/lib/format";
import { useAuthClient } from "@/hooks/useAuthClient";
import { useUiStore } from "@/state/uiStore";

type Props = {
  onRefresh?: () => void;
};

export function AppHeader({ onRefresh }: Props) {
  const { principalText, login, logout, loading } = useAuthClient();
  const toggleCreateVault = useUiStore((state) => state.toggleCreateVault);

  return (
    <header className="border-b border-border-subtle bg-deep-navy/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-card-background text-xl font-bold text-icp-cyan">
            ₿
          </div>
          <div>
            <p className="font-display text-lg text-text-primary">ThresholdVault</p>
            <p className="text-sm text-text-secondary">Secured by ICP Threshold Crypto</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {principalText ? (
            <div className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary">
              {truncateAddress(principalText, 5)}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => toggleCreateVault(true)}
            className="hidden rounded-full bg-icp-cyan px-4 py-2 text-sm font-semibold text-deep-navy md:inline-flex"
          >
            Create Vault
          </button>
          <button
            type="button"
            onClick={principalText ? logout : login}
            disabled={loading}
            className="rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold text-text-primary"
          >
            {principalText ? "Sign Out" : "Sign In"}
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full border border-border-subtle px-3 py-2 text-sm text-text-secondary"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
