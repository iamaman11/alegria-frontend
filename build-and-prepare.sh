#!/bin/bash
# Build and prepare OpenNext for Cloudflare Pages deployment with ISR support

set -e

echo "[INFO] Starting optimized build for Cloudflare Pages ISR..."

# Clean previous builds
echo "[INFO] Cleaning previous builds..."
rm -rf .open-next .next

echo "[INFO] Building Next.js application with OpenNext adapter..."
npm run build:worker

echo "[INFO] Preparing deployment structure..."
cd .open-next

# Copy all static assets to root for proper serving
echo "[INFO] Copying static assets to root..."
cp -r assets/* .

# Rename worker for Cloudflare Pages
echo "[INFO] Renaming worker.js to _worker.js..."
if [ -f worker.js ]; then
  mv worker.js _worker.js
else
  echo "[ERROR] worker.js not found!"
  exit 1
fi

# Create optimized routes configuration for ISR and CDN caching
echo "[INFO] Creating optimized _routes.json for ISR..."
cat > _routes.json << 'EOF'
{
  "version": 1,
  "description": "Optimized routing for ISR with CDN bypass for static assets",
  "include": ["/*"],
  "exclude": [
    "/_next/static/*",
    "/_next/image/*",
    "/favicon.ico",
    "/favicon.svg",
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap-*.xml",
    "/pages-sitemap.xml",
    "/posts-sitemap.xml",
    "/*.ico",
    "/*.svg",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.gif",
    "/*.webp",
    "/*.avif",
    "/file.svg",
    "/globe.svg",
    "/next.svg",
    "/vercel.svg",
    "/window.svg"
  ]
}
EOF

# Create headers configuration for better caching
echo "[INFO] Creating _headers file for CDN optimization..."
cat > _headers << 'EOF'
# Static assets - cache for 1 year
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/_next/image/*
  Cache-Control: public, max-age=31536000, immutable

/*.ico
  Cache-Control: public, max-age=31536000, immutable

/*.svg
  Cache-Control: public, max-age=31536000, immutable

/*.png
  Cache-Control: public, max-age=31536000, immutable

/*.jpg
  Cache-Control: public, max-age=31536000, immutable

/*.jpeg
  Cache-Control: public, max-age=31536000, immutable

/*.webp
  Cache-Control: public, max-age=31536000, immutable

/*.avif
  Cache-Control: public, max-age=31536000, immutable

# Sitemaps - cache for 1 hour
/*.xml
  Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400

# HTML pages - let ISR handle caching
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
EOF

echo "[INFO] Build complete and optimized for ISR!"
echo ""
echo "[INFO] Deployment command:"
echo "  cd .open-next && npx wrangler pages deploy . --project-name=alegria --commit-dirty=true"
echo ""
echo "[INFO] Or use npm script:"
echo "  npm run deploy"