import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";

export default async function AdminAttemptsPage() {
  const { supabase } = await requireAdmin();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select(
      "id, source_scope, started_at, submitted_at, score_0_20, passed, student_profiles ( email )",
    )
    .eq("mode", "exam")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);

  return (
    <section>
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {attempts?.length ?? 0} exames concluídos (mais recentes)
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 pr-4 font-medium">Data</th>
              <th className="py-2 pr-4 font-medium">Aluno</th>
              <th className="py-2 pr-4 font-medium">Âmbito</th>
              <th className="py-2 pr-4 font-medium">Nota</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(attempts ?? []).map((attempt) => {
              const student = Array.isArray(attempt.student_profiles)
                ? attempt.student_profiles[0]
                : attempt.student_profiles;
              return (
                <tr key={attempt.id} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(attempt.submitted_at!).toLocaleString("pt-PT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-2 pr-4">{student?.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {attempt.source_scope === "presentations_only"
                      ? "Só apresentações"
                      : "Materiais completos"}
                  </td>
                  <td className="py-2 pr-4 font-medium tabular-nums">
                    {Number(attempt.score_0_20).toLocaleString("pt-PT", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    {attempt.passed ? (
                      <Badge className="bg-court text-court-line">Aprovado</Badge>
                    ) : (
                      <Badge variant="destructive">Reprovado</Badge>
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
    </section>
  );
}
