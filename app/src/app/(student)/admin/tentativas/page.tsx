import Link from "next/link";

import {
  AttemptTable,
  type AdminAttemptRow,
} from "@/components/admin/attempt-table";
import { requireAdmin } from "@/lib/auth";
import { formatStudentIdentity } from "@/lib/profile";

const ATTEMPT_SELECT = `
  id,
  student_id,
  mode,
  source_scope,
  started_at,
  submitted_at,
  expires_at,
  score_0_20,
  passed,
  blueprint_snapshot,
  student_profiles ( display_name, email ),
  course_themes:practice_theme_id ( name ),
  exam_attempt_questions (
    id,
    exam_attempt_answers ( is_correct, selected_option_index )
  )
`;

export default async function AdminAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; aluno?: string }>;
}) {
  const { tipo, aluno } = await searchParams;
  const { supabase } = await requireAdmin();

  let studentLabel: string | null = null;
  if (aluno) {
    const { data: student } = await supabase
      .from("student_profiles")
      .select("display_name, email")
      .eq("id", aluno)
      .single();
    studentLabel = student
      ? formatStudentIdentity({
          displayName: student.display_name,
          email: student.email,
        })
      : null;
  }

  const buildQuery = (mode?: "exam" | "practice") => {
    let query = supabase
      .from("exam_attempts")
      .select(ATTEMPT_SELECT)
      .order("started_at", { ascending: false })
      .limit(100);
    if (mode) query = query.eq("mode", mode);
    if (aluno) query = query.eq("student_id", aluno);
    return query;
  };

  const showExams = !tipo || tipo === "exame";
  const showPractices = !tipo || tipo === "pratica";

  const [examsResult, practicesResult] = await Promise.all([
    showExams ? buildQuery("exam") : Promise.resolve({ data: [] }),
    showPractices ? buildQuery("practice") : Promise.resolve({ data: [] }),
  ]);

  const exams = (examsResult.data ?? []) as AdminAttemptRow[];
  const practices = (practicesResult.data ?? []) as AdminAttemptRow[];
  const allAttempts = [...exams, ...practices].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );

  const withAluno = (href: string) => {
    if (!aluno) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}aluno=${aluno}`;
  };

  const filterLinks = [
    { href: "/admin/tentativas", label: "Todas", active: !tipo },
    { href: "/admin/tentativas?tipo=exame", label: "Exames", active: tipo === "exame" },
    {
      href: "/admin/tentativas?tipo=pratica",
      label: "Práticas",
      active: tipo === "pratica",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap gap-2">
          {filterLinks.map((link) => (
            <Link
              key={link.href}
              href={withAluno(link.href)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                link.active
                  ? "border-court bg-court/10 text-court"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {aluno && (
          <Link
            href={tipo ? `/admin/tentativas?tipo=${tipo}` : "/admin/tentativas"}
            className="text-sm text-muted-foreground hover:text-court"
          >
            Limpar filtro de aluno
          </Link>
        )}
      </div>

      {aluno && (
        <p className="text-sm text-muted-foreground">
          A mostrar tentativas de{" "}
          <span className="font-medium text-foreground">
            {studentLabel ?? "aluno desconhecido"}
          </span>
          .
        </p>
      )}

      {!tipo ? (
        <AttemptTable attempts={allAttempts} showMode />
      ) : (
        <div className="space-y-12">
          {showExams && (
            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {exams.length} exames
              </h2>
              <AttemptTable attempts={exams} />
            </section>
          )}
          {showPractices && (
            <section>
              <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {practices.length} sessões de prática
              </h2>
              <AttemptTable attempts={practices} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
