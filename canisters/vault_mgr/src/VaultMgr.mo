import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Trie "mo:base/Trie";

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
    principal : ?Principal;
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

  public type CreateVaultRequest = {
    name : Text;
    guardians : [GuardianInvite];
    heirRecords : [HeirRecord];
    guardianThreshold : GuardianThreshold;
    heartbeat : HeartbeatConfig;
  };

  public type GuardianInvite = { email : Text; alias : Text };

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

  public type HeartbeatRegistration = {
    vaultId : VaultId;
    nextDue : Int;
    intervalNs : Nat64;
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

  public type VaultMgrActor = actor class VaultMgr(
    guardianMgr : Principal,
    bitcoinWallet : Principal,
    heartbeatTracker : Principal,
    admin : Principal,
  ) = this {
    stable var vaultSequence : Nat64 = 1;
    stable var vaults : Trie.Trie<VaultId, Vault> = Trie.empty();

    private func vaultKey(id : VaultId) : Trie.Key<VaultId> = {
      hash = Nat64.toNat(id);
      key = id;
    };

    private func nat64Eq(x : Nat64, y : Nat64) : Bool = x == y;
    private func nat64Hash(x : Nat64) : Nat32 = Nat32.fromNat(Nat64.toNat(x));

    private func ensureCallerIsOwner(caller : Principal, vault : Vault) {
      if (caller != vault.owner) {
        Debug.trap("UNAUTHORIZED_OWNER_CALL");
      };
    };

    private func ensureHeartbeatTracker(caller : Principal) {
      if (caller != heartbeatTracker) {
        Debug.trap("UNAUTHORIZED_HEARTBEAT_CALL");
      };
    };

    private func ensureAdmin(caller : Principal) {
      if (caller != admin) {
        Debug.trap("UNAUTHORIZED_ADMIN_CALL");
      };
    };

    private func assertHeirs(heirs : [HeirRecord]) {
      if (Array.size<HeirRecord>(heirs) == 0) {
        Debug.trap("HEIR_REQUIRED");
      };
      let total = Array.foldLeft<HeirRecord, Nat>(
        heirs,
        0,
        func(acc, heir) = acc + heir.weightBps,
      );
      if (total != 10_000) {
        Debug.trap("HEIR_WEIGHTS_MUST_SUM_10000bps");
      };
    };

    private func assertHeartbeat(config : HeartbeatConfig) {
      if (config.intervalDays < 7 or config.intervalDays > 180) {
        Debug.trap("HEARTBEAT_INTERVAL_INVALID");
      };
      if (config.allowedMisses < 1 or config.allowedMisses > 6) {
        Debug.trap("HEARTBEAT_ALLOWED_MISSES_INVALID");
      };
    };

    private func assertGuardians(guardians : [GuardianInvite], threshold : Nat) {
      let count = Array.size<GuardianInvite>(guardians);
      if (count < 3 or count > 5) {
        Debug.trap("GUARDIAN_COUNT_INVALID");
      };
      if (threshold < 2 or threshold > count) {
        Debug.trap("GUARDIAN_THRESHOLD_INVALID");
      };
    };

    private func sanitizeName(name : Text) {
      if (Text.size(name) < 3 or Text.size(name) > 32) {
        Debug.trap("VAULT_NAME_INVALID");
      };
    };

    private func deriveKeyId(id : VaultId) : Text {
      "thresholdvault_" # Nat64.toText(id);
    };

    private func nextDue(lastHeartbeat : Int, config : HeartbeatConfig) : Int {
      lastHeartbeat + Int.fromNat(config.intervalDays) * 86_400;
    };

    private func intervalNs(config : HeartbeatConfig) : Nat64 {
      Nat64.fromNat(config.intervalDays) * 86_400_000_000_000;
    };

    private func summarize(vault : Vault) : VaultSummary {
      {
        id = vault.id;
        name = vault.name;
        status = vault.status;
        bitcoinAddress = vault.bitcoinAddress;
        guardianCount = Array.size<GuardianRecord>(vault.guardians);
        guardianThreshold = vault.guardianThreshold;
        heartbeatDueInSeconds = nextDue(vault.lastHeartbeat, vault.heartbeat);
      };
    };

    private func storeVault(vault : Vault) {
      vaults := Trie.put(vaults, nat64Eq, nat64Hash, vaultKey(vault.id), vault).0;
    };

    private func readVault(id : VaultId) : Vault {
      switch (Trie.find(vaults, nat64Eq, nat64Hash, vaultKey(id))) {
        case (?vault) vault;
        case null Debug.trap("VAULT_NOT_FOUND");
      };
    };

    private func replaceVault(vault : Vault) {
      storeVault(vault);
    };

    private func guardianActor() : GuardianService {
      actor (Principal.toText(guardianMgr)) : GuardianService;
    };

    private func bitcoinActor() : BitcoinWalletService {
      actor (Principal.toText(bitcoinWallet)) : BitcoinWalletService;
    };

    private func heartbeatActor() : HeartbeatService {
      actor (Principal.toText(heartbeatTracker)) : HeartbeatService;
    };

    public shared ({ caller }) func create_vault(req : CreateVaultRequest) : async VaultSummary {
      sanitizeName(req.name);
      assertGuardians(req.guardians, req.guardianThreshold);
      assertHeirs(req.heirRecords);
      assertHeartbeat(req.heartbeat);

      let newId = vaultSequence;
      vaultSequence += 1;

      let keyId = deriveKeyId(newId);
      let addressResp = await bitcoinActor().generate_vault_address({
        vault_id = newId;
        key_id = keyId;
      });

      let guardianRecords = await guardianActor().register_guardians({
        vault_id = newId;
        owner = caller;
        invites = Array.map<GuardianInvite, GuardianRegistration>(req.guardians, func(inv) {
          {
            email = inv.email;
            alias = inv.alias;
          };
        });
        threshold = req.guardianThreshold;
        key_id = keyId;
      });

      let now = Time.now() / 1_000_000_000;
      let vault : Vault = {
        id = newId;
        name = req.name;
        owner = caller;
        keyId = keyId;
        bitcoinAddress = addressResp.address;
        guardians = guardianRecords;
        guardianThreshold = req.guardianThreshold;
        heirs = req.heirRecords;
        heartbeat = req.heartbeat;
        lastHeartbeat = now;
        missedHeartbeats = 0;
        status = #Active;
        pendingTxId = null;
        createdAt = now;
      };
      storeVault(vault);

      await heartbeatActor().register_vault({
        vault_id = newId;
        owner = caller;
        next_due = nextDue(vault.lastHeartbeat, vault.heartbeat);
        interval_ns = intervalNs(vault.heartbeat);
      });

      summarize(vault);
    };

    public shared ({ caller }) func submit_heartbeat(vaultId : VaultId) : async VaultSummary {
      let vault = readVault(vaultId);
      ensureCallerIsOwner(caller, vault);
      if (vault.status != #Active) {
        Debug.trap("HEARTBEAT_ONLY_ACTIVE");
      };
      let now = Time.now() / 1_000_000_000;
      let updated : Vault = {
        id = vault.id;
        name = vault.name;
        owner = vault.owner;
        keyId = vault.keyId;
        bitcoinAddress = vault.bitcoinAddress;
        guardians = vault.guardians;
        guardianThreshold = vault.guardianThreshold;
        heirs = vault.heirs;
        heartbeat = vault.heartbeat;
        lastHeartbeat = now;
        missedHeartbeats = 0;
        status = vault.status;
        pendingTxId = vault.pendingTxId;
        createdAt = vault.createdAt;
      };
      replaceVault(updated);
      await heartbeatActor().register_vault({
        vault_id = vault.id;
        owner = caller;
        next_due = nextDue(now, vault.heartbeat);
        interval_ns = intervalNs(vault.heartbeat);
      });
      summarize(updated);
    };

    public shared ({ caller }) func get_vault_status(vaultId : VaultId) : async VaultStatusResponse {
      let vault = readVault(vaultId);
      ensureCallerIsOwner(caller, vault);
      {
        summary = summarize(vault);
        lastHeartbeat = vault.lastHeartbeat;
        missedHeartbeats = vault.missedHeartbeats;
        heirs = vault.heirs;
        guardians = vault.guardians;
      };
    };

    public shared ({ caller }) func request_inheritance(vaultId : VaultId) : async VaultSummary {
      // Owner-triggered for testing/hackathon flows
      let vault = readVault(vaultId);
      ensureCallerIsOwner(caller, vault);
      if (vault.status != #Active) {
        Debug.trap("VAULT_NOT_ACTIVE");
      };
      let updated = { vault with status = #InheritancePending };
      replaceVault(updated);
      summarize(updated);
    };

    public shared ({ caller }) func heartbeat_missed(vaultId : VaultId) : async VaultSummary {
      ensureHeartbeatTracker(caller);
      let vault = readVault(vaultId);
      if (vault.status != #Active) {
        return summarize(vault);
      };
      let missed = vault.missedHeartbeats + 1;
      let nextStatus : VaultStatus = if (missed >= vault.heartbeat.allowedMisses) {
        #InheritancePending;
      } else {
        vault.status;
      };
      let updated = { vault with missedHeartbeats = missed; status = nextStatus };
      replaceVault(updated);
      summarize(updated);
    };

    public shared ({ caller }) func execute_inheritance(vaultId : VaultId) : async ExecuteInheritanceResponse {
      let vault = readVault(vaultId);
      ensureCallerIsOwner(caller, vault);
      if (vault.status != #InheritancePending) {
        Debug.trap("VAULT_NOT_PENDING");
      };
      let shareStatus = await guardianActor().guardian_threshold_status(vault.id);
      if (shareStatus.submitted < vault.guardianThreshold) {
        Debug.trap("GUARDIAN_THRESHOLD_NOT_MET");
      };

      let txResult = await bitcoinActor().execute_inheritance({
        vault_id = vault.id;
        key_id = vault.keyId;
        heirs = vault.heirs;
        guardian_submissions = shareStatus.submitted;
      });

      let updated = { vault with status = #Executed; pendingTxId = ?txResult.txId };
      replaceVault(updated);

      {
        txId = txResult.txId;
        broadcastAt = Time.now() / 1_000_000_000;
      };
    };

    public shared ({ caller }) func reset_missed_heartbeats(vaultId : VaultId) : async VaultSummary {
      ensureAdmin(caller);
      let vault = readVault(vaultId);
      let updated = { vault with missedHeartbeats = 0; status = #Active };
      replaceVault(updated);
      summarize(updated);
    };

    public query func list_vaults(owner : Principal) : async [VaultSummary] {
      let buffer = Buffer.Buffer<VaultSummary>(0);
      Trie.iter(vaults, func(_k : VaultId, vault : Vault) {
        if (vault.owner == owner) {
          buffer.add(summarize(vault));
        };
      });
      Buffer.toArray(buffer);
    };
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
      threshold : Nat;
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
};
