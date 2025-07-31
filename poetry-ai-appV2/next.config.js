/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com']
  },
  // Disabilita tutte le feature sperimentali
  experimental: {
    serverActions: false,
    optimizePackageImports: []
  }
}

module.exports = nextConfig
