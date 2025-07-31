import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ensure bcryptjs runs in Node.js runtime (not Edge)
  serverExternalPackages: ['bcryptjs'],
  
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'otbrcucsdrjvlrsdihnu.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
