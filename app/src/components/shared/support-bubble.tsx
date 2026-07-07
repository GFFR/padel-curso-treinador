"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendSupportMessage } from "@/lib/actions/feedback-actions";

/**
 * Floating support bubble, available anywhere in the student area for general
 * bug reports and suggestions (docs/question-reporting.md). Question-specific
 * reports live next to each question (FeedbackBar).
 */
export function SupportBubble() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"bug" | "suggestion">("suggestion");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await sendSupportMessage({ kind, message });
      setSent(true);
      setMessage("");
    });
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-lg">
          {sent ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Mensagem enviada — obrigado!</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSent(false);
                  setOpen(false);
                }}
              >
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm font-medium">Apoio e sugestões</p>
              <div className="flex gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "suggestion"}
                    onChange={() => setKind("suggestion")}
                  />
                  Sugestão
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "bug"}
                    onChange={() => setKind("bug")}
                  />
                  Problema
                </label>
              </div>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conta-nos o que se passa..."
                className="min-h-24 w-full rounded-md border border-border bg-background p-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "A enviar..." : "Enviar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label="Apoio"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="font-heading flex size-12 items-center justify-center rounded-full bg-court text-xl font-bold text-court-line shadow-lg transition-transform hover:scale-105"
      >
        ?
      </button>
    </div>
  );
}
