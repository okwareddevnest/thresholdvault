"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import { HeartbeatRing } from "@/components/vault/HeartbeatRing";
import type { VaultSummary } from "@/types/vault";

type Props = {
  vault: VaultSummary;
  isSelected: boolean;
  onSelect: (id: bigint) => void;
};

function statusStyles(status: VaultSummary["status"]) {
  switch (status) {
    case "Active":
      return {
        label: "Secure",
        color: "var(--color-success-green)",
      };
    case "InheritancePending":
      return {
        label: "Inheritance Active",
        color: "var(--color-error-red)",
      };
    case "Executed":
      return {
        label: "Executed",
        color: "var(--color-text-secondary)",
      };
    default:
      return {
        label: "Deploying",
        color: "var(--color-warning-amber)",
      };
  }
}

export function VaultCard({ vault, isSelected, onSelect }: Props) {
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const heartbeatDue = Number(vault.heartbeatDueInSeconds);
  const daysRemaining = Math.max(
    0,
    Math.round((heartbeatDue - nowSeconds) / 86400),
  );
  const status = statusStyles(vault.status);

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(vault.id)}
      whileHover={{ scale: 1.01 }}
      className={`flex h-[180px] w-full flex-col justify-between rounded-card border px-6 py-4 text-left shadow-vault transition ${
        isSelected
          ? "border-icp-cyan bg-card-background"
          : "border-border-subtle bg-card-background/80 hover:border-icp-cyan/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-text-secondary">
            Heartbeat
          </p>
          <h3 className="mt-1 font-display text-xl text-text-primary">
            {vault.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <span>{status.label}</span>
          </div>
        </div>
        <HeartbeatRing daysRemaining={daysRemaining} intervalDays={30} />
      </div>
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <div>
          <p className="text-text-primary">
            {truncateAddress(vault.bitcoinAddress, 6)}
          </p>
          <p className="text-xs">
            Next proof: {formatTimestamp(vault.heartbeatDueInSeconds)}
          </p>
        </div>
        <div className="text-right">
          <p>
            {Number(vault.guardianThreshold)} / {Number(vault.guardianCount)} guardians
          </p>
        </div>
      </div>
    </motion.button>
  );
}
