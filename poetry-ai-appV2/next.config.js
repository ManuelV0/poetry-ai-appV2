/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // TORNA a 'export' per Netlify
  distDir: 'out',
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
