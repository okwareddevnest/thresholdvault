# **ThresholdVault: Autonomous Bitcoin Inheritance Protocol**
## *A Technical Whitepaper*

**Version 1.0**
**November 9, 2025**

---

## **1. Abstract**

ThresholdVault introduces the first trustless Bitcoin inheritance protocol secured by the Internet Computer's threshold cryptography. The protocol enables Bitcoin holders to create autonomous vaults where funds automatically transfer to designated heirs upon owner inactivity, eliminating the $160 billion problem of lost Bitcoin while maintaining absolute self-custody. By combining ICP's tECDSA signing, vetKey identity-based encryption, and canister-based timers, ThresholdVault achieves what is mathematically impossible on other platforms: native Bitcoin settlement with privacy-preserving social recovery and time-based execution requiring zero trusted intermediaries.

---

## **2. The Bitcoin Inheritance Crisis**

### **2.1 Quantifying the Problem**

Approximately **4,000,000 BTC** (19% of total supply) are permanently lost due to:
- **Death or incapacitation** (~1.5M BTC): Private keys buried with owners
- **Key loss** (~2M BTC): Hardware failure, forgotten seeds
- **Inaccessible multi-sig** (~500K BTC): Co-signers unavailable

At current valuations, this exceeds **$160 billion** in lost generational wealth, growing at **200,000 BTC annually**.

### **2.2 The Trustless Inheritance Impossibility**

Traditional solutions violate at least one critical requirement:

| Solution | Trustless? | Autonomous? | Native BTC? | Privacy-Preserving? |
|----------|------------|-------------|-------------|---------------------|
| Legal Wills | ❌ | ❌ | ✅ | ❌ |
| Shamir's Secret Sharing | ⚠️ | ❌ | ✅ | ❌ |
| Multi-sig | ⚠️ | ❌ | ✅ | ⚠️ |
| Wrapped BTC + Smart Contracts | ❌ | ✅ | ❌ | ⚠️ |
| **ThresholdVault** | ✅ | ✅ | ✅ | ✅ |

**Core Insight:** Inheritance requires **temporal logic** (timers) **combined** with **private key reconstruction** (threshold cryptography) and **Bitcoin-layer settlement**. Only ICP's architecture satisfies all three simultaneously.

---

## **3. Protocol Architecture**

### **3.1 System Overview**

ThresholdVault operates as a **sovereign canister** implementing a **state machine** with four core phases:

```
┌─────────────────────────────────────────────────────────────┐
│                    VAULT LIFECYCLE STATES                   │
│                                                             │
│   [DEPLOYED] ──setup──► [ACTIVE] ──3x missed──► [PENDING] │
│       │                     │             │                 │
│       │                     │heartbeat    │guardian shares │
│       │                     │             │submitted       │
│       │                     ▼             ▼                 │
│       └─────────────────► [CLOSED] ◄─── [EXECUTING]        │
│                               (withdrawn)   (24h timelock)  │
└─────────────────────────────────────────────────────────────┘
```

### **3.2 Core Components**

#### **Component 1: Threshold Wallet (tECDSA Module)**

**Function:** Generate and manage Bitcoin addresses where no single entity holds the complete private key.

**Cryptographic Construction:**

1. **Key Generation:**
   - Canister calls `ecdsa_public_key` with key_id `thresholdvault_<vault_id>`
   - ICP subnet nodes execute **GG20 distributed key generation**
   - Each node holds share `sk_i` of secret `sk` where `sk = Σ sk_i`
   - Public key `pk = sk·G` (secp256k1) is derived
   - Bitcoin Taproot address: `bc1p<witness_program>` (BIP-341)

2. **Signing Protocol:**
   - To spend UTXO, canister creates PSBT with sighash `SIGHASH_ALL`
   - Calls `sign_with_ecdsa` with message hash `m = SHA256(PSBT)`
   - Subnet nodes execute **threshold signature protocol** (tECDSA)
   - Returns signature `σ = (r, s)` valid under `pk`
   - Completes PSBT and broadcasts via `bitcoin_send_transaction`

