use candid::{CandidType, Principal};
use ic_cdk::api::{self, time};
use ic_cdk::management_canister::{raw_rand, VetKDCurve, VetKDDeriveKeyArgs, VetKDKeyId, VetKDPublicKeyArgs};
use ic_cdk::storage;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_vetkeys::{DerivedKeyMaterial, DerivedPublicKey, EncryptedVetKey, TransportSecretKey, VetKey};
use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::cell::RefCell;
use std::collections::{BTreeMap, BTreeSet};
use thiserror::Error;

type VaultId = u64;

const MIN_GUARDIANS: usize = 3;
const MAX_GUARDIANS: usize = 5;
const VETKEY_CONTEXT_PREFIX: &[u8] = b"thresholdvault.guardian-share.v1";
const VETKEY_TRANSPORT_DOMAIN: &[u8] = b"thresholdvault.transport.seed";
const SHARE_ENCRYPTION_DOMAIN: &str = "thresholdvault.share";
const RNG_DOMAIN: &[u8] = b"thresholdvault.guardian.rng";
const VETKEY_NAME: &str = "key_1";
const MAX_SHARE_BYTES: usize = 4096;

#[cfg(target_arch = "wasm32")]
mod wasm_rand_shim {
    use getrandom::Error;

    getrandom::register_custom_getrandom!(unavailable);

    fn unavailable(_dest: &mut [u8]) -> Result<(), Error> {
        Err(Error::UNSUPPORTED)
    }
}

thread_local! {
    static STATE: RefCell<GuardianManagerState> = RefCell::new(GuardianManagerState::default());
}

