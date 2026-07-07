"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { answerQuestion, type AnswerResult } from "@/lib/actions/exam-actions";
import { cn } from "@/lib/utils";
import { OPTION_LETTERS, type RunnerQuestion } from "./types";
import { QuestionStatusBadge } from "./question-status-badge";
import { FeedbackBar } from "./feedback-bar";

interface Reveal extends AnswerResult {
  selectedOptionIndex: number;
}

export function PracticeRunner({
  attemptId,
  themeName,
  questions,
}: {
  attemptId: string;
  themeName: string;
  questions: RunnerQuestion[];
}) {
  const [current, setCurrent] = useState(0);
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});
  const [finished, setFinished] = useState(false);
  const [isPending, startTransition] = useTransition();

  const question = questions[current];
  const reveal = reveals[question.attemptQuestionId];

  function select(optionIndex: number) {
    if (reveal || isPending) return; // one answer per question in practice
    startTransition(async () => {
      const result = await answerQuestion({
        attemptQuestionId: question.attemptQuestionId,
        selectedOptionIndex: optionIndex,
        mode: "practice",
      });
      if ("acknowledged" in result) return;
      setReveals((prev) => ({
        ...prev,
        [question.attemptQuestionId]: {
          ...result,
          selectedOptionIndex: optionIndex,
        },
      }));
    });
  }

  if (finished) {
    const answered = Object.values(reveals);
    const correct = answered.filter((r) => r.isCorrect).length;
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h1 className="font-heading text-6xl font-bold uppercase">
          {correct}/{questions.length}
        </h1>
        <p className="text-muted-foreground">
          Sessão de prática de {themeName} concluída
          {answered.length < questions.length &&
            ` (${questions.length - answered.length} perguntas saltadas)`}
          .
        </p>
        <div className="flex justify-center gap-3">
          <Button render={<Link href="/praticar" />}>Praticar outro tema</Button>
          <Button variant="outline" render={<Link href="/painel" />}>
            Voltar ao painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Prática · {themeName}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {current + 1} / {questions.length}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-medium">{question.prompt}</p>
          <QuestionStatusBadge status={question.status} />
        </div>
        <div className="mt-6 space-y-2">
          {question.options.map((option) => {
            const isSelected = reveal?.selectedOptionIndex === option.index;
            const isCorrectOption = reveal?.correctOptionIndex === option.index;
            return (
              <button
                key={option.index}
                type="button"
                disabled={!!reveal || isPending}
                onClick={() => select(option.index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  !reveal && "border-border hover:border-court/50 hover:bg-muted/50",
                  reveal && isCorrectOption && "border-court bg-court/10",
                  reveal && isSelected && !isCorrectOption && "border-destructive bg-destructive/10",
                  reveal && !isSelected && !isCorrectOption && "border-border opacity-60",
                )}
              >
                <span
                  className={cn(
                    "font-heading mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    reveal && isCorrectOption
                      ? "border-court bg-court text-court-line"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {OPTION_LETTERS[option.index]}
                </span>
                <span className="text-sm">
                  {option.text}
                  {reveal?.optionJustifications[option.index] && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {reveal.optionJustifications[option.index]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {reveal && (
          <div
            className={cn(
              "mt-6 rounded-md p-4 text-sm",
              reveal.isCorrect ? "bg-court/10" : "bg-destructive/10",
            )}
          >
            <p className="font-heading text-base font-semibold uppercase">
              {reveal.isCorrect ? "Correto!" : "Incorreto."}
            </p>
            <p className="mt-1">{reveal.explanation}</p>
            {reveal.manualReference?.fileName && (
              <p className="mt-2 text-xs text-muted-foreground">
                Estudo: {reveal.manualReference.fileName}
                {reveal.manualReference.page &&
                  `, página ${reveal.manualReference.page}`}
                {reveal.manualReference.sectionTitle &&
                  ` — ${reveal.manualReference.sectionTitle}`}
              </p>
            )}
            <FeedbackBar
              questionId={question.questionId}
              attemptId={attemptId}
              attemptQuestionId={question.attemptQuestionId}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={current === 0}
          onClick={() => setCurrent((i) => i - 1)}
        >
          Anterior
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((i) => i + 1)}>
            {reveal ? "Seguinte" : "Saltar"}
          </Button>
        ) : (
          <Button onClick={() => setFinished(true)}>Terminar sessão</Button>
        )}
      </div>
    </div>
  );
}
