'use client';

import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory as vaultIdl, type VaultActor } from "@/lib/ic/idl/vaultMgr";
import {
  idlFactory as guardianIdl,
  type GuardianActor,
} from "@/lib/ic/idl/guardianMgr";
import {
  idlFactory as walletIdl,
  type BitcoinWalletActor,
} from "@/lib/ic/idl/bitcoinWallet";
import {
  BITCOIN_WALLET_CANISTER_ID,
  GUARDIAN_MGR_CANISTER_ID,
  IC_HOST,
  VAULT_MGR_CANISTER_ID,
} from "@/lib/ic/env";

const actorCache: Partial<{
  vault: Promise<VaultActor>;
  guardian: Promise<GuardianActor>;
  wallet: Promise<BitcoinWalletActor>;
}> = {};
let activeIdentity: Identity | null = null;

function resetCache() {
  actorCache.vault = undefined;
  actorCache.guardian = undefined;
  actorCache.wallet = undefined;
}

export function configureAgentIdentity(identity: Identity | null) {
  activeIdentity = identity;
  resetCache();
}

async function createAgent() {
  const agent = new HttpAgent({
    host: IC_HOST,
    identity: activeIdentity ?? undefined,
  });
  
  // Always fetch root key when not on mainnet
  // The check process.env.NODE_ENV !== "production" is insufficient because
  // we might be running a production build locally or on a testnet.
  // We should check if the host is NOT the mainnet host.
  // Note: Playground runs on Mainnet ('ic0.app'), so it correctly skips this.
  const isMainnet = IC_HOST.includes("ic0.app");
  
  if (!isMainnet) {
    await agent.fetchRootKey().catch((err) => {
      console.warn(
        `Unable to fetch root key. Check IC host configuration. ${err}`,
      );
    });
  }
  return agent;
}

export async function getVaultActor() {
  if (!VAULT_MGR_CANISTER_ID) {
    throw new Error("Vault manager canister id is not configured.");
  }
  if (!actorCache.vault) {
    actorCache.vault = (async () => {
      const agent = await createAgent();
      return Actor.createActor<VaultActor>(vaultIdl, {
        agent,
        canisterId: Principal.fromText(VAULT_MGR_CANISTER_ID),
      });
    })();
  }
  return actorCache.vault;
}

export async function getGuardianActor() {
  if (!GUARDIAN_MGR_CANISTER_ID) {
    throw new Error("Guardian manager canister id is not configured.");
  }
  if (!actorCache.guardian) {
    actorCache.guardian = (async () => {
      const agent = await createAgent();
      return Actor.createActor<GuardianActor>(guardianIdl, {
        agent,
        canisterId: Principal.fromText(GUARDIAN_MGR_CANISTER_ID),
      });
    })();
  }
  return actorCache.guardian;
}

export async function getBitcoinWalletActor() {
  if (!BITCOIN_WALLET_CANISTER_ID) {
    throw new Error("Bitcoin wallet canister id is not configured.");
  }
  if (!actorCache.wallet) {
    actorCache.wallet = (async () => {
      const agent = await createAgent();
      return Actor.createActor<BitcoinWalletActor>(walletIdl, {
        agent,
        canisterId: Principal.fromText(BITCOIN_WALLET_CANISTER_ID),
      });
    })();
  }
  return actorCache.wallet;
}