#[derive(Clone, Default, CandidType, Deserialize, Serialize)]
struct GuardianManagerState {
    vaults: BTreeMap<VaultId, VaultGuardianSet>,
    vault_manager: Option<Principal>,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
struct VaultGuardianSet {
    owner: Principal,
    threshold: u64,
    key_id: String,
    guardians: Vec<GuardianEntry>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
struct GuardianEntry {
    email_hash: Vec<u8>,
    alias: String,
    status: GuardianStatus,
    principal_id: Option<Principal>,
    encrypted_share: Option<Vec<u8>>,
    submitted_at: Option<u64>,
    updated_at: u64,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
struct GuardianSnapshot {
    vault_id: VaultId,
    guardian_index: usize,
    guardian: GuardianEntry,
}

#[derive(Clone, CandidType, Deserialize, Serialize, PartialEq, Eq)]
pub enum GuardianStatus {
    Invited,
    Accepted,
    ShareSubmitted,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct GuardianRecord {
    #[serde(rename = "emailHash")]
    pub email_hash: Vec<u8>,
    pub alias: String,
    pub status: GuardianStatus,
    #[serde(rename = "principalId")]
    pub principal_id: Option<Principal>,
}

#[derive(CandidType, Deserialize)]
pub struct GuardianRegistration {
    pub email: String,
    pub alias: String,
}

#[derive(CandidType, Deserialize)]
pub struct RegisterGuardiansArgs {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    pub owner: Principal,
    pub threshold: u64,
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub invites: Vec<GuardianRegistration>,
}

#[derive(CandidType, Deserialize)]
pub struct AcceptGuardianArgs {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    #[serde(rename = "emailHash")]
    pub email_hash: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct SubmitShareArgs {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    #[serde(rename = "emailHash")]
    pub email_hash: Vec<u8>,
    #[serde(rename = "sharePayload")]
    pub share_payload: Vec<u8>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct GuardianSubmissionResult {
    pub submitted: u64,
    #[serde(rename = "thresholdMet")]
    pub threshold_met: bool,
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct ShareSubmissionReceipt {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    #[serde(rename = "submittedAt")]
    pub submitted_at: u64,
    #[serde(rename = "remainingRequired")]
    pub remaining_required: i64,
}

#[derive(Debug, Error)]
enum GuardianError {
    #[error("vault {0} not found")]
    VaultNotFound(VaultId),
    #[error("guardian entry not found for provided hash")]
    GuardianNotFound,
    #[error("guardian already accepted invitation under different principal")]
    PrincipalMismatch,
    #[error("guardian has not accepted invitation")]
    GuardianNotAccepted,
    #[error("guardian share already submitted")]
    ShareAlreadySubmitted,
    #[error("caller {0} is not authorized")]
    Unauthorized(Principal),
    #[error("share payload exceeds {MAX_SHARE_BYTES} bytes")]
    ShareTooLarge,
    #[error("{0}")]
    Validation(String),
    #[error("cryptographic material unavailable: {0}")]
    CryptoError(String),
    #[error("system randomness unavailable")]
    RandomnessUnavailable,
}

impl GuardianError {
    fn validation<T: Into<String>>(msg: T) -> Self {
        GuardianError::Validation(msg.into())
    }
}

impl From<GuardianError> for String {
    fn from(value: GuardianError) -> Self {
        value.to_string()
    }
}

#[init]
fn init() {
    STATE.with(|state| state.replace(GuardianManagerState::default()));
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|state| {
        storage::stable_save((state.borrow().clone(),)).expect("failed to persist guardian state");
    });
}

#[post_upgrade]
fn post_upgrade() {
    let restored: Result<(GuardianManagerState,), _> = storage::stable_restore();
    let state = restored.map(|r| r.0).unwrap_or_default();
    STATE.with(|s| s.replace(state));
}

#[update]
fn set_vault_manager(manager: Principal) -> Result<(), String> {
    let caller = api::msg_caller();
    if !api::is_controller(&caller) {
        return Err(GuardianError::Unauthorized(caller).to_string());
    }
    mutate_state(|state| {
        state.vault_manager = Some(manager);
    });
    Ok(())
}

#[update]
async fn register_guardians(args: RegisterGuardiansArgs) -> Vec<GuardianRecord> {
    let caller = api::msg_caller();
    with_state(|state| {
        if let Some(manager) = state.vault_manager {
            if manager != caller {
                ic_cdk::trap(&GuardianError::Unauthorized(caller).to_string());
            }
        }
    });

    if caller != args.owner {
        ic_cdk::trap(&GuardianError::Unauthorized(caller).to_string());
    }
    if let Err(err) = validate_invites(&args.invites, args.threshold) {
        ic_cdk::trap(&err.to_string());
    }

    let timestamp = time();
    let guardians: Vec<GuardianEntry> = args
        .invites
        .iter()
        .map(|invite| GuardianEntry {
            email_hash: hash_email(&invite.email),
            alias: invite.alias.trim().to_string(),
            status: GuardianStatus::Invited,
            principal_id: None,
            encrypted_share: None,
            submitted_at: None,
            updated_at: timestamp,
        })
        .collect();
    let response: Vec<GuardianRecord> = guardians.iter().map(guardian_record).collect();

    STATE.with(|state| {
        let mut data = state.borrow_mut();
        if data.vaults.contains_key(&args.vault_id) {
            ic_cdk::trap("VAULT_ALREADY_REGISTERED");
        }
        data.vaults.insert(
            args.vault_id,
            VaultGuardianSet {
                owner: args.owner,
                threshold: args.threshold,
                key_id: args.key_id.clone(),
                guardians,
                created_at: timestamp,
                updated_at: timestamp,
            },
        );
    });

    response
}

#[update]
async fn accept_invitation(args: AcceptGuardianArgs) -> Result<GuardianRecord, String> {
    let caller = api::msg_caller();
    mutate_state(|state| -> Result<GuardianRecord, GuardianError> {
        let vault = state
            .vaults
            .get_mut(&args.vault_id)
            .ok_or(GuardianError::VaultNotFound(args.vault_id))?;
        let guardian = vault
            .guardians
            .iter_mut()
            .find(|g| g.email_hash == args.email_hash)
            .ok_or(GuardianError::GuardianNotFound)?;
        if let Some(existing) = guardian.principal_id {
            if existing != caller {
                return Err(GuardianError::PrincipalMismatch);
            }
        }
        guardian.principal_id = Some(caller);
        guardian.status = GuardianStatus::Accepted;
        guardian.updated_at = time();
        vault.updated_at = guardian.updated_at;
        Ok(guardian_record(guardian))
    })
    .map_err(String::from)
}

#[update]
async fn submit_guardian_share(args: SubmitShareArgs) -> Result<ShareSubmissionReceipt, String> {
    let caller = api::msg_caller();
    if args.share_payload.is_empty() {
        return Err(GuardianError::validation("share payload required").into());
    }
    if args.share_payload.len() > MAX_SHARE_BYTES {
        return Err(GuardianError::ShareTooLarge.into());
    }

    let snapshot = snapshot_guardian(args.vault_id, &args.email_hash)?;
    if snapshot.guardian.principal_id != Some(caller) {
        return Err(GuardianError::Unauthorized(caller).into());
    }
    if snapshot.guardian.status != GuardianStatus::Accepted {
        return Err(GuardianError::GuardianNotAccepted.into());
    }
    if snapshot.guardian.encrypted_share.is_some() {
        return Err(GuardianError::ShareAlreadySubmitted.into());
    }

    let ciphertext =
        encrypt_share_for_guardian(snapshot.vault_id, &snapshot.guardian, &args.share_payload)
            .await?;
    let now = time();

    mutate_state(|state| -> Result<ShareSubmissionReceipt, GuardianError> {
        let vault = state
            .vaults
            .get_mut(&snapshot.vault_id)
            .ok_or(GuardianError::VaultNotFound(snapshot.vault_id))?;
        let guardian = vault
            .guardians
            .get_mut(snapshot.guardian_index)
            .ok_or(GuardianError::GuardianNotFound)?;
        guardian.encrypted_share = Some(ciphertext);
        guardian.status = GuardianStatus::ShareSubmitted;
        guardian.submitted_at = Some(now);
        guardian.updated_at = now;
        vault.updated_at = now;

        let submitted = vault
            .guardians
            .iter()
            .filter(|entry| entry.encrypted_share.is_some())
            .count() as u64;
        let remaining = vault
            .threshold
            .saturating_sub(submitted) as i64;

        Ok(ShareSubmissionReceipt {
            vault_id: snapshot.vault_id,
            submitted_at: now,
            remaining_required: remaining,
        })
    })
    .map_err(String::from)
}

#[update]
async fn guardian_threshold_status(vault_id: VaultId) -> GuardianSubmissionResult {
    with_state(|state| threshold_summary(state, vault_id))
}

#[query]
fn list_guardians(vault_id: VaultId) -> Vec<GuardianRecord> {
    with_state(|state| {
        let vault = state
            .vaults
            .get(&vault_id)
            .unwrap_or_else(|| ic_cdk::trap(&GuardianError::VaultNotFound(vault_id).to_string()));
        vault.guardians.iter().map(guardian_record).collect()
    })
}

#[query]
fn guardian_by_hash(args: AcceptGuardianArgs) -> Option<GuardianRecord> {
    with_state(|state| {
        state
            .vaults
            .get(&args.vault_id)
            .and_then(|vault| {
                vault
                    .guardians
                    .iter()
                    .find(|g| g.email_hash == args.email_hash)
                    .map(guardian_record)
            })
    })
}

#[query]
fn list_guardian_vaults() -> Vec<VaultId> {
    let caller = api::msg_caller();
    with_state(|state| {
        state
            .vaults
            .iter()
            .filter(|(_, vault)| {
                vault.guardians.iter().any(|g| g.principal_id == Some(caller))
            })
            .map(|(id, _)| *id)
            .collect()
    })
}

fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut GuardianManagerState) -> R,
{
    STATE.with(|state| {
        let mut data = state.borrow_mut();
        f(&mut data)
    })
}

fn with_state<F, R>(f: F) -> R
where
    F: FnOnce(&GuardianManagerState) -> R,
{
    STATE.with(|state| {
        let data = state.borrow();
        f(&data)
    })
}

fn guardian_record(entry: &GuardianEntry) -> GuardianRecord {
    GuardianRecord {
        email_hash: entry.email_hash.clone(),
        alias: entry.alias.clone(),
        status: entry.status.clone(),
        principal_id: entry.principal_id,
    }
}

fn canonical_email(email: &str) -> String {
    email.trim().to_ascii_lowercase()
}

fn hash_email(email: &str) -> Vec<u8> {
    let normalized = canonical_email(email);
    Sha256::digest(normalized.as_bytes()).to_vec()
}

fn validate_invites(invites: &[GuardianRegistration], threshold: u64) -> Result<(), GuardianError> {
    if invites.len() < MIN_GUARDIANS || invites.len() > MAX_GUARDIANS {
        return Err(GuardianError::validation(format!(
            "guardian count must be between {MIN_GUARDIANS} and {MAX_GUARDIANS}"
        )));
    }
    if threshold < 2 || threshold as usize > invites.len() {
        return Err(GuardianError::validation(
            "guardian threshold must be >=2 and <= guardian count",
        ));
    }
    let mut seen = BTreeSet::new();
    for invite in invites {
        let normalized = canonical_email(&invite.email);
        if normalized.is_empty() {
            return Err(GuardianError::validation("guardian email required"));
        }
        if !seen.insert(normalized) {
            return Err(GuardianError::validation(
                "duplicate guardian email detected",
            ));
        }
        if invite.alias.trim().is_empty() {
            return Err(GuardianError::validation("guardian alias required"));
        }
    }
    Ok(())
}

fn threshold_summary(state: &GuardianManagerState, vault_id: VaultId) -> GuardianSubmissionResult {
    let vault = state
        .vaults
        .get(&vault_id)
        .unwrap_or_else(|| ic_cdk::trap(&GuardianError::VaultNotFound(vault_id).to_string()));
    let submitted = vault
        .guardians
        .iter()
        .filter(|entry| entry.encrypted_share.is_some())
        .count() as u64;
    GuardianSubmissionResult {
        submitted,
        threshold_met: submitted >= vault.threshold,
    }
}

fn snapshot_guardian(vault_id: VaultId, email_hash: &[u8]) -> Result<GuardianSnapshot, GuardianError> {
    with_state(|state| {
        let vault = state
            .vaults
            .get(&vault_id)
            .ok_or(GuardianError::VaultNotFound(vault_id))?;
        vault
            .guardians
            .iter()
            .enumerate()
            .find(|(_, entry)| entry.email_hash == email_hash)
            .map(|(index, entry)| GuardianSnapshot {
                vault_id,
                guardian_index: index,
                guardian: entry.clone(),
            })
            .ok_or(GuardianError::GuardianNotFound)
    })
}

fn vetkd_key_id() -> VetKDKeyId {
    VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: VETKEY_NAME.to_string(),
    }
}

fn guardian_context(vault_id: VaultId) -> Vec<u8> {
    let mut ctx = VETKEY_CONTEXT_PREFIX.to_vec();
    ctx.extend_from_slice(&vault_id.to_be_bytes());
    ctx
}

fn guardian_input(vault_id: VaultId, guardian: &GuardianEntry) -> Vec<u8> {
    let mut preimage = Vec::with_capacity(guardian.email_hash.len() + 32);
    preimage.extend_from_slice(&vault_id.to_be_bytes());
    preimage.extend_from_slice(&guardian.email_hash);
    if let Some(principal) = guardian.principal_id {
        preimage.extend_from_slice(principal.as_slice());
    }
    Sha256::digest(&preimage).to_vec()
}

fn derive_transport_secret(
    vault_id: VaultId,
    guardian: &GuardianEntry,
) -> Result<TransportSecretKey, GuardianError> {
    let mut material = Vec::with_capacity(guardian.email_hash.len() + 32);
    material.extend_from_slice(VETKEY_TRANSPORT_DOMAIN);
    material.extend_from_slice(&guardian.email_hash);
    material.extend_from_slice(&vault_id.to_be_bytes());
    if let Some(principal) = guardian.principal_id {
        material.extend_from_slice(principal.as_slice());
    }
    let digest = Sha256::digest(&material);
    TransportSecretKey::from_seed(digest[..32].to_vec())
        .map_err(|err| GuardianError::CryptoError(err.to_string()))
}

async fn derive_guardian_vetkey(
    vault_id: VaultId,
    guardian: &GuardianEntry,
) -> Result<VetKey, GuardianError> {
    let input = guardian_input(vault_id, guardian);
    let context = guardian_context(vault_id);
    let transport = derive_transport_secret(vault_id, guardian)?;
    let key_id = vetkd_key_id();

    let derive_reply = ic_cdk::management_canister::vetkd_derive_key(&VetKDDeriveKeyArgs {
        input: input.clone(),
        context: context.clone(),
        key_id: key_id.clone(),
        transport_public_key: transport.public_key(),
    })
    .await
    .map_err(|err| GuardianError::CryptoError(format!("vetkd_derive_key rejected: {err:?}")))?;

    let encrypted =
        EncryptedVetKey::deserialize(&derive_reply.encrypted_key).map_err(GuardianError::CryptoError)?;
    let pk_reply = ic_cdk::management_canister::vetkd_public_key(&VetKDPublicKeyArgs {
        canister_id: Some(api::canister_self()),
        context: context.clone(),
        key_id,
    })
    .await
    .map_err(|err| GuardianError::CryptoError(format!("vetkd_public_key rejected: {err:?}")))?;

    let derived_public =
        DerivedPublicKey::deserialize(&pk_reply.public_key).map_err(|_| {
            GuardianError::CryptoError("invalid derived public key".to_string())
        })?;

    encrypted
        .decrypt_and_verify(&transport, &derived_public, &input)
        .map_err(GuardianError::CryptoError)
}

async fn derive_key_material(
    vault_id: VaultId,
    guardian: &GuardianEntry,
) -> Result<DerivedKeyMaterial, GuardianError> {
    let vetkey = derive_guardian_vetkey(vault_id, guardian).await?;
    Ok(vetkey.as_derived_key_material())
}

async fn seeded_rng() -> Result<ChaCha20Rng, GuardianError> {
    let random_bytes = raw_rand()
        .await
        .map_err(|err| GuardianError::CryptoError(format!("raw_rand rejected: {err:?}")))?;
    if random_bytes.is_empty() {
        return Err(GuardianError::RandomnessUnavailable);
    }
    let mut seed = [0u8; 32];
    if random_bytes.len() >= 32 {
        seed.copy_from_slice(&random_bytes[..32]);
    } else {
        let mut hasher = Sha256::new();
        hasher.update(RNG_DOMAIN);
        hasher.update(&random_bytes);
        let digest = hasher.finalize();
        seed.copy_from_slice(&digest[..32]);
    }
    Ok(ChaCha20Rng::from_seed(seed))
}

async fn encrypt_share_for_guardian(
    vault_id: VaultId,
    guardian: &GuardianEntry,
    share: &[u8],
) -> Result<Vec<u8>, GuardianError> {
    let mut rng = seeded_rng().await?;
    let key_material = derive_key_material(vault_id, guardian).await?;
    key_material
        .encrypt_message(share, SHARE_ENCRYPTION_DOMAIN, &mut rng)
        .map_err(|err| GuardianError::CryptoError(format!("encryption failed: {:?}", err)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_email_normalizes_case() {
        let h1 = hash_email("Guardian@Example.com");
        let h2 = hash_email("guardian@example.com");
        assert_eq!(h1, h2);
    }

    #[test]
    fn validate_invites_rejects_duplicates() {
        let invites = vec![
            GuardianRegistration {
                email: "dup@example.com".into(),
                alias: "A".into(),
            },
            GuardianRegistration {
                email: "DUP@example.com".into(),
                alias: "B".into(),
            },
            GuardianRegistration {
                email: "unique@example.com".into(),
                alias: "C".into(),
            },
        ];
        assert!(validate_invites(&invites, 2).is_err());
    }

    #[test]
    fn validate_invites_accepts_valid_payload() {
        let invites = vec![
            GuardianRegistration {
                email: "alpha@example.com".into(),
                alias: "Alpha".into(),
            },
            GuardianRegistration {
                email: "beta@example.com".into(),
                alias: "Beta".into(),
            },
            GuardianRegistration {
                email: "gamma@example.com".into(),
                alias: "Gamma".into(),
            },
        ];
        assert!(validate_invites(&invites, 2).is_ok());
    }
}
