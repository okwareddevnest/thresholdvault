"use client";

import Image from "next/image";
import { useMemo } from "react";
import { RiDashboardLine, RiSafeLine, RiPulseLine, RiShieldKeyholeLine, RiSettings3Line } from "react-icons/ri";
import { useVaultStore } from "@/state/vaultStore";

const navItems = [
  { id: "dashboard", label: "Mission Control", description: "Real-time vault posture", icon: RiDashboardLine },
  { id: "guardians", label: "Guardian Network", description: "Invitations & quorum", icon: RiShieldKeyholeLine },
  { id: "heartbeat", label: "Heartbeat Monitor", description: "Timers & misses", icon: RiPulseLine },
  { id: "vaults", label: "Vault Registry", description: "BTC destinations", icon: RiSafeLine },
  { id: "settings", label: "Operational Settings", description: "Policies & alerts", icon: RiSettings3Line },
];

export type VaultMetrics = {
  total: number;
  active: number;
  pendingInheritance: number;
  executed: number;
  nextHeartbeat: number | null;
};

type Props = {
  principalText: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  onAuthenticate: () => void;
  onCreateVault: () => void;
  metrics: VaultMetrics;
  activeTab?: string;
  onNavigate?: (id: string) => void;
};

export function AppSidebar({
  principalText,
  isAuthenticated,
  loading,
  onAuthenticate,
  onCreateVault,
  metrics,
  activeTab = "dashboard",
  onNavigate,
}: Props) {
  const vaults = useVaultStore((state) => state.vaults);
  const guardianAverage = useMemo(() => {
    if (!vaults.length) return "0";
    const total = vaults.reduce((acc, vault) => {
      const threshold = vault.guardianThreshold ?? BigInt(0);
      return acc + Number(threshold);
    }, 0);
    return (total / vaults.length).toFixed(1);
  }, [vaults]);

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-border-subtle bg-deep-navy/95 backdrop-blur lg:flex">
      <div className="flex items-center gap-3 border-b border-border-subtle/60 px-6 py-6">
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-border-subtle">
          <Image src="/brand/logo-mark.png" alt="ThresholdVault logo" fill priority sizes="48px" />
        </div>
        <div>
          <p className="font-display text-lg leading-tight">ThresholdVault</p>
          <p className="text-xs text-text-secondary">Secured by ICP</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 px-4 py-6" aria-label="Primary">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary">Navigation</p>
          <div className="mt-4 space-y-2">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-0 ${
                    isActive
                      ? "border-icp-cyan/50 bg-card-background"
                      : "border-transparent bg-card-background/50 hover:border-border-subtle"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-deep-navy/70 text-icp-cyan">
                    <Icon className="text-lg" />
                  </span>
                  <span>
                    <span className="block font-display text-sm text-text-primary">
                      {item.label}
                    </span>
                    <span className="text-xs text-text-secondary">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-card-background/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">
                Vault Health
              </p>
              <p className="font-display text-2xl text-text-primary">{metrics.active}/{metrics.total}</p>
            </div>
            <div className="text-right text-xs text-text-secondary">
              <p>Pending: {metrics.pendingInheritance}</p>
              <p>Executed: {metrics.executed}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between">
              <dt>Avg threshold</dt>
              <dd className="text-text-primary">{guardianAverage}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Next heartbeat</dt>
              <dd className="text-text-primary">
                {metrics.nextHeartbeat
                  ? new Date(Number(metrics.nextHeartbeat) * 1000).toLocaleDateString()
                  : "Queued"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onCreateVault}
            className="mt-4 w-full rounded-xl bg-icp-cyan/90 px-4 py-2 text-sm font-semibold text-deep-navy"
          >
            Deploy Vault
          </button>
        </div>
      </nav>
      <div className="border-t border-border-subtle/60 px-4 py-4 text-sm text-text-secondary">
        <p className="text-xs uppercase tracking-[0.3em]">Operator</p>
        <p className="mt-1 truncate text-text-primary">
          {isAuthenticated && principalText ? principalText : "Not connected"}
        </p>
        <button
          type="button"
          onClick={onAuthenticate}
          disabled={loading}
          className="mt-3 w-full rounded-xl border border-border-subtle px-3 py-2 text-sm font-semibold text-text-primary"
        >
          {isAuthenticated ? "Sign Out" : "Sign In"}
        </button>
      </div>
    </aside>
  );
}
