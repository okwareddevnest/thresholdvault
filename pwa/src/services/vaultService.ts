'use client';

import { Principal } from "@dfinity/principal";
import { getVaultActor } from "@/services/icActors";
import type {
  CreateVaultPayload,
  GuardianSubmissionResult,
  VaultStatusResponse,
  VaultSummary,
} from "@/types/vault";

export async function listVaults(owner: Principal): Promise<VaultSummary[]> {
  const actor = await getVaultActor();
  return actor.list_vaults(owner);
}

export async function createVault(payload: CreateVaultPayload) {
  const actor = await getVaultActor();
  return actor.create_vault({
    name: payload.name,
    guardians: payload.guardians,
    heirRecords: payload.heirRecords,
    guardianThreshold: BigInt(payload.guardianThreshold),
    heartbeat: payload.heartbeat,
  });
}

export async function sendHeartbeat(vaultId: bigint) {
  const actor = await getVaultActor();
  return actor.submit_heartbeat(vaultId);
}

export async function requestInheritance(vaultId: bigint) {
  const actor = await getVaultActor();
  return actor.request_inheritance(vaultId);
}

export async function getVaultStatus(
  vaultId: bigint,
): Promise<VaultStatusResponse> {
  const actor = await getVaultActor();
  return actor.get_vault_status(vaultId);
}

export async function executeInheritance(
  vaultId: bigint,
): Promise<void> {
  const actor = await getVaultActor();
  await actor.execute_inheritance(vaultId);
}

export async function guardianSubmissionStatus(
  vaultId: bigint,
): Promise<GuardianSubmissionResult> {
  const actor = await getVaultActor();
  return actor.guardian_threshold_status(vaultId);
}
