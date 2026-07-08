import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StudyModeChooser } from "@/components/shared/study-mode-chooser";
import { requireStudent } from "@/lib/auth";
import { startExam } from "@/lib/actions/exam-actions";

export const metadata: Metadata = {
  title: "Painel — Padel Grau I",
};

interface AttemptRow {
  id: string;
  mode: "exam" | "practice";
  started_at: string;
  submitted_at: string | null;
  score_0_20: number | null;
  passed: boolean | null;
  course_themes: { name: string } | null;
}

export default async function DashboardPage() {
  const { supabase, studentId } = await requireStudent();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select(
      "id, mode, started_at, submitted_at, score_0_20, passed, course_themes:practice_theme_id ( name )",
    )
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(8);

  const startFullExam = startExam.bind(null, "full_materials");

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-heading text-5xl font-bold uppercase">
          O teu treino<span className="text-ball">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Simula o exame completo ou pratica tema a tema. As perguntas são
          geradas a partir das apresentações das aulas e justificadas com os
          manuais IPDJ.
        </p>
      </section>

      <StudyModeChooser
        variant="student"
        startExamAction={startFullExam}
      />

      <section aria-label="Histórico">
        <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Tentativas recentes
        </h3>
        {!attempts?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda não tens tentativas. Começa com uma simulação de exame ou uma
            sessão de prática.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(attempts as unknown as AttemptRow[]).map((attempt) => {
              const date = new Date(attempt.started_at).toLocaleDateString(
                "pt-PT",
                { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
              );
              const open =
                attempt.mode === "exam" && !attempt.submitted_at;
              const href =
                attempt.mode === "exam"
                  ? open
                    ? `/exame/${attempt.id}`
                    : `/exame/${attempt.id}/resultado`
                  : `/praticar/${attempt.id}`;
              return (
                <li key={attempt.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {attempt.mode === "exam"
                          ? "Simulação de exame"
                          : `Prática — ${attempt.course_themes?.name ?? "tema"}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {attempt.mode === "exam" && attempt.submitted_at && (
                        <span className="font-heading text-lg font-semibold text-court">
                          {Number(attempt.score_0_20).toLocaleString("pt-PT", {
                            minimumFractionDigits: 1,
                          })}
                        </span>
                      )}
                      {attempt.mode === "exam" &&
                        (open ? (
                          <Badge className="bg-ball text-court-deep">Em curso</Badge>
                        ) : attempt.passed ? (
                          <Badge className="bg-court text-court-line">Aprovado</Badge>
                        ) : (
                          <Badge variant="destructive">Reprovado</Badge>
                        ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
