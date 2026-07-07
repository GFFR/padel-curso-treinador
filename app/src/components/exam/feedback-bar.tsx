"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  reportQuestion,
  setQuestionFeedback,
} from "@/lib/actions/feedback-actions";
import { cn } from "@/lib/utils";

/**
 * Quick thumbs + question report, shown wherever a question's outcome is
 * visible (practice reveal, exam review). ADR 0004: generated questions ship
 * with a fast feedback loop.
 */
export function FeedbackBar({
  questionId,
  attemptId,
  attemptQuestionId,
}: {
  questionId: string;
  attemptId: string | null;
  attemptQuestionId: string;
}) {
  const [vote, setVote] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function castVote(value: "thumbs_up" | "thumbs_down") {
    setVote(value);
    startTransition(() => setQuestionFeedback({ questionId, attemptId, value }));
  }

  function sendReport(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await reportQuestion({ attemptQuestionId, kind: "bug", message });
      setSent(true);
      setReporting(false);
    });
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-muted-foreground">
          Esta pergunta foi útil?
        </span>
        <button
          type="button"
          aria-label="Gosto"
          aria-pressed={vote === "thumbs_up"}
          onClick={() => castVote("thumbs_up")}
          className={cn(
            "rounded-md border px-2 py-1 text-sm transition-colors",
            vote === "thumbs_up"
              ? "border-court bg-court/10"
              : "border-border hover:bg-muted",
          )}
        >
          👍
        </button>
        <button
          type="button"
          aria-label="Não gosto"
          aria-pressed={vote === "thumbs_down"}
          onClick={() => castVote("thumbs_down")}
          className={cn(
            "rounded-md border px-2 py-1 text-sm transition-colors",
            vote === "thumbs_down"
              ? "border-destructive bg-destructive/10"
              : "border-border hover:bg-muted",
          )}
        >
          👎
        </button>
        <span className="mx-1 text-border">·</span>
        {sent ? (
          <span className="text-xs text-court">
            Reporte enviado — obrigado.
          </span>
        ) : (
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => setReporting((open) => !open)}
          >
            Reportar problema
          </button>
        )}
      </div>

      {reporting && !sent && (
        <form onSubmit={sendReport} className="mt-3 space-y-2">
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="O que está errado nesta pergunta? (resposta, explicação, fontes...)"
            className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "A enviar..." : "Enviar reporte"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setReporting(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
