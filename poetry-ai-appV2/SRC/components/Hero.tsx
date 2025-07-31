export function Hero() {
  return (
    <section className="relative bg-gradient-to-r from-purple-900 to-indigo-800 py-20">
      <div className="container mx-auto text-center">
        <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in">
          Scopri la Poesia attraverso l'IA
        </h1>
        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
          Analisi approfondite e connessioni inaspettate tra versi
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full inline-flex">
          <Button size="lg" className="rounded-full">
            Inizia ora →
          </Button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
    </section>
  )
}