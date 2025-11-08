export type GuardianStatus = "Invited" | "Accepted" | "ShareSubmitted";

export type VaultStatus = "Deployed" | "Active" | "InheritancePending" | "Executed";

export interface HeirRecord {
  address: string;
  weightBps: number;
}

export interface HeartbeatConfig {
  intervalDays: number;
  allowedMisses: number;
}

export interface GuardianRecord {
  emailHash: Uint8Array | number[];
  alias: string;
  status: GuardianStatus;
  principal: string | null;
}

export interface VaultSummary {
  id: bigint;
  name: string;
  status: VaultStatus;
  bitcoinAddress: string;
  guardianCount: bigint;
  guardianThreshold: bigint;
  heartbeatDueInSeconds: bigint;
}

export interface VaultStatusResponse {
  summary: VaultSummary;
  lastHeartbeat: bigint;
  missedHeartbeats: number;
  heirs: HeirRecord[];
  guardians: GuardianRecord[];
}

export interface GuardianSubmissionResult {
  submitted: bigint;
  thresholdMet: boolean;
}

export interface CreateVaultPayload {
  name: string;
  guardians: { email: string; alias: string }[];
  heirRecords: HeirRecord[];
  guardianThreshold: number;
  heartbeat: HeartbeatConfig;
}