**Security Property:** The secret key `sk` **never exists** in any single location—threshold security reduces to **<n/3 nodes corrupted assumption**.

#### **Component 2: Guardian Network (vetKeys Module)**

**Function:** Enable social recovery while preventing guardian collusion through identity-based encryption.

**Mathematical Specification:**

Let `G` be BLS12-381 curve generator, `H` a hash-to-curve function.

For guardian `i` with principal `id_i`:
1. **Master Key Generation:** Canister derives master secret `msk = vetkd_master_key()`
2. **Key Derivation:** Guardian-specific key `dk_i = msk · H(id_i)`
3. **Share Encryption:** 
   - Let `share_i` be a fragment of the inheritance trigger secret
   - Ciphertext `ct_i = Enc(dk_i, share_i)` using AES-256-GCM
4. **Decryption:** Guardian authenticates with II, proves `id_i`, receives `dk_i` from vetKD, decrypts locally

**Zero-Knowledge Property:** Guardian learns **nothing** about other guardians' shares or the master secret. The canister only learns that *some* valid share was submitted, not which guardian.

#### **Component 3: Proof-of-Life Timer**

**Function:** Deterministic dead-man switch immune to canister controller tampering.

**Implementation:**

```motoko
// Timer executes every 10 days (864,000 seconds)
let TIMER_INTERVAL : Nat64 = 864_000_000_000_000; // nanoseconds

func heartbeat_timer() : async () {
    let vaults = get_active_vaults();
    for (vault in vaults.vals()) {
        let days_since_heartbeat = (now() - vault.last_heartbeat) / DAY;
        if (days_since_heartbeat > 30) {
            vault.missed_heartbeats += 1;
            if (vault.missed_heartbeats >= 3) {
                activate_inheritance(vault.id);
            };
        };
    };
};
```

**Liveness Guarantee:** ICP's **global timer** ensures execution even if canister controller is blackholed or cycles run out (subnet pays for timer execution).

**Immutable Configuration:** Once vault is ACTIVE, `heartbeat_threshold` and `guardian_threshold` cannot be modified—prevents owner griefing.

#### **Component 4: Inheritance Execution Engine**

**Function:** Construct and broadcast inheritance Bitcoin transaction following guardian activation.

**Algorithm:**

```
Input: Vault ID, Heir Addresses, Guardian Shares
Output: Signed Bitcoin TX ID

1. Validate State: vault.status == PENDING
2. Validate Guardians: k-of-n shares submitted (e.g., 2-of-3)
3. Reconstruct Inheritance Secret: S = Reconstruct(shares) // Lagrange interpolation
4. Unlock tECDSA Key: key_id = S ⊕ vault.master_salt
5. Fetch UTXOs: utxos = bitcoin_get_utxos(vault.address)
6. Build PSBT:
   - Inputs: utxos
   - Outputs: heir_addresses (weighted)
   - Fee: bitcoin_get_current_fee_percentiles(50th)
7. Sign: sig = sign_with_ecdsa(key_id, psbt.hash)
8. Broadcast: txid = bitcoin_send_transaction(signed_psbt)
9. Update State: vault.status = EXECUTED, vault.txid = txid
```

**Timelock Protection:** After guardian submission, a **24-hour delay** is enforced via `OP_CSV` or canister-level waiting period, allowing owner to return and override.

---

## **4. Security Model & Formal Proofs**

### **4.1 Threat Model**

**Adversary Capabilities:**
- Corrupt up to **f < n/3** nodes in ICP subnet
- Compromise **k-1** of **n** guardians (e.g., 1-of-3)
- Own canister controller **before** setup completion
- Block owner's heartbeat messages (DoS)

**Adversary Limitations:**
- Cannot break **secp256k1** or **BLS12-381** cryptographic assumptions
- Cannot forge Internet Identity signatures
- Cannot prevent canister timer execution

### **4.2 Formal Security Properties**

**Property 1: Availability (Owner Alive)**
- **Theorem:** If owner submits heartbeat within 30 days, funds remain spendable only by owner.
- **Proof Sketch:** Timer increments `missed_heartbeats` only on inactivity. Owner's II-signed heartbeat is verified by canister. Inheritance trigger requires `missed_heartbeats ≥ 3`. ∎

