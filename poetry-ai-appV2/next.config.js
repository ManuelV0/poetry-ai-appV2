/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Per deploy su Netlify
  experimental: {
    serverActions: true, // Se usi Server Actions
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // Per avatar OAuth
  }
}

module.exports = nextConfig