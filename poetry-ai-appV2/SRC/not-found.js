export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4">Poesia non trovata</p>
      <a 
        href="/" 
        className="mt-6 inline-block text-blue-500 hover:underline"
      >
        Torna alla homepage
      </a>
    </div>
  );
}
