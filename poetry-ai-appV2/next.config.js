/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // Disabilita TUTTE le feature sperimentali
  experimental: {
    serverActions: false,
    optimizePackageImports: []
  },
  // Configurazione immagini
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com'],
  }
}

module.exports = nextConfig
