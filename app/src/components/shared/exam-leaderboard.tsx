import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ExamLeaderboardEntry } from "@/lib/exam-leaderboard";
import { getAvatarPublicUrl, getProfileInitials } from "@/lib/profile";
import { cn } from "@/lib/utils";

const PODIUM_ORDER = [2, 1, 3] as const;

const RANK_STYLES: Record<
  number,
  {
    podiumHeight: string;
    medal: string;
    glow: string;
    label: string;
  }
> = {
  1: {
    podiumHeight: "h-28 sm:h-36",
    medal: "bg-ball text-court-deep shadow-[0_0_24px_oklch(0.87_0.19_113_/_0.45)]",
    glow: "shadow-[0_0_40px_oklch(0.87_0.19_113_/_0.25)]",
    label: "1",
  },
  2: {
    podiumHeight: "h-20 sm:h-28",
    medal: "bg-court-line/90 text-court-deep",
    glow: "",
    label: "2",
  },
  3: {
    podiumHeight: "h-16 sm:h-24",
    medal: "bg-court/80 text-court-line",
    glow: "",
    label: "3",
  },
};

function formatScore(score: number): string {
  return score.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function LeaderboardAvatar({
  entry,
  isCurrentUser,
  size = "default",
}: {
  entry: ExamLeaderboardEntry;
  isCurrentUser: boolean;
  size?: "default" | "sm" | "lg";
}) {
  const avatarUrl = getAvatarPublicUrl(entry.avatarPath);

  return (
    <Avatar
      size={size}
      className={cn(
        "ring-2 ring-court-line/20",
        isCurrentUser && "ring-ball ring-offset-2 ring-offset-court-deep",
      )}
    >
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-court/40 text-court-line">
        {getProfileInitials(entry.displayName, null)}
      </AvatarFallback>
    </Avatar>
  );
}

function PodiumSlot({
  entry,
  currentStudentId,
}: {
  entry: ExamLeaderboardEntry | undefined;
  currentStudentId: string;
}) {
  if (!entry) {
    return <div className="flex-1" aria-hidden />;
  }

  const style = RANK_STYLES[entry.rank as 1 | 2 | 3];
  const isCurrentUser = entry.studentId === currentStudentId;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-3",
        entry.rank === 1 && "-mt-4 sm:-mt-6",
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-xs font-bold",
            style.medal,
          )}
        >
          {style.label}
        </span>
        <LeaderboardAvatar
          entry={entry}
          isCurrentUser={isCurrentUser}
          size={entry.rank === 1 ? "lg" : "default"}
        />
        <div className="text-center">
          <p className="max-w-[7rem] truncate text-sm font-semibold text-court-line">
            {entry.displayName}
            {isCurrentUser ? (
              <span className="ml-1 text-[10px] font-medium tracking-wide text-ball uppercase">
                (tu)
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              "font-heading text-3xl font-bold tabular-nums sm:text-4xl",
              entry.rank === 1 ? "text-ball" : "text-court-line",
              style.glow,
            )}
          >
            {formatScore(entry.score0to20)}
          </p>
          {entry.passed ? (
            <Badge className="mt-1 bg-ball/20 text-[10px] text-ball hover:bg-ball/20">
              Aprovado
            </Badge>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "w-full rounded-t-xl border border-court-line/30 bg-court/30 backdrop-blur-sm",
          style.podiumHeight,
        )}
        aria-hidden
      />
    </div>
  );
}

