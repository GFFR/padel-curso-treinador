"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { getProfileInitials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StudentUserMenu({
  displayName,
  email,
  avatarUrl,
  compact = false,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  compact?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={compact ? displayName : undefined}
      >
        <Avatar size="sm">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{getProfileInitials(displayName, email)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="max-w-32 truncate font-medium">{displayName}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={() => router.push("/perfil")}>
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={logout}>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
