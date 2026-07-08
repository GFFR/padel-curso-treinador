import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { requireStudent } from "@/lib/auth";
import { startExam } from "@/lib/actions/exam-actions";
import {
  EXAM_DURATION_MINUTES,
  EXAM_TOTAL_QUESTIONS,
  PASS_SCORE,
} from "@/lib/domain/types";

export const metadata: Metadata = {
  title: "Novo exame — Padel Grau I",
};

export default async function NewExamPage() {
  const { supabase } = await requireStudent();

  const { data: themes } = await supabase
    .from("course_themes")
    .select("code, name, exam_question_target")
    .order("sort_order");

  const startFullExam = startExam.bind(null, "full_materials");

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-5xl font-bold uppercase">
          Novo exame<span className="text-ball">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Simulação completa com {EXAM_TOTAL_QUESTIONS} perguntas e{" "}
          {EXAM_DURATION_MINUTES} minutos, escala de 0 a 20. As respostas são
          reveladas no fim. Aprovação a partir de{" "}
          {PASS_SCORE.toLocaleString("pt-PT", { minimumFractionDigits: 1 })}.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-2xl font-semibold uppercase">
          Distribuição por tema
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O peso de cada tema segue as horas do calendário do curso.
        </p>
        <ul className="mt-5 divide-y divide-border">
          {(themes ?? []).map((theme) => (
            <li
              key={theme.code}
              className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {theme.code.replace("_", " — ")}
                </p>
                <p className="text-xs text-muted-foreground">{theme.name}</p>
              </div>
              <span className="text-sm whitespace-nowrap text-muted-foreground">
                {theme.exam_question_target} perguntas
              </span>
            </li>
          ))}
        </ul>
        <form action={startFullExam} className="mt-6">
          <Button type="submit">Começar exame</Button>
        </form>
      </section>
    </div>
  );
}
