import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-4">
        <h1 className="font-heading text-3xl font-bold uppercase">
          Administração
        </h1>
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/admin" className="hover:text-court">
            Visão geral
          </Link>
          <Link href="/admin/alunos" className="hover:text-court">
            Alunos
          </Link>
          <Link href="/admin/tentativas" className="hover:text-court">
            Tentativas
          </Link>
          <Link href="/admin/perguntas" className="hover:text-court">
            Perguntas
          </Link>
          <Link href="/admin/banco" className="hover:text-court">
            Banco
          </Link>
          <Link href="/admin/reportes" className="hover:text-court">
            Reportes
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
