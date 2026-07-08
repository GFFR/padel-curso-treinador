import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

export default async function AdminStudentsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: students }, { data: attempts }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("exam_attempts")
      .select("student_id, mode, score_0_20, submitted_at")
      .not("submitted_at", "is", null),
  ]);

  const examStatsByStudent = new Map<string, { count: number; totalScore: number }>();
  const practiceStatsByStudent = new Map<string, { count: number; totalScore: number }>();

  for (const attempt of attempts ?? []) {
    const map =
      attempt.mode === "practice" ? practiceStatsByStudent : examStatsByStudent;
    const stats = map.get(attempt.student_id) ?? { count: 0, totalScore: 0 };
    stats.count += 1;
    stats.totalScore += Number(attempt.score_0_20 ?? 0);
    map.set(attempt.student_id, stats);
  }

  return (
    <section>
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {students?.length ?? 0} alunos registados
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Registo</th>
              <th className="py-2 pr-4 font-medium">Exames</th>
              <th className="py-2 pr-4 font-medium">Média exames</th>
              <th className="py-2 pr-4 font-medium">Práticas</th>
              <th className="py-2 pr-4 font-medium">Média prática</th>
              <th className="py-2 pr-4 font-medium">Tentativas</th>
              <th className="py-2 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).map((student) => {
              const examStats = examStatsByStudent.get(student.id);
              const practiceStats = practiceStatsByStudent.get(student.id);
              return (
                <tr key={student.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/tentativas?aluno=${student.id}`}
                      className="hover:text-court hover:underline"
                    >
                      {student.email ?? "—"}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{examStats?.count ?? 0}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {examStats
                      ? (examStats.totalScore / examStats.count).toLocaleString("pt-PT", {
                          maximumFractionDigits: 1,
                        })
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {practiceStats?.count ?? 0}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {practiceStats
                      ? (practiceStats.totalScore / practiceStats.count).toLocaleString(
                          "pt-PT",
                          { maximumFractionDigits: 1 },
                        )
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/tentativas?aluno=${student.id}`}
                      className="text-court hover:underline"
                    >
                      Ver todas
                    </Link>
                  </td>
                  <td className="py-2 text-muted-foreground">{student.role}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
