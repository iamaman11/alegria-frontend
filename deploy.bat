@echo off
set CLOUDFLARE_API_TOKEN=yOUPX80kVJ3kG4ZmULsQoEjIJwJcDX7aSF70elVm
cd .open-next
npx wrangler pages deploy . --project-name=alegria --commit-dirty=true
