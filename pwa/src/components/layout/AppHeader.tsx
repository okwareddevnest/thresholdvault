"use client";

import Image from "next/image";
import { truncateAddress } from "@/lib/format";
import type { VaultMetrics } from "./AppSidebar";

type Props = {
  onRefresh?: () => void;
  onCreateVault?: () => void;
  onAuthenticate: () => void;
  principalText: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  metrics?: VaultMetrics;
};

export function AppHeader({
  onRefresh,
  onCreateVault,
  onAuthenticate,
  principalText,
  isAuthenticated,
  loading,
  metrics = {
    total: 0,
    active: 0,
    pendingInheritance: 0,
    executed: 0,
    nextHeartbeat: null,
  },
}: Props) {
  return (
    <header className="border-b border-border-subtle bg-deep-navy/80 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div>
          <div className="flex items-center gap-3 lg:hidden">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border-subtle">
              <Image src="/brand/logo-mark.png" alt="ThresholdVault logo" fill sizes="40px" />
            </div>
            <div>
              <p className="font-display text-lg">ThresholdVault</p>
              <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">
                Autonomous Control
              </p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">
            Operations Center
          </p>
          <h1 className="font-display text-2xl text-text-primary">
            Vault Command Surface
          </h1>
          <p className="text-sm text-text-secondary">
            Active vaults {metrics.active} · Pending inheritance {metrics.pendingInheritance}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {principalText ? (
            <div className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary">
              {truncateAddress(principalText, 5)}
            </div>
          ) : (
            <span className="text-xs text-text-secondary">Not connected</span>
          )}
          {onCreateVault && (
            <button
              type="button"
              onClick={onCreateVault}
              className="rounded-full bg-icp-cyan px-4 py-2 text-sm font-semibold text-deep-navy"
            >
              Create Vault
            </button>
          )}
          <button
            type="button"
            onClick={onAuthenticate}
            disabled={loading}
            className="rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold text-text-primary"
          >
            {isAuthenticated ? "Sign Out" : "Sign In"}
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
      <div className="border-t border-border-subtle/60 px-4 py-3 lg:px-8">
        <dl className="grid gap-4 text-sm text-text-secondary sm:grid-cols-3">
          <div>
            <dt>Active Vaults</dt>
            <dd className="font-display text-lg text-text-primary">{metrics.active}</dd>
          </div>
          <div>
            <dt>Pending Heartbeat</dt>
            <dd className="font-display text-lg text-text-primary">
              {metrics.nextHeartbeat
                ? new Date(metrics.nextHeartbeat * 1000).toLocaleString()
                : "Awaiting"}
            </dd>
          </div>
          <div>
            <dt>Executed Plans</dt>
            <dd className="font-display text-lg text-text-primary">{metrics.executed}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
