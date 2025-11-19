"use client";

import { useAuthClient } from "@/hooks/useAuthClient";
import { RiLogoutBoxLine, RiFileCopyLine, RiGithubLine } from "react-icons/ri";

export function SettingsView() {
  const { principalText, logout } = useAuthClient();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const envVars = [
    { label: "Vault Manager ID", value: process.env.NEXT_PUBLIC_VAULT_MGR_CANISTER_ID },
    { label: "Bitcoin Wallet ID", value: process.env.NEXT_PUBLIC_BITCOIN_WALLET_CANISTER_ID },
    { label: "Guardian Manager ID", value: process.env.NEXT_PUBLIC_GUARDIAN_MGR_CANISTER_ID },
    { label: "Heartbeat Tracker ID", value: process.env.NEXT_PUBLIC_HEARTBEAT_TRACKER_CANISTER_ID },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="rounded-card border border-border-subtle bg-card-background/70 p-6">
        <h3 className="mb-4 font-display text-lg text-text-primary">Identity</h3>
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-deep-navy/50 p-4">
          <div className="overflow-hidden">
            <p className="text-xs text-text-secondary">Connected Principal</p>
            <p className="truncate font-mono text-sm text-text-primary">
              {principalText || "Not connected"}
            </p>
          </div>
          <button
            onClick={() => principalText && copyToClipboard(principalText)}
            className="ml-4 rounded p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
            title="Copy Principal"
          >
            <RiFileCopyLine />
          </button>
        </div>
        <div className="mt-4">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-lg border border-error-red/30 bg-error-red/10 px-4 py-2 text-sm font-semibold text-error-red hover:bg-error-red/20"
          >
            <RiLogoutBoxLine />
            Disconnect Session
          </button>
        </div>
      </section>

      <section className="rounded-card border border-border-subtle bg-card-background/70 p-6">
        <h3 className="mb-4 font-display text-lg text-text-primary">System Configuration</h3>
        <div className="space-y-3">
          {envVars.map((env) => (
            <div key={env.label} className="flex flex-col gap-1 border-b border-border-subtle/50 pb-3 last:border-0 last:pb-0">
              <span className="text-xs text-text-secondary">{env.label}</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-text-primary">{env.value || "Not Configured"}</span>
                <button
                  onClick={() => env.value && copyToClipboard(env.value)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <RiFileCopyLine />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-border-subtle bg-card-background/70 p-6">
        <h3 className="mb-4 font-display text-lg text-text-primary">About</h3>
        <div className="space-y-4 text-sm text-text-secondary">
          <p>
            ThresholdVault is a decentralized inheritance protocol running on the Internet Computer.
            It leverages threshold ECDSA signatures to manage Bitcoin assets without a central authority.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/okware/ThresholdVault"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-icp-cyan hover:underline"
            >
              <RiGithubLine />
              Source Code
            </a>
            <span>v1.0.0-mainnet</span>
          </div>
        </div>
      </section>
    </div>
  );
}