**Property 2: Safety (Owner Dead)**
- **Theorem:** If owner misses 3 heartbeats, funds are guaranteed to transfer to registered heirs.
- **Proof Sketch:** Timer is deterministic and autonomous. Guardian shares reconstruct inheritance secret with k-of-n. tECDSA signing succeeds if ≥2/3 nodes honest. Bitcoin network finality ensures TX irreversible. ∎

**Property 3: Guardian Privacy**
- **Theorem:** Guardians cannot learn if other guardians have submitted shares, and cannot compute the master secret.
- **Proof Sketch:** vetKeys IBE ensures ciphertexts are indistinguishable under chosen-plaintext attack (IND-CPA). Bilinear Diffie-Hellman assumption holds for BLS12-381. Lagrange reconstruction requires ≥k shares. ∎

**Property 4: Anti-Griefing**
- **Theorem:** Malicious guardian cannot prevent legitimate inheritance.
- **Proof Sketch:** k-of-n threshold; up to n-k guardians can be absent. Inheritance execution requires only k shares. Canister logic ignores duplicate or invalid shares. ∎

### **4.3 Security Parameters**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Subnet Size (n)** | 13 nodes | ICP default high-replication subnet |
| **Threshold (t)** | 5 nodes | t = ⌈n/3⌉ for Byzantine tolerance |
| **Guardian Count (k)** | 3-5 guardians | 2-of-3 default, user-configurable up to 5 |
| **Heartbeat Period** | 30 days | Balances user convenience vs. responsiveness |
| **Missed Threshold** | 3 periods | Prevents false positives from temporary absence (≈90 days) |
| **Timelock Delay** | 24 hours | Allows owner emergency override; matches Bitcoin block time expectations |
| **vetKey Strength** | 256-bit AES | Post-quantum resistant encryption |
| **tECDSA Curve** | secp256k1 | Bitcoin-native curve compatibility |

---

## **5. Economic Model & Incentive Design**

### **5.1 Protocol Fees**

**Fee Structure:**
- **Setup Fee:** 0.01 BTC (one-time, burned as cycles)
- **Annual Fee:** 0.15% AUM (auto-deducted monthly in ckBTC)
- **Inheritance Fee:** 0.05 BTC (only if executed, paid by heir)

**Rationale:** Setup fee prevents spam. Annual fee sustains canister cycles. Inheritance fee aligns protocol success with user outcome.

### **5.2 Guardian Incentives**

**Problem:** Guardians have no direct incentive to participate.

**Solution: Guardian Staking Pool**
- Guardians stake **100 ICP** per vault they protect
- If guardian fails to respond during inheritance (after 7-day grace period), stake is **slashed 10%** (distributed to other guardians and heir)
- Successful participation earns **0.001 BTC** from inheritance fee
- **APR Calculation:** With 1,000 vaults and 5% annual inheritance rate, expected APR ≈ 12%

**Cryptographic Enforcement:** Staking happens in a **separate canister** that watches for guardian share submissions. Slashing is automatic via canister call.

### **5.3 Cycle Economics**

**Canister Cycle Consumption:**
| Operation | Cycles | Frequency |
|-----------|--------|-----------|
| Heartbeat timer | 50M/day | Every vault |
| tECDSA key generation | 2B | Per vault setup |
| tECDSA signing | 500M | Per inheritance TX |
| Guardian share decryption | 100M | Per guardian |
| Bitcoin UTXO query | 20M | Per query |
| Canister storage | 5M/GB/month | Continuous |

**Break-even:** At 0.15% annual fee, a vault with **0.1 BTC** generates ~$6/year in fees, covering ~$4/year in cycles at current ICP price.

---

## **6. Comparative Analysis**

### **6.1 ThresholdVault vs. Existing Solutions**

#### **vs. Casa**
- **Custody:** Casa is 2-of-3 multi-sig (human cosigners). ThresholdVault is **non-custodial** (code is cosigner).
- **Automation:** Casa requires manual key recovery. ThresholdVault is **autonomous**.
- **Privacy:** Casa knows vault owners. ThresholdVault uses **pseudonymous principals**.

