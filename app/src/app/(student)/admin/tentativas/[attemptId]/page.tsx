import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";

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
      "id, mode, source_scope, started_at, submitted_at, score_0_20, passed, blueprint_snapshot, student_profiles ( phone )",
    )
    .eq("id", attemptId)
    .single();
  if (!attempt) notFound();

  const student = Array.isArray(attempt.student_profiles)
    ? attempt.student_profiles[0]
    : attempt.student_profiles;
  const blueprint = attempt.blueprint_snapshot as BlueprintSnapshot | null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              {attempt.mode === "exam" ? "Simulação de exame" : "Prática"} ·{" "}
              {student?.phone ?? "aluno desconhecido"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Início {new Date(attempt.started_at).toLocaleString("pt-PT")}
              {attempt.submitted_at &&
                ` · entrega ${new Date(attempt.submitted_at).toLocaleString("pt-PT")}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {attempt.score_0_20 !== null && (
              <span className="font-heading text-4xl font-bold text-court">
                {Number(attempt.score_0_20).toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
            {attempt.passed !== null &&
              (attempt.passed ? (
                <Badge className="bg-court text-court-line">Aprovado</Badge>
              ) : (
                <Badge variant="destructive">Reprovado</Badge>
              ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Âmbito:{" "}
          {attempt.source_scope === "presentations_only"
            ? "só apresentações"
            : "materiais completos"}
        </p>
      </section>

      {blueprint && (
        <section>
          <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Blueprint da tentativa ({blueprint.totalQuestions} perguntas)
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
                {blueprint.perTheme.map((theme) => (
                  <tr key={theme.code} className="border-b border-border/60">
                    <td className="font-heading py-2 pr-4 font-semibold text-court uppercase">
                      {theme.code}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{theme.target}</td>
                    <td className="py-2 pr-4 tabular-nums">{theme.selected}</td>
                    <td className="py-2 tabular-nums">
                      {theme.shortfall > 0 ? (
                        <span className="text-destructive">{theme.shortfall}</span>
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
    </div>
  );
}
