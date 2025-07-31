/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Obbligatorio per Netlify
  distDir: '.next',
  images: {
    unoptimized: true, // Disabilita ottimizzazione immagini
    domains: ['lh3.googleusercontent.com'], // Per avatar OAuth
  },
  experimental: {
    serverActions: true, // Se usi Server Components
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@radix-ui/react-dropdown-menu'
    ],
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // Fix per errori di memoria
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push('@supabase/supabase-js');
    return config;
  }
}

module.exports = nextConfig
