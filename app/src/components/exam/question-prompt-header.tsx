import { QuestionStatusBadge } from "./question-status-badge";

/**
 * Question prompt with optional AI review badge. Badge sits above the prompt
 * so the text uses the full card width on narrow screens.
 */
export function QuestionPromptHeader({
  prompt,
  status,
  themeName,
  className,
}: {
  prompt: React.ReactNode;
  status: string;
  themeName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {themeName ? (
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          {themeName}
        </p>
      ) : null}
      <QuestionStatusBadge status={status} />
      <p className="text-base font-medium sm:text-lg">{prompt}</p>
    </div>
  );
}
