#!/bin/bash
set -e

NETWORK=${1:-ic}

echo "🚀 Starting ThresholdVault Deployment to $NETWORK..."

if [ "$NETWORK" == "local" ]; then
    echo "🔧 Fabricating cycles for local deployment..."
    dfx ledger fabricate-cycles --all --t 10 --network "$NETWORK"
fi

# 1. Create Canisters (Generate IDs)
echo "🏗️  Creating Canisters..."
dfx canister create --all --network "$NETWORK"

# 2. Generate Environment Variables for Frontend
echo "📝 Generating Environment Variables..."
VAULT_MGR_ID=$(dfx canister id vault_mgr --network "$NETWORK")
BITCOIN_WALLET_ID=$(dfx canister id bitcoin_wallet --network "$NETWORK")
GUARDIAN_MGR_ID=$(dfx canister id guardian_mgr --network "$NETWORK")
HEARTBEAT_TRACKER_ID=$(dfx canister id heartbeat_tracker --network "$NETWORK")
ADMIN_ID=$(dfx identity get-principal --network "$NETWORK")

if [ "$NETWORK" == "local" ]; then
  IC_HOST="http://127.0.0.1:4943"
  echo "🌍 Environment: Local"
elif [ "$NETWORK" == "playground" ]; then
  IC_HOST="https://ic0.app"
  echo "🌍 Environment: Playground (Mainnet)"
else
  IC_HOST="https://ic0.app"
  echo "🌍 Environment: Mainnet"
fi

# Create .env.production for Next.js
# We use .env.production because we are building for production
cat > pwa/.env.production <<EOF
NEXT_PUBLIC_VAULT_MGR_CANISTER_ID=$VAULT_MGR_ID
NEXT_PUBLIC_BITCOIN_WALLET_CANISTER_ID=$BITCOIN_WALLET_ID
NEXT_PUBLIC_GUARDIAN_MGR_CANISTER_ID=$GUARDIAN_MGR_ID
NEXT_PUBLIC_HEARTBEAT_TRACKER_CANISTER_ID=$HEARTBEAT_TRACKER_ID
NEXT_PUBLIC_IC_HOST=$IC_HOST
EOF

echo "   VaultMgr: $VAULT_MGR_ID"
echo "   BitcoinWallet: $BITCOIN_WALLET_ID"
echo "   GuardianMgr: $GUARDIAN_MGR_ID"
echo "   HeartbeatTracker: $HEARTBEAT_TRACKER_ID"
echo "   Admin: $ADMIN_ID"

# 3. Build Canisters (Backend)
echo "🔨 Building Canisters..."
dfx build --network "$NETWORK"

# 4. Build Frontend (Now has IDs)
echo "📦 Building PWA Frontend..."
cd pwa
npm install
npm run build
cd ..

# 5. Install Canisters (Order Matters for Dependencies)

# Install Bitcoin Wallet
echo "💾 Installing Bitcoin Wallet..."
if [ "$NETWORK" == "local" ]; then
  dfx canister install bitcoin_wallet --mode reinstall --yes --network "$NETWORK"
else
  dfx canister install bitcoin_wallet --yes --network "$NETWORK"
fi

# Install Guardian Mgr
echo "💾 Installing Guardian Manager..."
if [ "$NETWORK" == "local" ]; then
  dfx canister install guardian_mgr --mode reinstall --yes --network "$NETWORK"
else
  dfx canister install guardian_mgr --yes --network "$NETWORK"
fi

# Install Heartbeat Tracker (Depends on VaultMgr ID)
echo "💾 Installing Heartbeat Tracker..."
if [ "$NETWORK" == "local" ]; then
  dfx canister install heartbeat_tracker --argument "(principal \"$VAULT_MGR_ID\")" --mode reinstall --yes --network "$NETWORK"
else
  dfx canister install heartbeat_tracker --argument "(principal \"$VAULT_MGR_ID\")" --yes --network "$NETWORK"
fi

# Install Vault Mgr (Depends on all others)
echo "💾 Installing Vault Manager..."
if [ "$NETWORK" == "local" ]; then
  dfx canister install vault_mgr --argument "(principal \"$GUARDIAN_MGR_ID\", principal \"$BITCOIN_WALLET_ID\", principal \"$HEARTBEAT_TRACKER_ID\", principal \"$ADMIN_ID\")" --mode reinstall --yes --network "$NETWORK"
else
  dfx canister install vault_mgr --argument "(principal \"$GUARDIAN_MGR_ID\", principal \"$BITCOIN_WALLET_ID\", principal \"$HEARTBEAT_TRACKER_ID\", principal \"$ADMIN_ID\")" --yes --network "$NETWORK"
fi

# Install PWA Frontend
echo "💾 Installing PWA Frontend..."
if [ "$NETWORK" == "local" ]; then
  dfx canister install pwa_frontend --mode reinstall --yes --network "$NETWORK"
else
  dfx canister install pwa_frontend --yes --network "$NETWORK"
fi

# 6. Initialize Access Control
echo "🔐 Initializing Access Control..."
chmod +x scripts/init_access_control.sh
./scripts/init_access_control.sh "$NETWORK"

echo "✅ Deployment Complete!"
if [ "$NETWORK" == "ic" ]; then
  echo "   PWA URL: https://$(dfx canister id pwa_frontend --network ic).ic0.app"
else
  echo "   PWA URL: http://$(dfx canister id pwa_frontend --network local).localhost:4943"
fi
