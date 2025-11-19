import { IDL } from "@dfinity/candid";
import type { GuardianRecord, GuardianSubmissionResult } from "@/types/vault";

export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const I = IDL;
  const GuardianStatusIdl = I.Variant({
    Invited: I.Null,
    Accepted: I.Null,
    ShareSubmitted: I.Null,
  });
  const GuardianRecordIdl = I.Record({
    emailHash: I.Vec(I.Nat8),
    alias: I.Text,
    status: GuardianStatusIdl,
    principal: I.Opt(I.Principal),
  });
  const GuardianRegistration = I.Record({
    email: I.Text,
    alias: I.Text,
  });
  const RegisterGuardiansArgs = I.Record({
    vaultId: I.Nat64,
    owner: I.Principal,
    threshold: I.Nat64,
    keyId: I.Text,
    invites: I.Vec(GuardianRegistration),
  });
  const AcceptGuardianArgs = I.Record({
    vaultId: I.Nat64,
    emailHash: I.Vec(I.Nat8),
  });
  const SubmitShareArgs = I.Record({
    vaultId: I.Nat64,
    emailHash: I.Vec(I.Nat8),
    sharePayload: I.Vec(I.Nat8),
  });
  const GuardianSubmissionResultIdl = I.Record({
    submitted: I.Nat64,
    thresholdMet: I.Bool,
  });
  const ShareSubmissionReceipt = I.Record({
    vaultId: I.Nat64,
    submittedAt: I.Nat64,
    remainingRequired: I.Int64,
  });
  const ResultGuardian = I.Variant({
    ok: GuardianRecordIdl,
    err: I.Text,
  });
  const ResultReceipt = I.Variant({
    ok: ShareSubmissionReceipt,
    err: I.Text,
  });
  return I.Service({
    register_guardians: I.Func(
      [RegisterGuardiansArgs],
      [I.Vec(GuardianRecordIdl)],
      [],
    ),
    accept_invitation: I.Func([AcceptGuardianArgs], [ResultGuardian], []),
    submit_guardian_share: I.Func([SubmitShareArgs], [ResultReceipt], []),
    guardian_threshold_status: I.Func(
      [I.Nat64],
      [GuardianSubmissionResultIdl],
      [],
    ),
    list_guardians: I.Func(
      [I.Nat64],
      [I.Vec(GuardianRecordIdl)],
      ["query"],
    ),
    list_guardian_vaults: I.Func([], [I.Vec(I.Nat64)], ["query"]),
    guardian_by_hash: I.Func(
      [AcceptGuardianArgs],
      [I.Opt(GuardianRecordIdl)],
      ["query"],
    ),
  });
};

export type GuardianActor = {
  register_guardians: (
    payload: {
      vaultId: bigint;
      owner: import("@dfinity/principal").Principal;
      threshold: bigint;
      keyId: string;
      invites: { email: string; alias: string }[];
    },
  ) => Promise<GuardianRecord[]>;
  accept_invitation: (
    payload: { vaultId: bigint; emailHash: number[] },
  ) => Promise<{ ok?: GuardianRecord; err?: string }>;
  submit_guardian_share: (
    payload: { vaultId: bigint; emailHash: number[]; sharePayload: number[] },
  ) => Promise<{ ok?: ShareSubmissionReceipt; err?: string }>;
  guardian_threshold_status: (
    vaultId: bigint,
  ) => Promise<GuardianSubmissionResult>;
  list_guardians: (vaultId: bigint) => Promise<GuardianRecord[]>;
  list_guardian_vaults: () => Promise<bigint[]>;
  guardian_by_hash: (
    payload: { vaultId: bigint; emailHash: number[] },
  ) => Promise<GuardianRecord | null>;
};

export type ShareSubmissionReceipt = {
  vaultId: bigint;
  submittedAt: bigint;
  remainingRequired: bigint;
};
