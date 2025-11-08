'use client';

import { getBitcoinWalletActor } from "@/services/icActors";
import type { HeirRecord } from "@/types/vault";

export async function fetchVaultAddress(vaultId: bigint) {
  const actor = await getBitcoinWalletActor();
  return actor.wallet_view(vaultId);
}

export async function executeInheritanceTx(payload: {
  vaultId: bigint;
  keyId: string;
  heirs: HeirRecord[];
  guardianSubmissions: bigint;
}) {
  const actor = await getBitcoinWalletActor();
  return actor.execute_inheritance({
    vaultId: payload.vaultId,
    keyId: payload.keyId,
    heirs: payload.heirs.map((heir) => ({
      address: heir.address,
      weightBps: BigInt(heir.weightBps),
    })),
    guardian_submissions: payload.guardianSubmissions,
  });
}
