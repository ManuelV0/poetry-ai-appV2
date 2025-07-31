/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com'],
  },
  // Generazione automatica delle route
  async generateStaticParams() {
    const { data: poems } = await supabase.from('poems').select('id')
    return poems?.map(poem => ({ id: poem.id.toString() })) || []
  }
}

module.exports = nextConfig
