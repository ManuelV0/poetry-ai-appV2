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
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // Solo se hai route dinamiche
  async exportPathMap() {
    const paths = {
      '/': { page: '/' },
      '/auth/login': { page: '/auth/login' }
    };
    
    // Aggiungi qui le tue route dinamiche se necessario
    // Esempio per poems/[id]
    // const { data: poems } = await supabase.from('poems').select('id');
    // poems?.forEach(poem => {
    //   paths[`/poems/${poem.id}`] = { page: '/poems/[id]', query: { id: poem.id } };
    // });

    return paths;
  }
}

module.exports = nextConfig
