import Link from "next/link";

import { requireStudent } from "@/lib/auth";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { role } = await requireStudent();

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
              Painel
            </Link>
            <Link href="/praticar" className="hover:text-court">
              Praticar
            </Link>
            {role === "admin" && (
              <Link href="/admin" className="hover:text-court">
                Admin
              </Link>
            )}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
