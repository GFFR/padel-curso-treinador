"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { answerQuestion, submitExam } from "@/lib/actions/exam-actions";
import { cn } from "@/lib/utils";
import { themeName } from "@/lib/domain/types";
import { OPTION_LETTERS, type RunnerQuestion } from "./types";
import { QuestionPromptHeader } from "./question-prompt-header";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExamRunner({
  attemptId,
  expiresAt,
  questions: initialQuestions,
}: {
  attemptId: string;
  expiresAt: string;
  questions: RunnerQuestion[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [current, setCurrent] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [remaining, setRemaining] = useState(
    () => new Date(expiresAt).getTime() - Date.now(),
  );
  const [isSubmitting, startSubmit] = useTransition();
  const autoSubmitted = useRef(false);
  const paginationRef = useRef<HTMLDivElement>(null);

  const answeredCount = useMemo(
    () => questions.filter((q) => q.selectedOptionIndex !== null).length,
    [questions],
  );

  // 90-minute countdown; on expiry the attempt is closed automatically.
  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        startSubmit(() => submitExam(attemptId));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, attemptId]);

  useEffect(() => {
    const active = paginationRef.current?.querySelector(
      '[aria-current="true"]',
    );
    active?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [current]);

  const question = questions[current];

  function select(optionIndex: number) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.attemptQuestionId === question.attemptQuestionId
          ? { ...q, selectedOptionIndex: optionIndex }
          : q,
      ),
    );
    // Fire-and-forget persistence; the answer can be changed until submission.
    void answerQuestion({
      attemptQuestionId: question.attemptQuestionId,
      selectedOptionIndex: optionIndex,
      mode: "exam",
    });
  }

  const lowTime = remaining < 5 * 60 * 1000;

  return (
    <div className="space-y-5 pb-safe-fab sm:space-y-8 sm:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Pergunta {current + 1} de {questions.length} · {answeredCount}{" "}
          respondidas
        </p>
        <p
          aria-live={lowTime ? "polite" : "off"}
          className={cn(
            "font-heading text-2xl font-semibold tabular-nums sm:text-3xl",
            lowTime ? "text-destructive" : "text-court",
          )}
        >
          {formatRemaining(remaining)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-8">
        <QuestionPromptHeader
          themeName={themeName(question.themeCode)}
          prompt={question.prompt}
          status={question.status}
        />
        <div className="mt-6 space-y-2">
          {question.options.map((option) => {
            const selected = question.selectedOptionIndex === option.index;
            return (
              <button
                key={option.index}
                type="button"
                onClick={() => select(option.index)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-court bg-court/10"
                    : "border-border hover:border-court/50 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "font-heading mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold sm:size-6",
                    selected
                      ? "border-court bg-court text-court-line"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {OPTION_LETTERS[option.index]}
                </span>
                <span className="text-sm leading-relaxed">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <nav
        aria-label="Navegação de perguntas"
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
      >
        <div ref={paginationRef} className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {questions.map((q, index) => (
            <button
              key={q.attemptQuestionId}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Pergunta ${index + 1}`}
              aria-current={index === current}
              className={cn(
                "size-9 shrink-0 rounded-md border text-xs font-medium tabular-nums transition-colors sm:size-8",
                index === current
                  ? "border-court bg-court text-court-line"
                  : q.selectedOptionIndex !== null
                    ? "border-court/40 bg-court/10 text-court"
                    : "border-border text-muted-foreground hover:border-court/40",
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </nav>

      <div className="sticky bottom-safe-nav z-40 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((i) => i - 1)}
          >
            Anterior
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((i) => i + 1)}>Seguinte</Button>
          ) : confirmSubmit ? (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">
                {answeredCount < questions.length
                  ? `${questions.length - answeredCount} por responder — contam como erradas.`
                  : "Entregar o exame?"}
              </span>
              <Button
                disabled={isSubmitting}
                onClick={() => startSubmit(() => submitExam(attemptId))}
              >
                {isSubmitting ? "A entregar..." : "Confirmar entrega"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmSubmit(true)}>Entregar exame</Button>
          )}
        </div>
      </div>
    </div>
  );
}
