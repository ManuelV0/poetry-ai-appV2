/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Modifica cruciale
  distDir: '.next',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disabilita TUTTE le feature sperimentali
  experimental: {
    serverActions: false,
    optimizePackageImports: []
  }
}

module.exports = nextConfig
