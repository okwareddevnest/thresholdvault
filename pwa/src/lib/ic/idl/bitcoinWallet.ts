import { IDL } from "@dfinity/candid";
import type { HeirRecord } from "@/types/vault";

export const idlFactory = ({ IDL: I }: { IDL: typeof IDL }) => {
  const HeirRecordIdl = I.Record({
    address: I.Text,
    weightBps: I.Nat64,
  });
  const GenerateVaultAddressArgs = I.Record({
    vaultId: I.Nat64,
    keyId: I.Text,
  });
  const BitcoinAddressResponse = I.Record({
    address: I.Text,
    keyId: I.Text,
  });
  const ExecuteInheritanceArgs = I.Record({
    vaultId: I.Nat64,
    keyId: I.Text,
    heirs: I.Vec(HeirRecordIdl),
    guardian_submissions: I.Nat64,
  });
  const ExecuteInheritanceResponse = I.Record({
    txId: I.Text,
  });
  return I.Service({
    generate_vault_address: I.Func(
      [GenerateVaultAddressArgs],
      [BitcoinAddressResponse],
      [],
    ),
    execute_inheritance: I.Func(
      [ExecuteInheritanceArgs],
      [ExecuteInheritanceResponse],
      [],
    ),
    wallet_view: I.Func(
      [I.Nat64],
      [I.Opt(BitcoinAddressResponse)],
      ["query"],
    ),
  });
};

export type BitcoinWalletActor = {
  generate_vault_address: (
    payload: { vaultId: bigint; keyId: string },
  ) => Promise<BitcoinAddressResponse>;
  execute_inheritance: (
    payload: {
      vaultId: bigint;
      keyId: string;
      heirs: HeirRecord[];
      guardian_submissions: bigint;
    },
  ) => Promise<{ txId: string }>;
  wallet_view: (
    vaultId: bigint,
  ) => Promise<BitcoinAddressResponse | null>;
};

export type BitcoinAddressResponse = {
  address: string;
  keyId: string;
};
