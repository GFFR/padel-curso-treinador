import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionStatusBadge } from "@/components/exam/question-status-badge";
import { OPTION_LETTERS } from "@/components/exam/types";
import { requireStudent } from "@/lib/auth";
import { THEME_LABELS, type QuestionSnapshot, type ThemeCode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase } = await requireStudent();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, mode, submitted_at, score_0_20, passed")
    .eq("id", attemptId)
    .eq("mode", "exam")
    .single();
  if (!attempt) notFound();
  if (!attempt.submitted_at) redirect(`/exame/${attemptId}`);

  const { data: rows } = await supabase
    .from("exam_attempt_questions")
    .select(
      "id, position, question_snapshot, exam_attempt_answers ( selected_option_index, is_correct )",
    )
    .eq("exam_attempt_id", attemptId)
    .order("position");
  if (!rows?.length) notFound();

  const items = rows.map((row) => {
    const snapshot = row.question_snapshot as QuestionSnapshot;
    const answer = Array.isArray(row.exam_attempt_answers)
      ? row.exam_attempt_answers[0]
      : row.exam_attempt_answers;
    return {
      id: row.id,
      position: row.position,
      snapshot,
      selected: answer?.selected_option_index ?? null,
      isCorrect: answer?.is_correct ?? false,
    };
  });

  const correctCount = items.filter((item) => item.isCorrect).length;
  const percent = Math.round((correctCount / items.length) * 100);

  const byTheme = new Map<ThemeCode, { correct: number; total: number }>();
  for (const item of items) {
    const stats = byTheme.get(item.snapshot.themeCode) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (item.isCorrect) stats.correct += 1;
    byTheme.set(item.snapshot.themeCode, stats);
  }

  const score = Number(attempt.score_0_20).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
  });

  return (
    <div className="space-y-12">
      {/* Scoreboard */}
      <section className="overflow-hidden rounded-xl border-2 border-court-line/90 bg-court-deep p-8 text-court-line shadow-lg sm:p-10">
        <p className="text-sm font-medium tracking-widest text-court-line/70 uppercase">
          Resultado do exame
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <p className="font-heading text-8xl leading-none font-bold">
            {score}
            <span className="text-3xl text-court-line/60"> / 20</span>
          </p>
          {attempt.passed ? (
            <Badge className="bg-ball px-3 py-1 text-base font-semibold text-court-deep">
              Aprovado
            </Badge>
          ) : (
            <Badge className="bg-destructive px-3 py-1 text-base font-semibold text-white">
              Reprovado
            </Badge>
          )}
        </div>
        <p className="mt-4 text-sm text-court-line/80">
          {correctCount} de {items.length} respostas corretas ({percent}%).
          Aprovação a partir de 9,5 valores.
        </p>
      </section>

      {/* Per-theme performance */}
      <section aria-label="Desempenho por tema">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Desempenho por tema
        </h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[...byTheme.entries()].map(([code, stats]) => (
            <li
              key={code}
              className="flex items-baseline justify-between border-b border-border pb-2 text-sm"
            >
              <span className="font-heading font-semibold text-court uppercase">
                {THEME_LABELS[code] ?? code}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {stats.correct}/{stats.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Full review with explanations and study references */}
      <section aria-label="Revisão das perguntas" className="space-y-6">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Revisão das perguntas
        </h2>
        {items.map((item, index) => (
          <article
            key={item.id}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">
                <span className="text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>{" "}
                {item.snapshot.prompt}
              </p>
              <QuestionStatusBadge status={item.snapshot.status} />
            </div>
            <ul className="mt-4 space-y-1.5">
              {item.snapshot.options.map((option) => {
                const isCorrectOption =
                  option.index === item.snapshot.correctOptionIndex;
                const isSelected = option.index === item.selected;
                return (
                  <li
                    key={option.index}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                      isCorrectOption && "bg-court/10 font-medium text-court-deep dark:text-court-line",
                      isSelected && !isCorrectOption && "bg-destructive/10 text-destructive",
                    )}
                  >
                    <span className="font-heading font-semibold">
                      {OPTION_LETTERS[option.index]}
                    </span>
                    <span>
                      {option.text}
                      {isCorrectOption && " ✓"}
                      {isSelected && !isCorrectOption && " — a tua resposta"}
                    </span>
                  </li>
                );
              })}
              {item.selected === null && (
                <li className="px-3 py-1 text-sm text-muted-foreground italic">
                  Não respondida.
                </li>
              )}
            </ul>
            <div className="mt-4 rounded-md bg-muted/60 p-4 text-sm">
              <p>{item.snapshot.explanation}</p>
              {item.snapshot.manualReference?.fileName && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Estudo: {item.snapshot.manualReference.fileName}
                  {item.snapshot.manualReference.page &&
                    `, página ${item.snapshot.manualReference.page}`}
                  {item.snapshot.manualReference.sectionTitle &&
                    ` — ${item.snapshot.manualReference.sectionTitle}`}
                </p>
              )}
              {item.snapshot.presentationAnchor?.fileName && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Aula: {item.snapshot.presentationAnchor.fileName}
                  {item.snapshot.presentationAnchor.page &&
                    `, diapositivo ${item.snapshot.presentationAnchor.page}`}
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="flex gap-3">
        <Button render={<Link href="/painel" />}>Voltar ao painel</Button>
        <Button variant="outline" render={<Link href="/praticar" />}>
          Praticar temas fracos
        </Button>
      </div>
    </div>
  );
}