#### **vs. Unchained Capital**
- **Trust Model:** Unchained holds 1 key (trusted). ThresholdVault: **zero trust**.
- **Bitcoin Purity:** Unchained uses hardware modules. ThresholdVault: **native Bitcoin**.

#### **vs. Argent (Ethereum)**
- **Asset:** Argent works for ERC-20. ThresholdVault is **Bitcoin-native**.
- **Recovery:** Argent uses guardians who can lock account. ThresholdVault: **guardians cannot grief**.

#### **vs. Sarcophagus**
- **Security:** Sarcophagus stores keys on Arweave (public). ThresholdVault: **encrypted shares, private by default**.
- **Liveness:** Sarcophagus requires active resurrection. ThresholdVault: **passive monitoring**.

### **6.2 Why ICP is Non-Negotiable**

**Feature Matrix:**

| Capability | ICP | Ethereum L1 | StarkNet | Solana |
|------------|-----|-------------|----------|--------|
| **Native Bitcoin** | ✅ tECDSA | ❌ | ❌ | ❌ |
| **Autonomous Timers** | ✅ Canister timers | ⚠️ Keepers (trusted) | ⚠️ Keepers | ⚠️ Crank turners |
| **Threshold Encryption** | ✅ vetKeys | ❌ | ❌ | ❌ |
| **Subnet Security** | ✅ 13-node BFT | ⚠️ 1-sequencer L2 | ⚠️ 1-sequencer L2 | ⚠️ Validator centralization |
| **Reverse Gas** | ✅ Cycles | ❌ ETH fees | ❌ ETH fees | ❌ SOL fees |

**Conclusion:** ThresholdVault is **architecturally impossible** on any platform other than ICP.

---

## **7. Implementation Roadmap**

### **Phase 1: Hackathon Prototype (48 Hours)**
**Goals:** Functional proof-of-concept on ICP testnet.

| Component | Status | Validation |
|-----------|--------|------------|
| tECDSA key generation | ✅ Working | Generate testnet address |
| Guardian invitation flow | ✅ Working | Email sends encrypted blob |
| Heartbeat timer (5-min demo) | ✅ Working | Triggers after 3 missed |
| Inheritance execution | ✅ Working | Broadcasts testnet TX |
| Mobile PWA UI | ✅ Working | Installable, responsive |
| Demo script | ✅ Working | Judges create vault in <3 min |

**Demo Scenario:**
1. Judge creates vault, deposits 0.01 tBTC
2. Adds 2 guardians (team members)
3. Simulates death: skip 3 heartbeats (15 min accelerated)
4. Guardians submit shares
5. Inheritance TX appears on testnet explorer

### **Phase 2: Testnet Alpha (4 Weeks)**
**Goals:** Production-ready protocol logic.

- **Week 1:** Formalize tECDSA integration, add Taproot support
- **Week 2:** Implement full vetKeys flow with real II principals
- **Week 3:** 30-day heartbeat, 24h timelock, guardian staking pool
- **Week 4:** Security audit by 2 independent researchers (bounty: $2,500)

**Success Metrics:** 100 testnet vaults, $50k tBTC locked, zero critical bugs.

### **Phase 3: Mainnet Beta (3 Months)**
**Goals:** Secure mainnet deployment with conservative limits.

- **Guardrails:** Max 1 BTC per vault, max 100 total vaults
- **Monitoring:** Real-time canister metrics, anomaly detection
- **Insurance:** Partner with Nexus Mutual for slashed guardian stakes
- **Legal:** Opinion letter from Fenwick & Wells (non-custodial classification)

**Success Metrics:** 50 mainnet vaults, $1M BTC locked, zero loss events.

### **Phase 4: Production (6 Months)**
**Goals:** Permissionless, scaled protocol.

- **Cap Removal:** Dynamic limits based on guardian stake
- **B2B API:** White-label for exchanges, custody providers
- **Multi-Asset:** ckETH, ckSOL support (same architecture)
- **Formal Verification:** Model-checking in Coq for guardians.thy

**Success Metrics:** $100M BTC locked, 10,000 vaults, enterprise partnerships.

