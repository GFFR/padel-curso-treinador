import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface StudentContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  studentId: string;
  email: string | null;
  role: "student" | "admin";
}

/**
 * Loads the signed-in student's profile or redirects to the login screen.
 * The profile row is created by a DB trigger on first OTP login (decision 0003).
 */
export async function requireStudent(): Promise<StudentContext> {
  if (!isSupabaseConfigured()) redirect("/entrar");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("id, email, role")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) redirect("/entrar");

  return {
    supabase,
    studentId: profile.id,
    email: profile.email,
    role: profile.role,
  };
}

export async function requireAdmin(): Promise<StudentContext> {
  const context = await requireStudent();
  if (context.role !== "admin") redirect("/painel");
  return context;
}
