import Blob "mo:base/Blob";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Principal "mo:base/Principal";
import Text "mo:base/Text";

module {
  public type VaultId = Nat64;
  public type GuardianThreshold = Nat;
  public type HeartbeatConfig = { intervalDays : Nat; allowedMisses : Nat };
  public type HeirRecord = { address : Text; weightBps : Nat };

  public type VaultStatus = {
    #Deployed;
    #Active;
    #InheritancePending;
    #Executed;
  };

  public type GuardianRecord = {
    emailHash : Blob;
    alias : Text;
    status : GuardianStatus;
    principalId : ?Principal;
  };

  public type GuardianStatus = { #Invited; #Accepted; #ShareSubmitted };

  public type Vault = {
    id : VaultId;
    name : Text;
    owner : Principal;
    keyId : Text;
    bitcoinAddress : Text;
    guardians : [GuardianRecord];
    guardianThreshold : GuardianThreshold;
    heirs : [HeirRecord];
    heartbeat : HeartbeatConfig;
    lastHeartbeat : Int;
    missedHeartbeats : Nat;
    status : VaultStatus;
    pendingTxId : ?Text;
    createdAt : Int;
  };

  public type GuardianInvite = { email : Text; alias : Text };

  public type CreateVaultRequest = {
    name : Text;
    guardians : [GuardianInvite];
    heirRecords : [HeirRecord];
    guardianThreshold : GuardianThreshold;
    heartbeat : HeartbeatConfig;
  };

  public type VaultSummary = {
    id : VaultId;
    name : Text;
    status : VaultStatus;
    bitcoinAddress : Text;
    guardianCount : Nat;
    guardianThreshold : GuardianThreshold;
    heartbeatDueInSeconds : Int;
  };

  public type VaultStatusResponse = {
    summary : VaultSummary;
    lastHeartbeat : Int;
    missedHeartbeats : Nat;
    heirs : [HeirRecord];
    guardians : [GuardianRecord];
  };

  public type GuardianSubmissionResult = {
    submitted : Nat;
    thresholdMet : Bool;
  };

  public type BitcoinAddressResponse = {
    address : Text;
    keyId : Text;
  };

  public type ExecuteInheritanceResponse = {
    txId : Text;
    broadcastAt : Int;
  };

  public type GuardianRegistration = {
    email : Text;
    alias : Text;
  };

  public type GuardianService = actor {
    register_guardians : ({
      vault_id : VaultId;
      owner : Principal;
      invites : [GuardianRegistration];
      threshold : GuardianThreshold;
      key_id : Text;
    }) -> async [GuardianRecord];
    guardian_threshold_status : (VaultId) -> async GuardianSubmissionResult;
  };

  public type BitcoinWalletService = actor {
    generate_vault_address : ({
      vault_id : VaultId;
      key_id : Text;
    }) -> async BitcoinAddressResponse;
    execute_inheritance : ({
      vault_id : VaultId;
      key_id : Text;
      heirs : [HeirRecord];
      guardian_submissions : Nat;
    }) -> async { txId : Text };
  };

  public type HeartbeatService = actor {
    register_vault : ({
      vault_id : VaultId;
      owner : Principal;
      next_due : Int;
      interval_ns : Nat64;
    }) -> async ();
  };
}