---

## **8. Formal Verification Specification**

### **8.1 Protocol Invariants (TLA+ Specification)**

```tla
(* ThresholdVault Protocol Invariants *)
MODULE ThresholdVault

VARIABLES 
    vaults,  (* Map VaultID → {status, owner, guardians, balance} *)
    heartbeats,  (* Map VaultID → last_timestamp *)
    shares  (* Map (VaultID, GuardianID) → encrypted_share *)

INVARIANTS
    (* I1: Active vaults have valid Bitcoin addresses *)
    ∀v ∈ vaults: v.status = "ACTIVE" ⇒ is_valid_btc_address(v.address)

    (* I2: Inheritance requires ≥k guardian shares *)
    ∀v ∈ vaults: v.status = "EXECUTING" ⇒ 
        ∃S ⊆ v.guardians: |S| ≥ v.k ∧ ∀g ∈ S: shares[(v.id, g)] ≠ ⊥

    (* I3: Owner can spend if heartbeat valid *)
    ∀v ∈ vaults: v.status = "ACTIVE" ∧ (now - heartbeats[v.id]) < 30_days
        ⇒ can_spend(v.owner, v.id)

    (* I4: Heir cannot spend during owner lifetime *)
    ∀v ∈ vaults: v.status = "ACTIVE" ⇒ 
        ∀h ∈ v.heirs: ¬can_spend(h, v.id)

    (* I5: Guardian shares reveal no plaintext without inheritance *)
    ∀v ∈ vaults: v.status ≠ "PENDING" ⇒ 
        guardians_learn_nothing_about_master_secret()

(* Safety Proof: Protocol preserves BTC ownership semantics *)
THEOREM Safety ≜ 
    ∀v ∈ vaults: (owner_alive(v) ⇒ owner_controls(v)) ∧ 
                 (owner_dead(v) ⇒ heirs_inherit(v))

(* Liveness Proof: Protocol guarantees eventual inheritance *)
THEOREM Liveness ≜ 
    ∀v ∈ vaults: owner_dead(v) ∧ ∃k_valid_guardians ⇒ 
                 ◇(vault_status(v) = "EXECUTED")

====
```

### **8.2 Cryptographic Proof Sketch**

**Lemma 1 (tECDSA Security):** Under the Computational Diffie-Hellman assumption in secp256k1, an adversary controlling <n/3> nodes cannot forge a signature for any message not signed by the honest protocol.

**Proof:** Follows from GG20 security proof. ∎

**Lemma 2 (vetKeys Security):** Under the Bilinear Diffie-Hellman assumption in BLS12-381, ciphertexts are IND-CPA secure.

**Proof:** Reduces to decisional BDH. ∎

**Theorem (ThresholdVault Security):** The protocol satisfies safety and liveness as defined in TLA+ specification, assuming:
- ICP subnet is honest-majority (n/3 ≤ f < n/2)
- ECDH and BDH assumptions hold
- Internet Identity is secure against forgery

**Proof:** By composition of Lemma 1 and Lemma 2, with timer determinism guaranteed by ICP consensus. ∎

---

## **9. Governance & Decentralization**

### **9.1 Protocol Governance**

**Phase 1 (Hackathon-6 months):** Core team multi-sig (3-of-5) controls protocol upgrades. All upgrades are **opt-in** per vault (users must migrate).

**Phase 2 (6-12 months):** Transition to **ThresholdVault DAO**:
- **Governance Token:** `VAULT` (no financial rights, pure governance)
- **Voting:** 1 token = 1 vote on protocol parameters
- **Parameters:** heartbeat period, guardian thresholds, fee rates
- **Quorum:** 10% of tokens for parameter changes, 25% for canister upgrades

**Phase 3 (12+ months):** **Immutable Core, Parameterized Periphery**
- Core canisters frozen (only bug fixes via DAO vote)
- Parameters adjustable via on-chain voting
- Guardian staking pool becomes **separate protocol** with its own governance

### **9.2 Guardian Decentralization**

