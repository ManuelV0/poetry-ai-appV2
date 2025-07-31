/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com'],
  },
  experimental: {
    serverActions: true,
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@radix-ui/react-dropdown-menu'
    ],
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  webpack: (config) => {
    config.externals.push({
      '@supabase/supabase-js': 'supabase',
    });
    return config;
  }
}

module.exports = nextConfig
