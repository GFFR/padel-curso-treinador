import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";

interface ReportedContext {
  prompt?: string;
  themeCode?: string;
  selectedOptionIndex?: number | null;
}

export default async function AdminReportsPage() {
  const { supabase } = await requireAdmin();

  const { data: reports } = await supabase
    .from("support_reports")
    .select(
      "id, kind, message, question_context, created_at, student_profiles ( email )",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {reports?.length ?? 0} mensagens de apoio (mais recentes)
      </h2>

      {(reports ?? []).map((report) => {
        const student = Array.isArray(report.student_profiles)
          ? report.student_profiles[0]
          : report.student_profiles;
        const context = report.question_context as ReportedContext | null;
        return (
          <article
            key={report.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={report.kind === "bug" ? "destructive" : "secondary"}>
                {report.kind === "bug" ? "Problema" : "Sugestão"}
              </Badge>
              {context && <Badge variant="outline">Pergunta</Badge>}
              <span>
                {new Date(report.created_at).toLocaleString("pt-PT", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span>· {student?.email ?? "aluno desconhecido"}</span>
            </div>
            <p className="mt-3 text-sm">{report.message}</p>
            {context?.prompt && (
              <div className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                <p className="font-medium">
                  [{context.themeCode}] {context.prompt}
                </p>
                {context.selectedOptionIndex != null && (
                  <p className="mt-1">
                    Resposta do aluno: opção {context.selectedOptionIndex + 1}
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
