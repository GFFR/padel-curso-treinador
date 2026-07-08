import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getPostAuthRedirectPath } from "@/lib/post-auth-redirect";

/**
 * Handles the clickable link sent alongside the code in the "Confirm signup"
 * and "Magic Link" auth emails — a convenience alternative to typing the code
 * shown in the same email. Verifies the token server-side (establishing the
 * session cookie via the SSR client) and redirects into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const destination = await getPostAuthRedirectPath();
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link_invalido`);
}
