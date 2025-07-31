/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
    optimizePackageImports: ['@supabase/supabase-js']
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
    unoptimized: true
  },
  webpack: (config) => {
    config.externals.push('@supabase/supabase-js');
    return config;
  }
}

module.exports = nextConfig
