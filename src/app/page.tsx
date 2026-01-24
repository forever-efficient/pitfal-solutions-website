export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
        Pitfal Solutions
      </h1>
      <p className="mt-4 text-xl text-neutral-600">
        Photography & Videography
      </p>
      <p className="mt-2 text-lg italic text-accent-600">
        "Swing the Gap"
      </p>

      <div className="mt-8 text-sm text-neutral-500">
        <p>Website under construction</p>
        <p className="mt-1">Aurora, CO</p>
      </div>

      <div className="mt-12">
        <a
          href="mailto:info@pitfal.solutions"
          className="btn-primary"
        >
          Get in Touch
        </a>
      </div>
    </div>
  );
}
