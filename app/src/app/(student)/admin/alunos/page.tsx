import { requireAdmin } from "@/lib/auth";

export default async function AdminStudentsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: students }, { data: attempts }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, phone, role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("exam_attempts")
      .select("student_id, mode, score_0_20, submitted_at")
      .eq("mode", "exam")
      .not("submitted_at", "is", null),
  ]);

  const statsByStudent = new Map<string, { count: number; totalScore: number }>();
  for (const attempt of attempts ?? []) {
    const stats = statsByStudent.get(attempt.student_id) ?? {
      count: 0,
      totalScore: 0,
    };
    stats.count += 1;
    stats.totalScore += Number(attempt.score_0_20 ?? 0);
    statsByStudent.set(attempt.student_id, stats);
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
              <th className="py-2 pr-4 font-medium">Telemóvel</th>
              <th className="py-2 pr-4 font-medium">Registo</th>
              <th className="py-2 pr-4 font-medium">Exames</th>
              <th className="py-2 pr-4 font-medium">Média (0-20)</th>
              <th className="py-2 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).map((student) => {
              const stats = statsByStudent.get(student.id);
              return (
                <tr key={student.id} className="border-b border-border/60">
                  <td className="py-2 pr-4">{student.phone ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{stats?.count ?? 0}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {stats
                      ? (stats.totalScore / stats.count).toLocaleString("pt-PT", {
                          maximumFractionDigits: 1,
                        })
                      : "—"}
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
