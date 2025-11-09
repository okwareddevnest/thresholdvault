use bitcoin::consensus::Encodable;
use bitcoin::hashes::Hash;
use bitcoin::key::PublicKey;
use bitcoin::secp256k1;
use bitcoin::sighash::{EcdsaSighashType, SighashCache};
use bitcoin::{
    absolute::LockTime, transaction::Version, Address, Amount, Network as BtcNetwork, OutPoint, ScriptBuf, Sequence,
    Transaction, TxIn, TxOut, Txid, Witness,
};
use candid::CandidType;
use ic_cdk::api::{self};
use ic_cdk::bitcoin_canister::{
    bitcoin_get_current_fee_percentiles, bitcoin_get_utxos, bitcoin_send_transaction, GetCurrentFeePercentilesRequest,
    GetUtxosRequest, Network, SendTransactionRequest, Utxo, UtxosFilter,
};
use ic_cdk::management_canister::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgs, SignWithEcdsaArgs,
};
use ic_cdk::storage;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::BTreeMap;
use std::str::FromStr;
use thiserror::Error;

type VaultId = u64;

const BASIS_POINTS: u64 = 10_000;
const MIN_CONFIRMATIONS: u32 = 1;
const DUST_THRESHOLD: u64 = 546;
const FALLBACK_FEE_MSAT_PER_VBYTE: u64 = 15_000; // 15 sat/vB
const BTC_NETWORK: BtcNetwork = BtcNetwork::Testnet;
const BTC_CANISTER_NETWORK: Network = Network::Testnet;

thread_local! {
    static STATE: RefCell<VaultWalletState> = RefCell::new(VaultWalletState::default());
}

#[cfg(target_arch = "wasm32")]
mod wasm_rand_shim {
    use getrandom::Error;

    getrandom::register_custom_getrandom!(unavailable);

    fn unavailable(_dest: &mut [u8]) -> Result<(), Error> {
        Err(Error::UNSUPPORTED)
    }
}

