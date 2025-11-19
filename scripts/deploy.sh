#!/bin/bash
set -e

echo "🚀 Starting ThresholdVault Deployment..."

# 1. Build Frontend
echo "📦 Building PWA Frontend..."
cd pwa
npm install
npm run build
cd ..

# 2. Create Canisters
echo "🏗️  Creating Canisters..."
dfx canister create --all

# 3. Build Canisters
echo "🔨 Building Canisters..."
dfx build

# 4. Get IDs and Principal
VAULT_MGR_ID=$(dfx canister id vault_mgr)
BITCOIN_WALLET_ID=$(dfx canister id bitcoin_wallet)
GUARDIAN_MGR_ID=$(dfx canister id guardian_mgr)
HEARTBEAT_TRACKER_ID=$(dfx canister id heartbeat_tracker)
ADMIN_ID=$(dfx identity get-principal)

echo "📝 Configuration:"
echo "   VaultMgr: $VAULT_MGR_ID"
echo "   BitcoinWallet: $BITCOIN_WALLET_ID"
echo "   GuardianMgr: $GUARDIAN_MGR_ID"
echo "   HeartbeatTracker: $HEARTBEAT_TRACKER_ID"
echo "   Admin: $ADMIN_ID"

# 5. Install Canisters (Order Matters for Dependencies)

# Install Bitcoin Wallet
echo "💾 Installing Bitcoin Wallet..."
dfx canister install bitcoin_wallet --mode reinstall --yes

# Install Guardian Mgr
echo "💾 Installing Guardian Manager..."
dfx canister install guardian_mgr --mode reinstall --yes

# Install Heartbeat Tracker (Depends on VaultMgr ID)
echo "💾 Installing Heartbeat Tracker..."
dfx canister install heartbeat_tracker --argument "(principal \"$VAULT_MGR_ID\")" --mode reinstall --yes

# Install Vault Mgr (Depends on all others)
echo "💾 Installing Vault Manager..."
dfx canister install vault_mgr --argument "(principal \"$GUARDIAN_MGR_ID\", principal \"$BITCOIN_WALLET_ID\", principal \"$HEARTBEAT_TRACKER_ID\", principal \"$ADMIN_ID\")" --mode reinstall --yes

# Install PWA Frontend
echo "💾 Installing PWA Frontend..."
dfx canister install pwa_frontend --mode reinstall --yes

# 6. Initialize Access Control
echo "🔐 Initializing Access Control..."
chmod +x scripts/init_access_control.sh
./scripts/init_access_control.sh

echo "✅ Deployment Complete!"
echo "   PWA URL: http://$(dfx canister id pwa_frontend).localhost:4943"
