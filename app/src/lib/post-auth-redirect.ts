import { isOnboardingComplete } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/** Post-OTP destination: welcome screen until display name is set. */
export async function getPostAuthRedirectPath(): Promise<"/painel" | "/bem-vindo"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/painel";

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("display_name")
    .eq("auth_user_id", user.id)
    .single();

  return isOnboardingComplete({ displayName: profile?.display_name ?? null })
    ? "/painel"
    : "/bem-vindo";
}
