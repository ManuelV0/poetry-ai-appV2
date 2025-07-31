/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com'],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
    serverActions: false // Disabilitate per export statico
  }
}
module.exports = nextConfig

async generateStaticParams() {
  const { data: poems } = await supabase.from('poems').select('id')
  return poems?.map(poem => ({ id: poem.id.toString() })) || []
}
