# Quick Deploy Script for Alegria Frontend
# Usage: .\deploy.ps1

Write-Host "[1/3] Setting up Cloudflare credentials..." -ForegroundColor Cyan
$env:CLOUDFLARE_API_TOKEN = ""
$env:CLOUDFLARE_EMAIL = "majakojh@gmail.com"
$env:CLOUDFLARE_API_KEY = "62160ad0e9c5ad0e3ebdf7c73e183c08bb43f"

Write-Host "[2/3] Building and deploying to Cloudflare Pages..." -ForegroundColor Cyan
npm run build:deploy

Write-Host "[3/3] Deployment complete!" -ForegroundColor Green
Write-Host "Production URL: https://poshta.cloud" -ForegroundColor Green
