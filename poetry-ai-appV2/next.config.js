/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rimosso completamente 'output: export'
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Abilita le Server Actions (consigliato)
  experimental: {
    serverActions: true,
  }
};

module.exports = nextConfig;
