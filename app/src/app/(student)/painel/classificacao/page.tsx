import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ExamLeaderboard } from "@/components/shared/exam-leaderboard";
import { requireStudent } from "@/lib/auth";
import { fetchExamLeaderboard } from "@/lib/exam-leaderboard";

export const metadata: Metadata = {
  title: "ClassificaÃ§Ã£o â Padel Grau I",
};

export default async function LeaderboardPage() {
  const { supabase, studentId } = await requireStudent();
  const entries = await fetchExamLeaderboard(supabase, null);

  return (
    <div className="space-y-6">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-court"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar ao inÃ­cio
      </Link>

      <ExamLeaderboard
        entries={entries}
        currentStudentId={studentId}
        variant="full"
      />
    </div>
  );
}
