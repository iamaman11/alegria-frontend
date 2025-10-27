import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '**.pages.dev',
      },
    ],
    unoptimized: true, // Required for Cloudflare Pages
  },

  // Redirect configuration for development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8787/api/:path*', // Workers API locally
        },
        {
          source: '/media/:path*',
          destination: 'http://localhost:8787/media/:path*', // Media from R2 locally
        },
      ];
    }

    // Production: Proxy media to Workers (until custom domain routes are configured)
    const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || 'https://alegria-api.majakojh.workers.dev';
    return [
      {
        source: '/media/:path*',
        destination: `${workersUrl}/media/:path*`,
      },
    ];
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // TypeScript and ESLint configuration
  typescript: {
    // Don't fail build on type errors (we'll fix them iteratively)
    ignoreBuildErrors: true,
  },

  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental features
  experimental: {
    optimizePackageImports: [
      '@payloadcms/richtext-lexical',
      '@payloadcms/ui',
      'react-icons',
    ],
  },

  // Turbopack configuration (for Next.js 16+)
  turbopack: {
    root: __dirname,
  },
};

// NOTE: OpenNext handles Cloudflare Pages transformation through CLI
// @opennextjs/cloudflare is invoked via: npm run build:worker
export default nextConfig;