#[derive(Default, Clone, CandidType, Deserialize, Serialize)]
struct VaultWalletState {
    wallets: BTreeMap<VaultId, VaultWallet>,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
struct VaultWallet {
    key_id: String,
    derivation_path: Vec<Vec<u8>>,
    address: String,
    script_pub_key: Vec<u8>,
    public_key: Vec<u8>,
    network: Network,
}

#[derive(CandidType, Deserialize)]
pub struct GenerateVaultAddressArgs {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    #[serde(rename = "keyId")]
    pub key_id: String,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct BitcoinAddressResponse {
    pub address: String,
    #[serde(rename = "keyId")]
    pub key_id: String,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct HeirRecord {
    pub address: String,
    #[serde(rename = "weightBps")]
    pub weight_bps: u64,
}

#[derive(CandidType, Deserialize)]
pub struct ExecuteInheritanceArgs {
    #[serde(rename = "vaultId")]
    pub vault_id: VaultId,
    #[serde(rename = "keyId")]
    pub key_id: String,
    pub heirs: Vec<HeirRecord>,
    #[serde(rename = "guardian_submissions")]
    pub guardian_submissions: u64,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct ExecuteInheritanceResponse {
    #[serde(rename = "txId")]
    pub tx_id: String,
}

#[derive(Debug, Error)]
enum BitcoinWalletError {
    #[error("vault {0} not registered")]
    VaultNotFound(VaultId),
    #[error("vault {0} already has a registered wallet")]
    VaultAlreadyExists(VaultId),
    #[error("invalid heir configuration")]
    InvalidHeirs,
    #[error("no spendable UTXOs for vault {0}")]
    NoUtxos(VaultId),
    #[error("insufficient funds after accounting for fees")]
    InsufficientFunds,
    #[error("fee estimation unavailable")]
    FeeEstimationUnavailable,
    #[error("cryptographic failure: {0}")]
    Crypto(String),
    #[error("bitcoin network error: {0}")]
    Network(String),
}

impl From<BitcoinWalletError> for String {
    fn from(value: BitcoinWalletError) -> Self {
        value.to_string()
    }
}

#[init]
fn init() {
    STATE.with(|state| state.replace(VaultWalletState::default()));
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|state| {
        storage::stable_save((state.borrow().clone(),)).expect("failed to persist wallet state");
    });
}

#[post_upgrade]
fn post_upgrade() {
    let restored: Result<(VaultWalletState,), _> = storage::stable_restore();
    let state = restored.map(|r| r.0).unwrap_or_default();
    STATE.with(|s| s.replace(state));
}

#[update]
async fn generate_vault_address(
    args: GenerateVaultAddressArgs,
) -> Result<BitcoinAddressResponse, String> {
    if let Some(existing) = with_state(|state| state.wallets.get(&args.vault_id).cloned()) {
        return Ok(BitcoinAddressResponse {
            address: existing.address,
            key_id: existing.key_id,
        });
    }

    let derivation_path = vec![args.vault_id.to_be_bytes().to_vec()];
    let key_id = EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: args.key_id.clone(),
    };

    let pubkey_response = ecdsa_public_key(&EcdsaPublicKeyArgs {
        canister_id: Some(api::canister_self()),
        derivation_path: derivation_path.clone(),
        key_id: key_id.clone(),
    })
    .await
    .map_err(|err| BitcoinWalletError::Crypto(format!("ecdsa_public_key failed: {err:?}")))?;

    let public_key = PublicKey::from_slice(&pubkey_response.public_key)
        .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
    let segwit_address = Address::p2wpkh(&public_key, BTC_NETWORK)
        .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;

    let wallet = VaultWallet {
        key_id: args.key_id.clone(),
        derivation_path,
        address: segwit_address.to_string(),
        script_pub_key: segwit_address.script_pubkey().to_bytes(),
        public_key: pubkey_response.public_key.clone(),
        network: BTC_CANISTER_NETWORK,
    };

    mutate_state(|state| -> Result<(), BitcoinWalletError> {
        if state.wallets.contains_key(&args.vault_id) {
            return Err(BitcoinWalletError::VaultAlreadyExists(args.vault_id));
        }
        state.wallets.insert(args.vault_id, wallet.clone());
        Ok(())
    })
    .map_err(String::from)?;

    Ok(BitcoinAddressResponse {
        address: wallet.address,
        key_id: args.key_id,
    })
}

#[update]
async fn execute_inheritance(
    args: ExecuteInheritanceArgs,
) -> Result<ExecuteInheritanceResponse, String> {
    ensure_valid_heirs(&args.heirs)?;
    let wallet = with_state(|state| {
        state
            .wallets
            .get(&args.vault_id)
            .cloned()
            .ok_or(BitcoinWalletError::VaultNotFound(args.vault_id))
    })?;

    if wallet.key_id != args.key_id {
        return Err(BitcoinWalletError::Crypto("mismatched key id".into()).into());
    }

    let utxo_response = bitcoin_get_utxos(&GetUtxosRequest {
        network: wallet.network,
        address: wallet.address.clone(),
        filter: Some(UtxosFilter::MinConfirmations(MIN_CONFIRMATIONS)),
    })
    .await
    .map_err(|err| BitcoinWalletError::Network(format!("bitcoin_get_utxos failed: {err:?}")))?;

    if utxo_response.utxos.is_empty() {
        return Err(BitcoinWalletError::NoUtxos(args.vault_id).into());
    }

    let managed_utxos = normalize_utxos(&utxo_response.utxos)?;
    let total_value: u64 = managed_utxos.iter().map(|u| u.value).sum();

    let fee_rate = fetch_fee_rate(wallet.network).await?;
    let estimated_fee = estimate_fee_sat(fee_rate, managed_utxos.len(), args.heirs.len())
        .ok_or(BitcoinWalletError::FeeEstimationUnavailable)?;

    if total_value <= estimated_fee {
        return Err(BitcoinWalletError::InsufficientFunds.into());
    }

    let distributable = total_value - estimated_fee;
    let payouts = allocate_payouts(distributable, &args.heirs)?;
    let outputs = build_outputs(&args.heirs, &payouts)?;

    let unsigned_tx = build_unsigned_transaction(&managed_utxos, outputs)?;
    let signed_tx = sign_transaction(unsigned_tx, &wallet, &managed_utxos).await?;

    let mut tx_bytes = Vec::new();
    signed_tx
        .consensus_encode(&mut tx_bytes)
        .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;

    bitcoin_send_transaction(&SendTransactionRequest {
        network: wallet.network,
        transaction: tx_bytes,
    })
    .await
    .map_err(|err| BitcoinWalletError::Network(format!("bitcoin_send_transaction failed: {err:?}")))?;

    Ok(ExecuteInheritanceResponse {
        tx_id: signed_tx.txid().to_string(),
    })
}

#[query]
fn wallet_view(vault_id: VaultId) -> Option<BitcoinAddressResponse> {
    with_state(|state| {
        state.wallets.get(&vault_id).map(|wallet| BitcoinAddressResponse {
            address: wallet.address.clone(),
            key_id: wallet.key_id.clone(),
        })
    })
}

fn ensure_valid_heirs(heirs: &[HeirRecord]) -> Result<(), String> {
    if heirs.is_empty() {
        return Err(BitcoinWalletError::InvalidHeirs.into());
    }
    let total: u64 = heirs.iter().map(|h| h.weight_bps).sum();
    if total != BASIS_POINTS {
        return Err(BitcoinWalletError::InvalidHeirs.into());
    }
    Ok(())
}

fn normalize_utxos(utxos: &[Utxo]) -> Result<Vec<ManagedUtxo>, BitcoinWalletError> {
    utxos
        .iter()
        .map(|utxo| {
            let txid =
                Txid::from_slice(&utxo.outpoint.txid).map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
            Ok(ManagedUtxo {
                outpoint: OutPoint::new(txid, utxo.outpoint.vout),
                value: utxo.value,
            })
        })
        .collect()
}

async fn fetch_fee_rate(network: Network) -> Result<u64, BitcoinWalletError> {
    let percentiles = bitcoin_get_current_fee_percentiles(&GetCurrentFeePercentilesRequest { network })
        .await
        .map_err(|err| BitcoinWalletError::Network(format!("fee percentiles failed: {err:?}")))?;
    if percentiles.is_empty() {
        return Ok(FALLBACK_FEE_MSAT_PER_VBYTE / 1_000);
    }
    let median_index = percentiles.len() / 2;
    let msat_per_byte = percentiles[median_index];
    let sat_per_vbyte = (msat_per_byte + 999) / 1_000;
    Ok(sat_per_vbyte.max(1))
}

fn estimate_fee_sat(rate: u64, inputs: usize, outputs: usize) -> Option<u64> {
    let vbytes = 10 + inputs * 68 + outputs * 31;
    rate.checked_mul(vbytes as u64)
}

fn allocate_payouts(total: u64, heirs: &[HeirRecord]) -> Result<Vec<u64>, BitcoinWalletError> {
    let mut allocations = Vec::with_capacity(heirs.len());
    let mut assigned = 0u64;
    for (index, heir) in heirs.iter().enumerate() {
        let amount = if index == heirs.len() - 1 {
            total
                .checked_sub(assigned)
                .ok_or_else(|| BitcoinWalletError::Crypto("payout overflow".to_string()))?
        } else {
            (total * heir.weight_bps) / BASIS_POINTS
        };
        if amount < DUST_THRESHOLD {
            return Err(BitcoinWalletError::InvalidHeirs);
        }
        assigned = assigned
            .checked_add(amount)
            .ok_or_else(|| BitcoinWalletError::Crypto("payout overflow".to_string()))?;
        allocations.push(amount);
    }
    Ok(allocations)
}

fn build_outputs(heirs: &[HeirRecord], payouts: &[u64]) -> Result<Vec<TxOut>, BitcoinWalletError> {
    heirs
        .iter()
        .zip(payouts.iter())
        .map(|(heir, amount)| {
            let address = Address::from_str(&heir.address)
                .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?
                .require_network(BTC_NETWORK)
                .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
            Ok(TxOut {
                value: Amount::from_sat(*amount),
                script_pubkey: address.script_pubkey(),
            })
        })
        .collect()
}

fn build_unsigned_transaction(utxos: &[ManagedUtxo], outputs: Vec<TxOut>) -> Result<Transaction, BitcoinWalletError> {
    let inputs = utxos
        .iter()
        .map(|utxo| TxIn {
            previous_output: utxo.outpoint,
            script_sig: ScriptBuf::new(),
            sequence: Sequence::MAX,
            witness: Witness::new(),
        })
        .collect();
    Ok(Transaction {
        version: Version(2),
        lock_time: LockTime::ZERO,
        input: inputs,
        output: outputs,
    })
}

async fn sign_transaction(
    unsigned_tx: Transaction,
    wallet: &VaultWallet,
    utxos: &[ManagedUtxo],
) -> Result<Transaction, BitcoinWalletError> {
    let mut cache = SighashCache::new(&unsigned_tx);
    let mut signed_tx = unsigned_tx.clone();
    let public_key = PublicKey::from_slice(&wallet.public_key)
        .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
    let script_code = ScriptBuf::new_p2pkh(&public_key.pubkey_hash());

    for (index, utxo) in utxos.iter().enumerate() {
        let sighash = cache
            .p2wpkh_signature_hash(
                index,
                script_code.as_script(),
                Amount::from_sat(utxo.value),
                EcdsaSighashType::All,
            )
            .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
        let digest = sighash.to_byte_array();
        let signature = sign_digest(wallet, &digest).await?;
        let mut witness = Witness::new();
        witness.push(signature);
        witness.push(public_key.to_bytes());
        signed_tx
            .input
            .get_mut(index)
            .ok_or(BitcoinWalletError::Crypto("input missing".into()))?
            .witness = witness;
    }

    Ok(signed_tx)
}

async fn sign_digest(wallet: &VaultWallet, message_hash: &[u8; 32]) -> Result<Vec<u8>, BitcoinWalletError> {
    let response = sign_with_ecdsa(&SignWithEcdsaArgs {
        message_hash: message_hash.to_vec(),
        derivation_path: wallet.derivation_path.clone(),
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: wallet.key_id.clone(),
        },
    })
    .await
    .map_err(|err| BitcoinWalletError::Crypto(format!("sign_with_ecdsa failed: {err:?}")))?;

