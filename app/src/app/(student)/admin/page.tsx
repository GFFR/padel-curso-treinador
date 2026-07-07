import { requireAdmin } from "@/lib/auth";
import { THEME_LABELS, type ThemeCode } from "@/lib/domain/types";

/**
 * Admin overview: is the system being used, and which themes need attention
 * (docs/admin-dashboard.md).
 */
export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();

  const [{ count: studentCount }, { data: exams }, { data: themeRows }] =
    await Promise.all([
      supabase
        .from("student_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("exam_attempts")
        .select("id, score_0_20, passed, submitted_at")
        .eq("mode", "exam")
        .not("submitted_at", "is", null),
      supabase
        .from("exam_attempt_questions")
        .select(
          "theme_id, course_themes ( code ), exam_attempt_answers ( is_correct ), exam_attempts!inner ( mode, submitted_at )",
        )
        .eq("exam_attempts.mode", "exam")
        .not("exam_attempts.submitted_at", "is", null),
    ]);

  const completed = exams ?? [];
  const averageScore =
    completed.length > 0
      ? completed.reduce((sum, a) => sum + Number(a.score_0_20 ?? 0), 0) /
        completed.length
      : null;
  const passRate =
    completed.length > 0
      ? Math.round(
          (completed.filter((a) => a.passed).length / completed.length) * 100,
        )
      : null;

  const byTheme = new Map<string, { correct: number; total: number }>();
  for (const row of themeRows ?? []) {
    const theme = Array.isArray(row.course_themes)
      ? row.course_themes[0]
      : row.course_themes;
    const code = theme?.code ?? "?";
    const answer = Array.isArray(row.exam_attempt_answers)
      ? row.exam_attempt_answers[0]
      : row.exam_attempt_answers;
    const stats = byTheme.get(code) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (answer?.is_correct) stats.correct += 1;
    byTheme.set(code, stats);
  }

  const tiles = [
    { label: "Alunos registados", value: String(studentCount ?? 0) },
    { label: "Exames concluídos", value: String(completed.length) },
    {
      label: "Média (0-20)",
      value:
        averageScore !== null
          ? averageScore.toLocaleString("pt-PT", { maximumFractionDigits: 1 })
          : "—",
    },
    { label: "Taxa de aprovação", value: passRate !== null ? `${passRate}%` : "—" },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-5">
            <p className="font-heading text-4xl font-bold text-court">
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Desempenho agregado por tema (exames concluídos)
        </h2>
        {byTheme.size === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda sem dados de exames.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {[...byTheme.entries()].map(([code, stats]) => {
              const percent = Math.round((stats.correct / stats.total) * 100);
              return (
                <li key={code} className="flex items-center gap-3 text-sm">
                  <span className="font-heading w-28 shrink-0 font-semibold text-court uppercase">
                    {THEME_LABELS[code as ThemeCode] ?? code}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-court"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="w-24 text-right text-muted-foreground tabular-nums">
                    {percent}% ({stats.correct}/{stats.total})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
