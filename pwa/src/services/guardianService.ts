'use client';

import { getGuardianActor } from "@/services/icActors";
import type { GuardianRecord } from "@/types/vault";

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
