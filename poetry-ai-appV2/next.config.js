/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: process.env.NETLIFY ? '.next' : 'out', // Differenzia locale e Netlify
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}
module.exports = nextConfig
