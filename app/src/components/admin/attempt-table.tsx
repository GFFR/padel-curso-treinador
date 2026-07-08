import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { AttemptStatusBadge } from "@/components/admin/attempt-status-badge";
import {
  computeAttemptProgress,
  resolveAttemptStatus,
} from "@/lib/admin/attempts";

interface BlueprintSnapshot {
  totalQuestions?: number;
}

export type AdminAttemptRow = {
  id: string;
  student_id: string;
  mode: "exam" | "practice";
  source_scope: string;
  started_at: string;
  submitted_at: string | null;
  expires_at?: string | null;
  score_0_20: number | null;
  passed: boolean | null;
  blueprint_snapshot: BlueprintSnapshot | null;
  student_profiles: { email: string | null } | { email: string | null }[] | null;
  course_themes?: { name: string } | { name: string }[] | null;
  exam_attempt_questions: {
    id: string;
    exam_attempt_answers:
      | {
          is_correct: boolean | null;
          selected_option_index: number | null;
        }
      | {
          is_correct: boolean | null;
          selected_option_index: number | null;
        }[]
      | null;
  }[];
};

export function AttemptTable({
  attempts,
  showMode = false,
}: {
  attempts: AdminAttemptRow[];
  showMode?: boolean;
}) {
  if (attempts.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Nenhuma tentativa encontrada.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
            <th className="py-2 pr-4 font-medium">Inùcio</th>
            <th className="py-2 pr-4 font-medium">Aluno</th>
            {showMode && <th className="py-2 pr-4 font-medium">Tipo</th>}
            <th className="py-2 pr-4 font-medium">Tema</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Progresso</th>
            <th className="py-2 pr-4 font-medium">Nota</th>
            <th className="py-2 pr-4 font-medium">Resultado</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const student = Array.isArray(attempt.student_profiles)
              ? attempt.student_profiles[0]
              : attempt.student_profiles;
            const theme = Array.isArray(attempt.course_themes)
              ? attempt.course_themes[0]
              : attempt.course_themes;
            const status = resolveAttemptStatus(attempt);
            const progress = computeAttemptProgress(
              attempt.exam_attempt_questions,
              attempt.blueprint_snapshot?.totalQuestions,
            );
            const finished = status === "concluido";

            return (
              <tr key={attempt.id} className="border-b border-border/60">
                <td className="py-2 pr-4 text-muted-foreground">
                  {new Date(attempt.started_at).toLocaleString("pt-PT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/admin/tentativas?aluno=${attempt.student_id ?? ""}`}
                    className="hover:text-court hover:underline"
                  >
                    {student?.email ?? "ù"}
                  </Link>
                </td>
                {showMode && (
                  <td className="py-2 pr-4 text-muted-foreground">
                    {attempt.mode === "exam" ? "Exame" : "Prùtica"}
                  </td>
                )}
                <td className="py-2 pr-4 text-muted-foreground">
                  {attempt.mode === "practice" ? (theme?.name ?? "ù") : "ù"}
                </td>
                <td className="py-2 pr-4">
                  <AttemptStatusBadge status={status} />
                </td>
                <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                  {progress.answered}/{progress.total} respondidas
                  {finished && (
                    <span className="block text-xs">
                      {progress.correct}/{progress.total} corretas (
                      {progress.total > 0
                        ? Math.round((progress.correct / progress.total) * 100)
                        : 0}
                      %)
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 font-medium tabular-nums">
                  {finished && attempt.score_0_20 !== null
                    ? Number(attempt.score_0_20).toLocaleString("pt-PT", {
                        minimumFractionDigits: 1,
                      })
                    : "ù"}
                </td>
                <td className="py-2 pr-4">
                  {finished && attempt.passed !== null ? (
                    attempt.passed ? (
                      <Badge className="bg-court text-court-line">Aprovado</Badge>
                    ) : (
                      <Badge variant="destructive">Reprovado</Badge>
                    )
                  ) : (
                    "ù"
                  )}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/tentativas/${attempt.id}`}
                    className="text-court underline-offset-2 hover:underline"
                  >
                    Detalhe
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
