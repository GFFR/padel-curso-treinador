import { requireStudent } from "@/lib/auth";
import { getAvatarPublicUrl } from "@/lib/profile";
import { StudentHeader } from "@/components/shared/student-header";
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
      <StudentHeader
        role={role}
        displayName={displayName!}
        email={email}
        avatarUrl={avatarUrl}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
      <SupportBubble />
    </div>
  );
}
