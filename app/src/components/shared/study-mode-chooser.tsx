import Link from "next/link";
import { Layers, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EXAM_DURATION_MINUTES, EXAM_TOTAL_QUESTIONS } from "@/lib/domain/types";

const labelId = "study-mode-chooser-label";

type StudyModeChooserProps = {
  className?: string;
} & (
  | { variant: "guest" }
  | { variant: "student"; startExamAction: () => Promise<void> }
);

export function StudyModeChooser(props: StudyModeChooserProps) {
  const { className } = props;
  const isGuest = props.variant === "guest";

  return (
    <section
      aria-label="Modos de estudo"
      aria-labelledby={labelId}
      className={className}
    >
      <h3
        id={labelId}
        className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
      >
        Escolhe o modo de estudo
      </h3>
      <div className="mt-4 overflow-hidden rounded-xl border-2 border-court-line/90 bg-court shadow-lg">
        <div className="grid sm:grid-cols-2">
          <div className="group relative border-b-2 border-court-line/90 p-5 transition-colors hover:bg-court-deep/20 focus-within:bg-court-deep/20 sm:border-r-2 sm:border-b-0 sm:p-8">
            <Timer
              aria-hidden="true"
              className="mb-3 size-5 text-court-line/60"
              strokeWidth={1.75}
            />
            <h2 className="font-heading text-2xl font-semibold text-court-line uppercase sm:text-4xl">
              Simular exame
            </h2>
            <p className="mt-2 max-w-xs text-sm text-court-line/80">
              {isGuest ? (
                <>
                  80 perguntas, 90 minutos, escala de 0 a 20 — como no
                  exame real.
                </>
              ) : (
                <>
                  {EXAM_TOTAL_QUESTIONS} perguntas, {EXAM_DURATION_MINUTES}{" "}
                  minutos, escala de 0 a 20. Respostas reveladas no fim.
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-court-line/70">
              {EXAM_TOTAL_QUESTIONS} perguntas · {EXAM_DURATION_MINUTES}{" "}
              min
            </p>
            {isGuest ? (
              <Button
                render={<Link href="/entrar" />}
                className="mt-5 bg-ball font-medium text-court-deep hover:bg-ball/90"
              >
                Simular exame
              </Button>
            ) : (
              <form action={props.startExamAction} className="mt-5">
                <Button
                  type="submit"
                  className="bg-ball font-medium text-court-deep hover:bg-ball/90"
                >
                  Começar exame
                </Button>
              </form>
            )}
          </div>

          <div className="group relative p-5 transition-colors hover:bg-court-deep/20 focus-within:bg-court-deep/20 sm:p-8">
            <Layers
              aria-hidden="true"
              className="mb-3 size-5 text-court-line/60"
              strokeWidth={1.75}
            />
            <h2 className="font-heading text-2xl font-semibold text-court-line uppercase sm:text-4xl">
              Praticar por tema
            </h2>
            <p className="mt-2 max-w-xs text-sm text-court-line/80">
              {isGuest ? (
                <>
                  Sessões livres por tema, sem relógio, com
                  resposta e explicação imediatas.
                </>
              ) : (
                <>
                  Sessões livres, sem relógio, com resposta e
                  explicação imediatas.
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-court-line/70">
              Sem relógio · resposta imediata
            </p>
            <Button
              render={<Link href={isGuest ? "/entrar" : "/praticar"} />}
              className="mt-5 bg-court-line font-medium text-court hover:bg-court-line/90"
            >
              {isGuest ? "Praticar por tema" : "Escolher tema"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
