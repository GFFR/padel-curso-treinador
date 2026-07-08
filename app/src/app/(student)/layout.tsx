import Link from "next/link";

import { requireStudent } from "@/lib/auth";
import { getAvatarPublicUrl } from "@/lib/profile";
import { StudentUserMenu } from "@/components/shared/student-user-menu";
import { SupportBubble } from "@/components/shared/support-bubble";

// Session-dependent pages must never be prerendered (a build without env vars
// would otherwise freeze the redirect-to-login into static HTML).
export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { role, displayName, email, avatarPath } = await requireStudent();
  const avatarUrl = getAvatarPublicUrl(avatarPath);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/painel"
            className="font-heading text-lg font-semibold tracking-[0.2em] uppercase"
          >
            Padel <span className="text-court">·</span> Grau I
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/painel" className="hover:text-court">
              Início
            </Link>
            <Link href="/exame" className="hover:text-court">
              Novo exame
            </Link>
            <Link href="/praticar" className="hover:text-court">
              Praticar
            </Link>
            {role === "admin" && (
              <Link href="/admin" className="hover:text-court">
                Admin
              </Link>
            )}
            <StudentUserMenu
              displayName={displayName!}
              email={email}
              avatarUrl={avatarUrl}
            />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
      <SupportBubble />
    </div>
  );
}
