/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Cloudflare Pages
  // We'll use OpenNext adapter for SSR/ISR if needed

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
  eslint: {
    // Don't fail build on lint errors
    ignoreDuringBuilds: true,
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

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules (needed for some Payload packages)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
