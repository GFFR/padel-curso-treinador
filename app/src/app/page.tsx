import Link from "next/link";

const themes = [
  { code: "PDD", name: "Pedagogia e Didática do Desporto" },
  { code: "TMTD", name: "Teoria e Metodologia do Treino Desportivo" },
  { code: "FCH", name: "Funcionamento do Corpo Humano" },
  { code: "FCH — Doping", name: "Luta contra a Dopagem" },
  { code: "ED", name: "Ética no Desporto" },
  { code: "DA", name: "Desporto Adaptado" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-baseline justify-between px-6 pt-8">
        <p className="font-heading text-lg font-semibold tracking-[0.2em] uppercase">
          Padel <span className="text-court">·</span> Grau I
        </p>
        <Link
          href="/entrar"
          className="text-sm font-medium text-court hover:underline"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="rise pt-16 pb-12 sm:pt-24">
          <p className="text-sm font-medium tracking-widest text-court uppercase">
            Curso de Treinador de Padel — Grau I
          </p>
          <h1 className="font-heading mt-3 max-w-3xl text-6xl leading-[0.95] font-bold uppercase sm:text-8xl">
            Prepara o exame<span className="text-ball">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Simulações de exame e prática por tema, geradas a partir das
            apresentações das aulas e dos manuais IPDJ — com explicações e
            referências de estudo.
          </p>
        </section>

        {/* The two entry actions, laid out like the service boxes of a padel court */}
        <section aria-label="Modos de estudo" className="rise rise-2 pb-16">
          <div className="overflow-hidden rounded-xl border-2 border-court-line/90 bg-court shadow-lg">
            <div className="grid sm:grid-cols-2">
              <Link
                href="/entrar"
                className="group relative border-b-2 border-court-line/90 p-8 sm:border-r-2 sm:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-8 top-1/2 hidden border-t border-court-line/25 sm:block"
                />
                <div className="relative">
                  <h2 className="font-heading text-4xl font-semibold text-court-line uppercase group-hover:text-ball">
                    Simular exame
                  </h2>
                  <p className="mt-2 max-w-xs text-sm text-court-line/80">
                    80 perguntas, 90 minutos, escala de 0 a 20 — como no exame
                    real.
                  </p>
                </div>
              </Link>

              <Link href="/entrar" className="group relative p-8">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-8 top-1/2 hidden border-t border-court-line/25 sm:block"
                />
                <div className="relative">
                  <h2 className="font-heading text-4xl font-semibold text-court-line uppercase group-hover:text-ball">
                    Praticar por tema
                  </h2>
                  <p className="mt-2 max-w-xs text-sm text-court-line/80">
                    Sessões livres por tema, sem relógio, com resposta e
                    explicação imediatas.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Temas do curso" className="rise rise-3 pb-20">
          <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Temas do exame
          </h3>
          <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {themes.map((theme) => (
              <li
                key={theme.code}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-2"
              >
                <span className="text-muted-foreground">{theme.name}</span>
                <span className="font-heading font-semibold whitespace-nowrap text-court uppercase">
                  {theme.code}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <p>Curso de Treinador de Padel Grau I</p>
          <p>80 perguntas · 90 minutos · aprovação a 9,5</p>
        </div>
      </footer>
    </div>
  );
}
