import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum share of questions answered (not necessarily correct) to qualify. */
export const EXAM_LEADERBOARD_ANSWER_THRESHOLD = 0.9;

export const EXAM_LEADERBOARD_SIZE = 5;

export interface ExamLeaderboardEntry {
  attemptId: string;
  studentId: string;
  displayName: string;
  avatarPath: string | null;
  score0to20: number;
  passed: boolean;
  submittedAt: string;
  answeredCount: number;
  totalQuestions: number;
  rank: number;
}

type LeaderboardRow = {
  attempt_id: string;
  student_id: string;
  display_name: string;
  avatar_path: string | null;
  score_0_20: number;
  passed: boolean;
  submitted_at: string;
  answered_count: number;
  total_questions: number;
  rank: number;
};

function mapLeaderboardRow(row: LeaderboardRow): ExamLeaderboardEntry {
  return {
    attemptId: row.attempt_id,
    studentId: row.student_id,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
    score0to20: Number(row.score_0_20),
    passed: row.passed,
    submittedAt: row.submitted_at,
    answeredCount: Number(row.answered_count),
    totalQuestions: Number(row.total_questions),
    rank: Number(row.rank),
  };
}

export async function fetchExamLeaderboard(
  supabase: SupabaseClient,
  limit = EXAM_LEADERBOARD_SIZE,
): Promise<ExamLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_exam_leaderboard", {
    p_limit: limit,
  });

  if (error) {
    console.error("get_exam_leaderboard failed:", error.message);
    return [];
  }

  return ((data ?? []) as LeaderboardRow[]).map(mapLeaderboardRow);
}