function ListRow({
  entry,
  currentStudentId,
}: {
  entry: ExamLeaderboardEntry;
  currentStudentId: string;
}) {
  const isCurrentUser = entry.studentId === currentStudentId;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isCurrentUser ? "bg-ball/10 ring-1 ring-ball/30" : "bg-court-line/5",
      )}
    >
      <span className="w-6 text-center font-heading text-lg font-bold text-court-line/60">
        {entry.rank}
      </span>
      <LeaderboardAvatar entry={entry} isCurrentUser={isCurrentUser} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-court-line">
          {entry.displayName}
          {isCurrentUser ? (
            <span className="ml-1 text-[10px] tracking-wide text-ball uppercase">(tu)</span>
          ) : null}
        </p>
        <p className="text-[11px] text-court-line/50">
          {entry.answeredCount}/{entry.totalQuestions} respondidas
        </p>
      </div>
      <div className="text-right">
        <p className="font-heading text-xl font-bold text-court-line tabular-nums">
          {formatScore(entry.score0to20)}
        </p>
        {entry.passed ? (
          <span className="text-[10px] font-medium text-ball">Aprovado</span>
        ) : null}
      </div>
    </li>
  );
}

export function ExamLeaderboard({
  entries,
  currentStudentId,
  variant = "preview",
  hasMore = false,
}: {
  entries: ExamLeaderboardEntry[];
  currentStudentId: string;
  variant?: "preview" | "full";
  hasMore?: boolean;
}) {
  const byRank = new Map(entries.map((entry) => [entry.rank, entry]));
  const podiumEntries = PODIUM_ORDER.map((rank) => byRank.get(rank));
  const listEntries = entries.filter((entry) => entry.rank > 3);
  const isFull = variant === "full";

  const subtitle = isFull
    ? "Todos os alunos com simulação concluída e mais de 90% das perguntas respondidas."
    : "Top 5 simulações concluídas com mais de 90% das perguntas respondidas.";

  const emptyMessage =
    "Ainda não há alunos classificados. Completa um exame com pelo menos 90% das perguntas respondidas para entrares na classificação.";

  return (
    <section
      aria-label="Quadro de honra"
      className="rise rise-2 relative overflow-hidden rounded-2xl border border-court/30 bg-court-deep p-6 sm:p-8"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-20 right-0 size-64 rounded-full bg-ball/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-ball" aria-hidden />
              <h2 className="font-heading text-2xl font-bold tracking-wide text-court-line uppercase sm:text-3xl">
                {isFull ? "Classificação completa" : "Quadro de Honra"}
              </h2>
            </div>
            <p className="mt-1 max-w-md text-sm text-court-line/60">{subtitle}</p>
          </div>
          <div className="hidden rounded-lg border border-court-line/15 bg-court/20 px-3 py-2 text-right sm:block">
            <p className="text-[10px] tracking-widest text-court-line/50 uppercase">Escala</p>
            <p className="font-heading text-lg font-bold text-ball">0–20</p>
            {isFull && entries.length > 0 ? (
              <p className="mt-0.5 text-[10px] text-court-line/50">
                {entries.length} {entries.length === 1 ? "aluno" : "alunos"}
              </p>
            ) : null}
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-court-line/20 bg-court/10 px-4 py-8 text-center text-sm text-court-line/60">
            {emptyMessage}
          </p>
        ) : (
          <>
            {entries.length >= 3 ? (
              <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
                {podiumEntries.map((entry, index) => (
                  <PodiumSlot
                    key={entry?.attemptId ?? `empty-${index}`}
                    entry={entry}
                    currentStudentId={currentStudentId}
                  />
                ))}
              </div>
            ) : null}

            {(listEntries.length > 0 || entries.length < 3) ? (
              <ul className={cn("space-y-2", entries.length >= 3 ? "mt-6" : "mt-8")}>
                {(entries.length < 3 ? entries : listEntries).map((entry) => (
                  <ListRow
                    key={entry.attemptId}
                    entry={entry}
                    currentStudentId={currentStudentId}
                  />
                ))}
              </ul>
            ) : null}

            {!isFull && hasMore ? (
              <div className="mt-6 border-t border-court-line/15 pt-4">
                <Link
                  href="/painel/classificacao"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-court-line/20 bg-court/20 px-4 py-3 text-sm font-medium text-court-line transition-colors hover:border-ball/40 hover:bg-ball/10 hover:text-ball"
                >
                  Ver mais
                  <ChevronRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
