/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Obbligatorio per Netlify
  distDir: 'out',
  trailingSlash: true, // Risolve 404 per i link
  images: {
    unoptimized: true, // Disabilita ottimizzazione immagini
    domains: ['lh3.googleusercontent.com'], // Per auth providers
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
    serverActions: true, // Se usi Server Components
  },
  // Generazione route statiche (adatta al tuo progetto)
  async exportPathMap() {
    const staticPaths = {
      '/': { page: '/' },
      '/auth/login': { page: '/auth/login' },
      '/auth/signup': { page: '/auth/signup' },
    };

    // Esempio per route dinamiche (scommenta se necessario)
    // const { data: poems } = await supabase.from('poems').select('id');
    // poems?.forEach(poem => {
    //   staticPaths[`/poems/${poem.id}`] = { 
    //     page: '/poems/[id]', 
    //     query: { id: poem.id } 
    //   };
    // });

    return staticPaths;
  }
}

module.exports = nextConfig;
