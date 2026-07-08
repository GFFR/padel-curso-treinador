import { redirect } from "next/navigation";

import { isOnboardingComplete } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface StudentContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  studentId: string;
  email: string | null;
  role: "student" | "admin";
  displayName: string | null;
  avatarPath: string | null;
}

async function loadStudentContext(): Promise<StudentContext | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("id, email, role, display_name, avatar_path")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) return null;

  return {
    supabase,
    studentId: profile.id,
    email: profile.email,
    role: profile.role,
    displayName: profile.display_name,
    avatarPath: profile.avatar_path,
  };
}

/**
 * Loads the signed-in student's profile or redirects to the login screen.
 * Incomplete onboarding (no display name) redirects to /bem-vindo.
 */
export async function requireStudent(): Promise<StudentContext> {
  const context = await loadStudentContext();
  if (!context) redirect("/entrar");
  if (!isOnboardingComplete(context)) redirect("/bem-vindo");
  return context;
}

/** For the welcome screen — requires auth but rejects already-onboarded students. */
export async function requireStudentForOnboarding(): Promise<StudentContext> {
  const context = await loadStudentContext();
  if (!context) redirect("/entrar");
  if (isOnboardingComplete(context)) redirect("/painel");
  return context;
}

export async function requireAdmin(): Promise<StudentContext> {
  const context = await requireStudent();
  if (context.role !== "admin") redirect("/painel");
  return context;
}
