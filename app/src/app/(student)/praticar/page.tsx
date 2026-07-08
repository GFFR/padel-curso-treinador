import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { requireStudent } from "@/lib/auth";
import { startPractice } from "@/lib/actions/exam-actions";
import { fetchActiveQuestionCountsByTheme } from "@/lib/services/bank-set-service";

export const metadata: Metadata = {
  title: "Praticar por tema — Padel Grau I",
};

export default async function PracticePage() {
  const { supabase } = await requireStudent();

  const [{ data: themes }, countByTheme] = await Promise.all([
    supabase
      .from("course_themes")
      .select("id, code, name, calendar_hours, exam_question_target")
      .order("sort_order"),
    fetchActiveQuestionCountsByTheme(supabase),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-5xl font-bold uppercase">
          Praticar por tema<span className="text-ball">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Sessões livres de 10 perguntas, sem relógio, com resposta e
          explicação imediatas. O peso de cada tema no exame segue as horas do
          calendário.
        </p>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2">
        {(themes ?? []).map((theme) => {
          const available = countByTheme.get(theme.id) ?? 0;
          const start = startPractice.bind(null, theme.id, "full_materials");
          return (
            <li
              key={theme.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6"
            >
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-heading text-2xl font-semibold uppercase">
                    {theme.code.replace("_", " — ")}
                  </h2>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {theme.exam_question_target} perguntas no exame
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{theme.name}</p>
              </div>
              <form action={start} className="mt-5">
                {available > 0 ? (
                  <Button type="submit">Praticar {theme.code.replace("_", " — ")}</Button>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Ainda sem perguntas disponíveis.
                  </p>
                )}
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
