import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { setQuestionStatus } from "@/lib/actions/admin-actions";
import { OPTION_LETTERS } from "@/components/exam/types";

const STATUS_LABELS: Record<string, string> = {
  unreviewed: "Por rever",
  weakly_sourced: "Fonte fraca",
  source_conflict: "Conflito de fontes",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

/**
 * Review queue: questions needing attention (unreviewed, weakly sourced,
 * source conflicts) plus signals from students (thumbs-down, reports).
 */
export default async function AdminQuestionsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: questions }, { data: feedback }, { data: reports }] =
    await Promise.all([
      supabase
        .from("questions")
        .select(
          "id, prompt, explanation, status, quality_flags, correct_option_index, course_themes ( code ), question_options ( option_index, text )",
        )
        .in("status", ["unreviewed", "weakly_sourced", "source_conflict"])
        .order("created_at")
        .limit(50),
      supabase.from("question_feedback").select("question_id, value"),
      supabase
        .from("support_reports")
        .select("question_id")
        .not("question_id", "is", null),
    ]);

  const thumbsDown = new Map<string, number>();
  for (const row of feedback ?? []) {
    if (row.value === "thumbs_down") {
      thumbsDown.set(row.question_id, (thumbsDown.get(row.question_id) ?? 0) + 1);
    }
  }
  const reportCount = new Map<string, number>();
  for (const row of reports ?? []) {
    reportCount.set(row.question_id, (reportCount.get(row.question_id) ?? 0) + 1);
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {questions?.length ?? 0} perguntas a precisar de revisão
      </h2>

      {(questions ?? []).map((question) => {
        const theme = Array.isArray(question.course_themes)
          ? question.course_themes[0]
          : question.course_themes;
        const options = [...(question.question_options ?? [])].sort(
          (a, b) => a.option_index - b.option_index,
        );
        const approve = setQuestionStatus.bind(null, question.id, "approved");
        const reject = setQuestionStatus.bind(null, question.id, "rejected");
        const downs = thumbsDown.get(question.id) ?? 0;
        const reported = reportCount.get(question.id) ?? 0;

        return (
          <article
            key={question.id}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-2xl font-medium">{question.prompt}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{theme?.code}</Badge>
                <Badge
                  variant={
                    question.status === "source_conflict"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {STATUS_LABELS[question.status] ?? question.status}
                </Badge>
                {downs > 0 && <Badge variant="destructive">👎 {downs}</Badge>}
                {reported > 0 && (
                  <Badge variant="destructive">Reportada ×{reported}</Badge>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {options.map((option) => (
                <li
                  key={option.option_index}
                  className={
                    option.option_index === question.correct_option_index
                      ? "font-medium text-court-deep dark:text-court-line"
                      : "text-muted-foreground"
                  }
                >
                  {OPTION_LETTERS[option.option_index]}. {option.text}
                  {option.option_index === question.correct_option_index && " ✓"}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              {question.explanation}
            </p>
            {question.quality_flags?.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Flags: {question.quality_flags.join(", ")}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <form action={approve}>
                <Button type="submit" size="sm">
                  Aprovar
                </Button>
              </form>
              <form action={reject}>
                <Button type="submit" size="sm" variant="destructive">
                  Rejeitar
                </Button>
              </form>
            </div>
          </article>
        );
      })}
    </section>
  );
}
