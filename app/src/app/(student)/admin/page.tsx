import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { THEME_LABELS, type ThemeCode } from "@/lib/domain/types";

interface AttemptSummary {
  score_0_20: number | null;
  passed: boolean | null;
}

function aggregateAttempts(attempts: AttemptSummary[]) {
  const averageScore =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + Number(a.score_0_20 ?? 0), 0) /
        attempts.length
      : null;
  const passRate =
    attempts.length > 0
      ? Math.round(
          (attempts.filter((a) => a.passed).length / attempts.length) * 100,
        )
      : null;
  return { count: attempts.length, averageScore, passRate };
}

function aggregateByTheme(
  rows: {
    course_themes: { code: string } | { code: string }[] | null;
    exam_attempt_answers:
      | { is_correct: boolean | null }
      | { is_correct: boolean | null }[]
      | null;
  }[],
) {
  const byTheme = new Map<string, { correct: number; total: number }>();
  for (const row of rows) {
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
  return byTheme;
}

function MetricTiles({
  tiles,
}: {
  tiles: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-border bg-card p-5">
          <p className="font-heading text-4xl font-bold text-court">{tile.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}

function ThemePerformance({
  byTheme,
  emptyMessage,
}: {
  byTheme: Map<string, { correct: number; total: number }>;
  emptyMessage: string;
}) {
  if (byTheme.size === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
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
  );
}

/**
 * Admin overview: is the system being used, and which themes need attention
 * (docs/admin-dashboard.md).
 */
export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();

  const [
    { count: studentCount },
    { data: exams },
    { data: examThemeRows },
    { data: practices },
    { data: practiceThemeRows },
  ] = await Promise.all([
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
    supabase
      .from("exam_attempts")
      .select("id, student_id, score_0_20, passed, submitted_at")
      .eq("mode", "practice")
      .not("submitted_at", "is", null),
    supabase
      .from("exam_attempt_questions")
      .select(
        "theme_id, course_themes ( code ), exam_attempt_answers ( is_correct ), exam_attempts!inner ( mode, submitted_at )",
      )
      .eq("exam_attempts.mode", "practice")
      .not("exam_attempts.submitted_at", "is", null),
  ]);

  const examStats = aggregateAttempts(exams ?? []);
  const practiceStats = aggregateAttempts(practices ?? []);
  const examByTheme = aggregateByTheme(examThemeRows ?? []);
  const practiceByTheme = aggregateByTheme(practiceThemeRows ?? []);
  const studentsWithPractice = new Set(
    (practices ?? []).map((p) => p.student_id),
  ).size;

  const formatScore = (value: number | null) =>
    value !== null
      ? value.toLocaleString("pt-PT", { maximumFractionDigits: 1 })
      : "—";
  const formatRate = (value: number | null) =>
    value !== null ? `${value}%` : "—";

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-1">
        <MetricTiles
          tiles={[
            { label: "Alunos registados", value: String(studentCount ?? 0) },
            { label: "Exames concluídos", value: String(examStats.count) },
            { label: "Média exames (0-20)", value: formatScore(examStats.averageScore) },
            {
              label: "Taxa de aprovação (exames)",
              value: formatRate(examStats.passRate),
            },
          ]}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Desempenho agregado por tema (exames concluídos)
          </h2>
          <Link
            href="/admin/tentativas?tipo=exame"
            className="text-sm text-court hover:underline"
          >
            Ver exames →
          </Link>
        </div>
        <ThemePerformance
          byTheme={examByTheme}
          emptyMessage="Ainda sem dados de exames."
        />
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <MetricTiles
          tiles={[
            { label: "Sessões de prática concluídas", value: String(practiceStats.count) },
            {
              label: "Média prática (0-20)",
              value: formatScore(practiceStats.averageScore),
            },
            {
              label: "Taxa ≥ 9,5 (prática)",
              value: formatRate(practiceStats.passRate),
            },
            {
              label: "Alunos com prática",
              value: String(studentsWithPractice),
            },
          ]}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Desempenho agregado por tema (prática concluída)
          </h2>
          <Link
            href="/admin/tentativas?tipo=pratica"
            className="text-sm text-court hover:underline"
          >
            Ver práticas →
          </Link>
        </div>
        <ThemePerformance
          byTheme={practiceByTheme}
          emptyMessage="Ainda sem dados de prática."
        />
      </section>
    </div>
  );
}
