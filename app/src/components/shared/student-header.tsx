"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { StudentUserMenu } from "@/components/shared/student-user-menu";

const BASE_LINKS = [
  { href: "/painel", label: "Início" },
  { href: "/exame", label: "Novo exame" },
  { href: "/praticar", label: "Praticar" },
] as const;

export function StudentHeader({
  role,
  displayName,
  email,
  avatarUrl,
}: {
  role: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links =
    role === "admin"
      ? [...BASE_LINKS, { href: "/admin", label: "Admin" }]
      : [...BASE_LINKS];

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/painel"
          className="font-heading shrink-0 text-base font-semibold tracking-[0.12em] whitespace-nowrap uppercase sm:text-lg sm:tracking-[0.2em]"
        >
          Padel <span className="text-court">·</span> Grau I
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-court">
              {link.label}
            </Link>
          ))}
          <StudentUserMenu
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
          />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <StudentUserMenu
            compact
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
          />
          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 hover:bg-muted"
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Navegação principal"
          className="border-t border-border px-4 py-3 md:hidden"
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