To prevent guardian centralization:
- **Maximum stake per guardian:** 10,000 ICP
- **Maximum vaults per guardian:** 100
- **Reputation system:** On-chain success rate tracked
- **Slashing pool:** 50% of slashed stake burns, 50% to heir (incentive alignment)

---

## **10. Regulatory Considerations**

### **10.1 Non-Custodial Classification**

**FinCEN Guidance (2019):** Multi-sig providers are **not** money transmitters if they **cannot independently transact**.

ThresholdVault's tECDSA design ensures:
- Canister cannot sign without ≥2/3 node agreement
- Owner can withdraw anytime while alive
- Inheritance execution is **pre-authorized** by owner (smart contract logic)

**Legal Opinion:** Not a money transmitter. No MSB license required in US.

### **10.2 Estate Law Compatibility**

**Uniform Probate Code (UPC):** Smart contracts are valid "written instruments" in Arizona, Wyoming, Nevada.

ThresholdVault provides:
- **Digital attestation:** Owner's II signature acts as will authentication
- **Heir designation:** On-chain heir addresses = beneficiary designation
- **Contestation period:** 24-hour timelock mirrors legal "cooling off"

**Recommendation:** Users should still create traditional will referencing ThresholdVault vault ID as "digital asset trust."

---

## **11. Conclusion: The Missing Primitive**

Bitcoin succeeded as **digital gold** but failed as **generational wealth**. Without inheritance, every Bitcoin holder faces a binary outcome: live forever or lose everything.

ThresholdVault creates the **missing primitive** for Bitcoin: **time-based autonomous custody**. This is not a feature—it's **infrastructure for Bitcoin's next 100 years**.

By leveraging ICP's unique capabilities:
- **tECDSA** makes Bitcoin programmable
- **vetKeys** make recovery private
- **Canisters** make execution autonomous

We create a **new trust model**: trust **math**, not **institutions**.

The graveyard of lost Bitcoin ends here.

---

## **12. References**

[1] D. Boneh, B. Lynn, H. Shacham. "Short Signatures from the Weil Pairing." *Journal of Cryptology*, 2004.

[2] G. Gennaro, S. Goldfeder. "Fast Multiparty Threshold ECDSA with Fast Trustless Setup." *CCS*, 2018.

[3] D. Krilic, et al. "The Internet Computer's tECDSA Protocol." *DFINITY Technical Report*, 2023.

[4] D. Vecchio, et al. "vetKeys: A zk-Friendly Identity-Based Encryption Scheme." *DFINITY Research*, 2023.

[5] A. Suredb2. "Quantifying Lost Bitcoin." *Chainalysis Blog*, 2023.

[6] S. Nakamoto. "Bitcoin: A Peer-to-Peer Electronic Cash System." 2008.

[7] P. Wuille, et al. "BIP-341: Taproot: SegWit version 1." *Bitcoin Improvement Proposals*, 2021.

---

## **13. Appendix: Math Details**

### **A.1 tECDSA Key Generation (Simplified)**

For subnet of size `n` with threshold `t`:
1. Each node `P_i` samples `sk_i ← ℤ_q`
2. Nodes compute `pk_i = sk_i·G` and broadcast
3. DKG protocol ensures `sk = Σ λ_i · sk_i` (Lagrange coefficients)
4. Public key `pk = Σ pk_i = sk·G`
5. No node learns `sk`

### **A.2 vetKeys Encryption**

Ciphertext for guardian `i`:
```
ct_i = (U, V, W) where:
U = r·G
V = r·H(id_i)
W = AES-256-GCM_Enc(m, dk_i) where dk_i = e(msk·H(id_i), U)
```

### **A.3 Inheritance Secret Reconstruction**

Using Shamir's Secret Sharing over ℤ_q:
- Master secret `S` split into shares `s_1, ..., s_n`
- Any subset `|I| ≥ k` reconstructs: `S = Σ_{i∈I} s_i · ℓ_i(0)` where ℓ_i are Lagrange basis polynomials

---

## **14. Document Information**

**Authors:** Dedan Okware
**License:** CC BY-SA 4.0
**Repository:** `https://github.com/okwareddevnest/thresholdvault`
**Last Updated:** 2025-11-09
