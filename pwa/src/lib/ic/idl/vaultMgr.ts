import { IDL } from "@dfinity/candid";
import type {
  ExecuteInheritanceResponse,
  GuardianSubmissionResult,
  HeirRecord,
  HeartbeatConfig,
  VaultStatusResponse,
  VaultSummary,
} from "@/types/vault";

export const idlFactory = ({ IDL: I }: { IDL: typeof IDL }) => {
  const VaultId = I.Nat64;
  const GuardianStatus = I.Variant({
    Invited: I.Null,
    Accepted: I.Null,
    ShareSubmitted: I.Null,
  });
  const GuardianRecord = I.Record({
    emailHash: I.Vec(I.Nat8),
    alias: I.Text,
    status: GuardianStatus,
    principal: I.Opt(I.Principal),
  });
  const HeirRecord = I.Record({
    address: I.Text,
    weightBps: I.Nat,
  });
  const HeartbeatConfig = I.Record({
    intervalDays: I.Nat,
    allowedMisses: I.Nat,
  });
  const VaultStatus = I.Variant({
    Deployed: I.Null,
    Active: I.Null,
    InheritancePending: I.Null,
    Executed: I.Null,
  });
  const VaultSummary = I.Record({
    id: VaultId,
    name: I.Text,
    status: VaultStatus,
    bitcoinAddress: I.Text,
    guardianCount: I.Nat,
    guardianThreshold: I.Nat,
    heartbeatDueInSeconds: I.Int,
  });
  const VaultStatusResponse = I.Record({
    summary: VaultSummary,
    lastHeartbeat: I.Int,
    missedHeartbeats: I.Nat,
    heirs: I.Vec(HeirRecord),
    guardians: I.Vec(GuardianRecord),
  });
  const GuardianInvite = I.Record({
    email: I.Text,
    alias: I.Text,
  });
  const CreateVaultRequest = I.Record({
    name: I.Text,
    guardians: I.Vec(GuardianInvite),
    heirRecords: I.Vec(HeirRecord),
    guardianThreshold: I.Nat,
    heartbeat: HeartbeatConfig,
  });
  const GuardianSubmissionResult = I.Record({
    submitted: I.Nat,
    thresholdMet: I.Bool,
  });
  const ExecuteInheritanceResponse = I.Record({
    txId: I.Text,
    broadcastAt: I.Int,
  });
  return I.Service({
    create_vault: I.Func([CreateVaultRequest], [VaultSummary], []),
    submit_heartbeat: I.Func([VaultId], [VaultSummary], []),
    get_vault_status: I.Func([VaultId], [VaultStatusResponse], []),
    request_inheritance: I.Func([VaultId], [VaultSummary], []),
    heartbeat_missed: I.Func([VaultId], [VaultSummary], []),
    execute_inheritance: I.Func(
      [VaultId],
      [ExecuteInheritanceResponse],
      [],
    ),
    guardian_threshold_status: I.Func(
      [VaultId],
      [GuardianSubmissionResult],
      [],
    ),
    reset_missed_heartbeats: I.Func([VaultId], [VaultSummary], []),
    list_vaults: I.Func(
      [I.Principal],
      [I.Vec(VaultSummary)],
      ["query"],
    ),
  });
};

export type VaultActor = {
  create_vault: (
    payload: {
      name: string;
      guardians: { email: string; alias: string }[];
      heirRecords: HeirRecord[];
      guardianThreshold: bigint;
      heartbeat: HeartbeatConfig;
    },
  ) => Promise<VaultSummary>;
  submit_heartbeat: (vaultId: bigint) => Promise<VaultSummary>;
  get_vault_status: (vaultId: bigint) => Promise<VaultStatusResponse>;
  request_inheritance: (vaultId: bigint) => Promise<VaultSummary>;
  heartbeat_missed: (vaultId: bigint) => Promise<VaultSummary>;
  execute_inheritance: (
    vaultId: bigint,
  ) => Promise<ExecuteInheritanceResponse>;
  guardian_threshold_status: (
    vaultId: bigint,
  ) => Promise<GuardianSubmissionResult>;
  reset_missed_heartbeats: (vaultId: bigint) => Promise<VaultSummary>;
  list_vaults: (owner: import("@dfinity/principal").Principal) => Promise<
    VaultSummary[]
  >;
};
