'use client';

import { getGuardianActor } from "@/services/icActors";
import type { GuardianRecord, GuardianSubmissionResult, ShareSubmissionReceipt } from "@/types/vault";

export async function registerGuardians(payload: {
  vaultId: bigint;
  owner: import("@dfinity/principal").Principal;
  threshold: bigint;
  keyId: string;
  invites: { email: string; alias: string }[];
}): Promise<GuardianRecord[]> {
  const actor = await getGuardianActor();
  return actor.register_guardians(payload);
}

export async function listGuardians(vaultId: bigint) {
  const actor = await getGuardianActor();
  return actor.list_guardians(vaultId);
}

export async function guardianThresholdStatus(vaultId: bigint) {
  const actor = await getGuardianActor();
  return actor.guardian_threshold_status(vaultId);
}

export async function acceptInvitation(vaultId: bigint, emailHash: Uint8Array): Promise<GuardianRecord> {
  const actor = await getGuardianActor();
  const result = await actor.accept_invitation({
    vaultId,
    emailHash: Array.from(emailHash),
  });
  if ('err' in result) {
    throw new Error(result.err);
  }
  if (!result.ok) {
    throw new Error("Unknown error");
  }
  return result.ok;
}

export async function submitGuardianShare(
  vaultId: bigint,
  emailHash: Uint8Array,
  sharePayload: Uint8Array
): Promise<ShareSubmissionReceipt> {
  const actor = await getGuardianActor();
  const result = await actor.submit_guardian_share({
    vaultId,
    emailHash: Array.from(emailHash),
    sharePayload: Array.from(sharePayload),
  });
  if ('err' in result) {
    throw new Error(result.err);
  }
  if (!result.ok) {
    throw new Error("Unknown error");
  }
  return result.ok;
}

export async function getGuardianByHash(vaultId: bigint, emailHash: Uint8Array): Promise<GuardianRecord | null> {
  const actor = await getGuardianActor();
  const result = await actor.guardian_by_hash({
    vaultId,
    emailHash: Array.from(emailHash),
  });
  // The actor type definition returns GuardianRecord | null (or [] | [GuardianRecord] depending on generation)
  // If it's an array (standard agent-js), we check length.
  if (Array.isArray(result)) {
    return result.length > 0 ? result[0] : null;
  }
  // If it's already unwrapped (custom type def)
  return result || null;
}

export async function listGuardianVaults(): Promise<bigint[]> {
  const actor = await getGuardianActor();
  return actor.list_guardian_vaults();
}
