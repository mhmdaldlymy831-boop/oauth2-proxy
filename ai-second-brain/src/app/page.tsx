import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="atmosphere" aria-hidden />
      <div className="grain" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <p
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-moss-deep"
          style={{ fontVariationSettings: '"SOFT" 40, "WONK" 0.4' }}
        >
          Second Brain
        </p>
        <Link href="/brain" className="btn btn-ghost text-sm">
          Enter
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-8 md:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1
              className="animate-rise font-[family-name:var(--font-display)] text-[clamp(3.2rem,9vw,6.4rem)] leading-[0.92] tracking-[-0.04em] text-moss-deep"
              style={{
                fontVariationSettings: '"SOFT" 50, "WONK" 0.7, "opsz" 144',
              }}
            >
              Second
              <br />
              Brain
            </h1>
            <p className="animate-rise-delay mt-6 max-w-md text-lg leading-relaxed text-ink-soft md:text-xl">
              Capture what matters. Ask across everything you have saved. Keep a
              living map of your own thinking.
            </p>
            <div className="animate-rise-delay-2 mt-9 flex flex-wrap items-center gap-3">
              <Link href="/brain" className="btn btn-primary">
                Open your mind
              </Link>
              <span className="text-sm text-ink-soft/80">
                Notes · Ask · Recall
              </span>
            </div>
          </div>

          <div className="relative animate-rise-delay min-h-[320px] md:min-h-[420px]">
            <div className="hero-panel absolute inset-0 rounded-[2rem]" />
            <div className="hero-glow absolute inset-0 rounded-[2rem]" />
            <div className="relative flex h-full flex-col justify-between p-8 text-paper md:p-10">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-glow">
                  Living archive
                </p>
                <p
                  className="mt-4 max-w-sm font-[family-name:var(--font-display)] text-3xl leading-snug md:text-4xl"
                  style={{ fontVariationSettings: '"SOFT" 60, "WONK" 0.5' }}
                >
                  Every fleeting note becomes something you can ask later.
                </p>
              </div>
              <div className="space-y-3 text-sm text-glow">
                <div className="pulse-rule h-px w-24 bg-glow" />
                <p>Quick capture from anywhere.</p>
                <p>Search that understands your phrasing.</p>
                <p>Answers grounded in your own notes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
