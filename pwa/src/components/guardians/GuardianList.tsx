"use client";

import type { GuardianRecord } from "@/types/vault";

const statusMap: Record<
  GuardianRecord["status"],
  { label: string; color: string }
> = {
  Invited: { label: "Invited", color: "var(--color-warning-amber)" },
  Accepted: { label: "Accepted", color: "var(--color-success-green)" },
  ShareSubmitted: { label: "Share Submitted", color: "var(--color-icp-cyan)" },
};

type Props = {
  guardians: GuardianRecord[];
};

const toHex = (bytes: number[] | Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export function GuardianList({ guardians }: Props) {
  if (!guardians.length) {
    return (
      <div className="rounded border border-border-subtle p-4 text-sm text-text-secondary">
        No guardians added yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {guardians.map((guardian, idx) => {
        const status = statusMap[guardian.status];
        return (
          <div
            key={`${guardian.alias}-${idx}`}
            className="flex items-center justify-between rounded border border-border-subtle px-4 py-3"
          >
            <div>
              <p className="text-text-primary">{guardian.alias}</p>
              <p className="text-xs text-text-secondary">
                {toHex(guardian.emailHash).slice(0, 12)}…
              </p>
            </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: `${status.color}33`, color: status.color }}
              >
                {status.label}
              </span>
          </div>
        );
      })}
    </div>
  );
}
