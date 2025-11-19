#!/bin/bash
set -e

NETWORK=${1:-ic}

# Get canister IDs
VAULT_MGR_ID=$(dfx canister id vault_mgr --network "$NETWORK")
BITCOIN_WALLET_ID=$(dfx canister id bitcoin_wallet --network "$NETWORK")
GUARDIAN_MGR_ID=$(dfx canister id guardian_mgr --network "$NETWORK")

echo "VaultMgr: $VAULT_MGR_ID"
echo "BitcoinWallet: $BITCOIN_WALLET_ID"
echo "GuardianMgr: $GUARDIAN_MGR_ID"

# Set VaultMgr as manager for BitcoinWallet
echo "Setting VaultMgr as manager for BitcoinWallet..."
dfx canister call bitcoin_wallet set_vault_manager "(principal \"$VAULT_MGR_ID\")" --network "$NETWORK"

# Set VaultMgr as manager for GuardianMgr
echo "Setting VaultMgr as manager for GuardianMgr..."
dfx canister call guardian_mgr set_vault_manager "(principal \"$VAULT_MGR_ID\")" --network "$NETWORK"

echo "Access control initialization complete."