    let secp_sig = secp256k1::ecdsa::Signature::from_compact(&response.signature)
        .map_err(|err| BitcoinWalletError::Crypto(err.to_string()))?;
    let mut der = secp_sig.serialize_der().to_vec();
    der.push(EcdsaSighashType::All as u8);
    Ok(der)
}

fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut VaultWalletState) -> R,
{
    STATE.with(|state| {
        let mut data = state.borrow_mut();
        f(&mut data)
    })
}

fn with_state<F, R>(f: F) -> R
where
    F: FnOnce(&VaultWalletState) -> R,
{
    STATE.with(|state| {
        let data = state.borrow();
        f(&data)
    })
}

#[derive(Clone)]
struct ManagedUtxo {
    outpoint: OutPoint,
    value: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allocate_payouts_distributes_full_amount() {
        let heirs = vec![
            HeirRecord {
                address: "tb1qtest000000000000000000000000000000000".into(),
                weight_bps: 6000,
            },
            HeirRecord {
                address: "tb1qtest111111111111111111111111111111111".into(),
                weight_bps: 4000,
            },
        ];
        let payouts = allocate_payouts(100_000, &heirs).expect("payouts");
        assert_eq!(payouts.into_iter().sum::<u64>(), 100_000);
    }

    #[test]
    fn estimate_fee_scales_with_inputs_outputs() {
        let low = estimate_fee_sat(5, 1, 2).unwrap();
        let high = estimate_fee_sat(5, 4, 4).unwrap();
        assert!(high > low);
    }
}
