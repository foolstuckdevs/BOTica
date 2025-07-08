import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  images: {
    domains: ['otbrcucsdrjvlrsdihnu.supabase.co'],
  },
};

export default nextConfig;
