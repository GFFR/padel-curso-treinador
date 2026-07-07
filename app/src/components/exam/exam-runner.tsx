"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { answerQuestion, submitExam } from "@/lib/actions/exam-actions";
import { cn } from "@/lib/utils";
import { OPTION_LETTERS, type RunnerQuestion } from "./types";
import { QuestionStatusBadge } from "./question-status-badge";

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Pergunta {current + 1} de {questions.length} · {answeredCount}{" "}
            respondidas
          </p>
        </div>
        <p
          aria-live={lowTime ? "polite" : "off"}
          className={cn(
            "font-heading text-3xl font-semibold tabular-nums",
            lowTime ? "text-destructive" : "text-court",
          )}
        >
          {formatRemaining(remaining)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-medium">{question.prompt}</p>
          <QuestionStatusBadge status={question.status} />
        </div>
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
                    "font-heading mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    selected
                      ? "border-court bg-court text-court-line"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {OPTION_LETTERS[option.index]}
                </span>
                <span className="text-sm">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
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
          <div className="flex items-center gap-3">
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

      <nav aria-label="Navegação de perguntas" className="flex flex-wrap gap-1.5">
        {questions.map((q, index) => (
          <button
            key={q.attemptQuestionId}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Pergunta ${index + 1}`}
            aria-current={index === current}
            className={cn(
              "size-8 rounded-md border text-xs font-medium tabular-nums transition-colors",
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
      </nav>
    </div>
  );
}
