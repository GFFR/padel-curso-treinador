import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Padel Grau I",
};

// Reads the session cookie when Supabase is configured — never prerender.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Only skip the login form when the session has a matching profile row —
    // a valid-but-orphaned session (e.g. profile deleted by an admin action
    // or migration) must fall through to the form instead of bouncing
    // forever against requireStudent()'s own redirect back to /entrar.
    if (user) {
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      if (profile) redirect("/painel");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-6 pt-8">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-[0.2em] uppercase"
        >
          Padel <span className="text-court">·</span> Grau I
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-heading text-5xl font-bold uppercase">
          Entrar<span className="text-ball">.</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Recebe um código por email para aceder às simulações de exame e à
          prática por tema.
        </p>
        <div className="mt-8">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              O acesso ainda não está disponível: falta configurar o backend
              (Supabase). Instruções para programadores em{" "}
              <code className="text-xs">docs/implementation/supabase-setup.md</code>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
