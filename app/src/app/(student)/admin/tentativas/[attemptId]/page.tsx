import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { AttemptStatusBadge } from "@/components/admin/attempt-status-badge";
import { requireAdmin } from "@/lib/auth";
import {
  computeAttemptProgress,
  resolveAttemptStatus,
} from "@/lib/admin/attempts";
import { THEME_LABELS, type QuestionSnapshot, type ThemeCode } from "@/lib/domain/types";
import { formatStudentIdentity } from "@/lib/profile";

interface BlueprintSnapshot {
  totalQuestions: number;
  sourceScope: string;
  perTheme: { code: string; target: number; selected: number; shortfall: number }[];
}

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase } = await requireAdmin();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select(
      `
      id,
      student_id,
      mode,
      source_scope,
      started_at,
      submitted_at,
      expires_at,
      score_0_20,
      passed,
      blueprint_snapshot,
      student_profiles ( display_name, email ),
      course_themes:practice_theme_id ( name, code )
    `,
    )
    .eq("id", attemptId)
    .single();
  if (!attempt) notFound();

  const { data: rows } = await supabase
    .from("exam_attempt_questions")
    .select(
      "id, position, question_snapshot, exam_attempt_answers ( selected_option_index, is_correct )",
    )
    .eq("exam_attempt_id", attemptId)
    .order("position");

  const student = Array.isArray(attempt.student_profiles)
    ? attempt.student_profiles[0]
    : attempt.student_profiles;
  const theme = Array.isArray(attempt.course_themes)
    ? attempt.course_themes[0]
    : attempt.course_themes;
  const blueprint = attempt.blueprint_snapshot as BlueprintSnapshot | null;
  const status = resolveAttemptStatus(attempt);
  const finished = status === "concluido";

  const items = (rows ?? []).map((row) => {
    const snapshot = row.question_snapshot as QuestionSnapshot;
    const answer = Array.isArray(row.exam_attempt_answers)
      ? row.exam_attempt_answers[0]
      : row.exam_attempt_answers;
    return {
      id: row.id,
      position: row.position,
      themeCode: snapshot.themeCode,
      prompt: snapshot.prompt,
      selected: answer?.selected_option_index ?? null,
      isCorrect: answer?.is_correct ?? false,
    };
  });

  const progress = computeAttemptProgress(
    (rows ?? []).map((row) => ({
      exam_attempt_answers: row.exam_attempt_answers,
    })),
    blueprint?.totalQuestions,
  );
  const percent =
    progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;

  const byTheme = new Map<ThemeCode, { correct: number; total: number }>();
  for (const item of items) {
    const stats = byTheme.get(item.themeCode) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (item.isCorrect) stats.correct += 1;
    byTheme.set(item.themeCode, stats);
  }

  return (
    <div className="space-y-8">
      <p>
        <Link
          href={`/admin/tentativas${attempt.mode === "exam" ? "?tipo=exame" : "?tipo=pratica"}`}
          className="text-sm text-muted-foreground hover:text-court"
        >
          ← Voltar às tentativas
        </Link>
      </p>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              {attempt.mode === "exam" ? "Simulação de exame" : "Prática"}
              {theme?.name ? ` · ${theme.name}` : ""}
            </p>
            <p className="mt-1 text-sm">
              <Link
                href={`/admin/tentativas?aluno=${attempt.student_id}`}
                className="font-medium hover:text-court hover:underline"
              >
                {formatStudentIdentity({
                  displayName: student?.display_name ?? null,
                  email: student?.email ?? null,
                })}
              </Link>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Início {new Date(attempt.started_at).toLocaleString("pt-PT")}
              {attempt.submitted_at &&
                ` · conclusão ${new Date(attempt.submitted_at).toLocaleString("pt-PT")}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AttemptStatusBadge status={status} />
            {finished && attempt.score_0_20 !== null && (
              <span className="font-heading text-4xl font-bold text-court">
                {Number(attempt.score_0_20).toLocaleString("pt-PT", {
                  minimumFractionDigits: 1,
                })}
                <span className="text-lg text-muted-foreground"> / 20</span>
              </span>
            )}
            {finished && attempt.passed !== null &&
              (attempt.passed ? (
                <Badge className="bg-court text-court-line">Aprovado</Badge>
              ) : (
                <Badge variant="destructive">Reprovado</Badge>
              ))}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Âmbito</dt>
            <dd>
              {attempt.source_scope === "presentations_only"
                ? "Só apresentações"
                : "Materiais completos"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Progresso</dt>
            <dd className="tabular-nums">
              {progress.answered}/{progress.total} respondidas
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Corretas</dt>
            <dd className="tabular-nums">
              {progress.correct}/{progress.total} ({percent}%)
            </dd>
          </div>
          {attempt.mode === "exam" && attempt.expires_at && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Limite</dt>
              <dd>{new Date(attempt.expires_at).toLocaleString("pt-PT")}</dd>
            </div>
          )}
        </dl>
      </section>

      {byTheme.size > 0 && (
        <section>
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
                  {stats.correct}/{stats.total} (
                  {Math.round((stats.correct / stats.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blueprint && attempt.mode === "exam" && (
        <section>
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Blueprint ({blueprint.totalQuestions} perguntas)
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full max-w-md text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-4 font-medium">Tema</th>
                  <th className="py-2 pr-4 font-medium">Alvo</th>
                  <th className="py-2 pr-4 font-medium">Selecionadas</th>
                  <th className="py-2 font-medium">Défice</th>
                </tr>
              </thead>
              <tbody>
                {blueprint.perTheme.map((row) => (
                  <tr key={row.code} className="border-b border-border/60">
                    <td className="font-heading py-2 pr-4 font-semibold text-court uppercase">
                      {row.code}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{row.target}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.selected}</td>
                    <td className="py-2 tabular-nums">
                      {row.shortfall > 0 ? (
                        <span className="text-destructive">{row.shortfall}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Perguntas ({items.length})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Tema</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 font-medium">Pergunta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="py-2 pr-4 font-heading text-xs font-semibold text-court uppercase">
                    {THEME_LABELS[item.themeCode] ?? item.themeCode}
                  </td>
                  <td className="py-2 pr-4">
                    {item.selected === null ? (
                      <Badge variant="outline">Saltada</Badge>
                    ) : item.isCorrect ? (
                      <Badge className="bg-court text-court-line">Correta</Badge>
                    ) : (
                      <Badge variant="destructive">Incorreta</Badge>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{item.prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
