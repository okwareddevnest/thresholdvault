"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useShallow } from "zustand/react/shallow";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar, type VaultMetrics } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { VaultGrid } from "@/components/vault/VaultGrid";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuthClient } from "@/hooks/useAuthClient";
import { useVaultData } from "@/hooks/useVaultData";
import { useVaultStore } from "@/state/vaultStore";
import { useUiStore } from "@/state/uiStore";
import { GuardiansView } from "@/components/dashboard/GuardiansView";
import { HeartbeatView } from "@/components/dashboard/HeartbeatView";
import { SettingsView } from "@/components/dashboard/SettingsView";

const VaultDetailsPanel = dynamic(
  () => import("@/components/vault/VaultDetailsPanel").then((m) => m.VaultDetailsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-card border border-border-subtle/60 bg-card-background/40 p-6 text-sm text-text-secondary">
        Loading vault details…
      </div>
    ),
  },
);

const CreateVaultWizard = dynamic(
  () => import("@/components/forms/CreateVaultWizard").then((m) => m.CreateVaultWizard),
  { ssr: false },
);

export function DashboardView() {
  const { principalText, login, logout, loading: authLoading } = useAuthClient();
  const { refresh } = useVaultData(principalText || null);
  const loading = useVaultStore((state) => state.loading);
  const error = useVaultStore((state) => state.error);
  const toggleCreateVault = useUiStore((state) => state.toggleCreateVault);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const metrics = useVaultStore(
    useShallow((state) => {
      const total = state.vaults.length;
      const pendingInheritance = state.vaults.filter(
        (vault) => vault.status === "InheritancePending",
      ).length;
      const executed = state.vaults.filter((vault) => vault.status === "Executed").length;
      const active = Math.max(total - pendingInheritance - executed, 0);
      const nextHeartbeat = state.vaults.reduce<number | null>((soonest, vault) => {
        const dueValue = vault.heartbeatDueInSeconds ?? BigInt(0);
        const due = Number(dueValue);
        if (due <= 0) {
          return soonest;
        }
        if (soonest === null || due < soonest) {
          return due;
        }
        return soonest;
      }, null);
      return {
        total,
        active,
        pendingInheritance,
        executed,
        nextHeartbeat,
      } satisfies VaultMetrics;
    })
  );

  const handleAuthAction = () => {
    if (principalText) {
      logout();
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = async () => {
    await login();
    setShowLoginModal(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
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
          </>
        );
      case "vaults":
        return (
          <section>
            <h2 className="font-display text-2xl mb-4">Vault Registry</h2>
            {loading ? (
              <div className="rounded-card border border-border-subtle p-6 text-text-secondary">
                Loading vaults...
              </div>
            ) : (
              <VaultGrid />
            )}
          </section>
        );
      case "guardians":
        return (
          <section>
            <h2 className="font-display text-2xl mb-4">Guardian Network</h2>
            <GuardiansView />
          </section>
        );
      case "heartbeat":
        return (
          <section>
            <h2 className="font-display text-2xl mb-4">Heartbeat Monitor</h2>
            <HeartbeatView />
          </section>
        );
      case "settings":
        return (
          <section>
            <h2 className="font-display text-2xl mb-4">Operational Settings</h2>
            <SettingsView />
          </section>
        );
      default:
        return (
          <section>
            <h2 className="font-display text-2xl mb-4 capitalize">{activeTab}</h2>
            <div className="rounded-card border border-border-subtle p-6 text-text-secondary">
              View not found.
            </div>
          </section>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-deep-navy text-text-primary pb-20 lg:pb-0">
      <AppSidebar
        principalText={principalText || null}
        isAuthenticated={Boolean(principalText)}
        loading={authLoading}
        onAuthenticate={handleAuthAction}
        onCreateVault={() => toggleCreateVault(true)}
        metrics={metrics}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />
      <div className="flex flex-1 flex-col">
        <AppHeader
          onRefresh={() => refresh()}
          onCreateVault={() => toggleCreateVault(true)}
          onAuthenticate={handleAuthAction}
          principalText={principalText || null}
          isAuthenticated={Boolean(principalText)}
          loading={authLoading}
          metrics={metrics}
        />
        <div className="flex-1 overflow-y-auto">
          <OfflineBanner />
          <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            {error && (
              <div className="rounded-card border border-error-red/40 bg-error-red/10 px-4 py-3 text-sm text-text-primary">
                {error}
              </div>
            )}
            {renderContent()}
          </main>
        </div>
        <CreateVaultWizard />
      </div>
      <MobileNav 
        activeTab={activeTab}
        onNavigate={(id) => {
          setActiveTab(id);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }} 
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        loading={authLoading}
      />
    </div>
  );
}
