#!/bin/bash

# Setup GitHub Secrets for Cloudflare Pages Deployment
# Usage: ./setup-github-secrets.sh

set -e

REPO="iamaman11/alegria-frontend"

echo "[INFO] Adding GitHub Secrets to $REPO..."

# 1. CLOUDFLARE_ACCOUNT_ID (this is known)
echo "[STEP 1] Adding CLOUDFLARE_ACCOUNT_ID..."
echo -n "6045b0c922c5f02ca8efe49010a2e687" | gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO" 2>&1
echo "[OK] CLOUDFLARE_ACCOUNT_ID added"

# 2. CLOUDFLARE_API_TOKEN (needs to be provided by user)
echo ""
echo "[STEP 2] Adding CLOUDFLARE_API_TOKEN..."
echo "[INFO] Create token at: https://dash.cloudflare.com/profile/api-tokens"
echo "[INFO] Paste your Cloudflare API Token:"
read -p "Enter CLOUDFLARE_API_TOKEN: " CF_TOKEN
if [ -z "$CF_TOKEN" ]; then
  echo "[ERROR] CLOUDFLARE_API_TOKEN is empty"
  exit 1
fi
echo -n "$CF_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO" 2>&1
echo "[OK] CLOUDFLARE_API_TOKEN added"

# 3. NEXT_PUBLIC_API_URL
echo ""
echo "[STEP 3] Adding NEXT_PUBLIC_API_URL..."
read -p "Enter NEXT_PUBLIC_API_URL (e.g., https://api.poshta.cloud): " API_URL
if [ -z "$API_URL" ]; then
  echo "[WARNING] NEXT_PUBLIC_API_URL is empty - skipping"
else
  echo -n "$API_URL" | gh secret set NEXT_PUBLIC_API_URL --repo "$REPO" 2>&1
  echo "[OK] NEXT_PUBLIC_API_URL added"
fi

# 4. NEXT_PUBLIC_CMS_URL
echo ""
echo "[STEP 4] Adding NEXT_PUBLIC_CMS_URL..."
read -p "Enter NEXT_PUBLIC_CMS_URL (e.g., https://cms.poshta.cloud): " CMS_URL
if [ -z "$CMS_URL" ]; then
  echo "[WARNING] NEXT_PUBLIC_CMS_URL is empty - skipping"
else
  echo -n "$CMS_URL" | gh secret set NEXT_PUBLIC_CMS_URL --repo "$REPO" 2>&1
  echo "[OK] NEXT_PUBLIC_CMS_URL added"
fi

echo ""
echo "[SUCCESS] All secrets added!"
echo ""
echo "Verify at: https://github.com/iamaman11/alegria-frontend/settings/secrets/actions"
