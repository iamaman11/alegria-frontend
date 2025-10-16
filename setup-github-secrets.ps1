# Setup GitHub Secrets for Cloudflare Pages Deployment
# Usage: .\setup-github-secrets.ps1

$repo = "iamaman11/alegria-frontend"

Write-Host "[INFO] Adding GitHub Secrets to $repo..." -ForegroundColor Green

# 1. CLOUDFLARE_ACCOUNT_ID
Write-Host "[STEP 1] Adding CLOUDFLARE_ACCOUNT_ID..." -ForegroundColor Cyan
$accountId = "6045b0c922c5f02ca8efe49010a2e687"
$accountId | gh secret set CLOUDFLARE_ACCOUNT_ID --repo $repo 2>&1
Write-Host "[OK] CLOUDFLARE_ACCOUNT_ID added" -ForegroundColor Green

# 2. CLOUDFLARE_API_TOKEN
Write-Host ""
Write-Host "[STEP 2] Adding CLOUDFLARE_API_TOKEN..." -ForegroundColor Cyan
Write-Host "[INFO] Create token at: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Yellow
$cfToken = Read-Host "Enter CLOUDFLARE_API_TOKEN"
if ([string]::IsNullOrEmpty($cfToken)) {
    Write-Host "[ERROR] CLOUDFLARE_API_TOKEN is empty" -ForegroundColor Red
    exit 1
}
$cfToken | gh secret set CLOUDFLARE_API_TOKEN --repo $repo 2>&1
Write-Host "[OK] CLOUDFLARE_API_TOKEN added" -ForegroundColor Green

# 3. NEXT_PUBLIC_API_URL
Write-Host ""
Write-Host "[STEP 3] Adding NEXT_PUBLIC_API_URL..." -ForegroundColor Cyan
$apiUrl = Read-Host "Enter NEXT_PUBLIC_API_URL (e.g., https://api.poshta.cloud)"
if ([string]::IsNullOrEmpty($apiUrl)) {
    Write-Host "[WARNING] NEXT_PUBLIC_API_URL is empty - skipping" -ForegroundColor Yellow
} else {
    $apiUrl | gh secret set NEXT_PUBLIC_API_URL --repo $repo 2>&1
    Write-Host "[OK] NEXT_PUBLIC_API_URL added" -ForegroundColor Green
}

# 4. NEXT_PUBLIC_CMS_URL
Write-Host ""
Write-Host "[STEP 4] Adding NEXT_PUBLIC_CMS_URL..." -ForegroundColor Cyan
$cmsUrl = Read-Host "Enter NEXT_PUBLIC_CMS_URL (e.g., https://cms.poshta.cloud)"
if ([string]::IsNullOrEmpty($cmsUrl)) {
    Write-Host "[WARNING] NEXT_PUBLIC_CMS_URL is empty - skipping" -ForegroundColor Yellow
} else {
    $cmsUrl | gh secret set NEXT_PUBLIC_CMS_URL --repo $repo 2>&1
    Write-Host "[OK] NEXT_PUBLIC_CMS_URL added" -ForegroundColor Green
}

Write-Host ""
Write-Host "[SUCCESS] All secrets added!" -ForegroundColor Green
Write-Host ""
Write-Host "Verify at: https://github.com/$repo/settings/secrets/actions" -ForegroundColor Cyan
