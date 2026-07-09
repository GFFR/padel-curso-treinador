import { QuestionStatusBadge } from "./question-status-badge";

/**
 * Question prompt with optional AI review badge. Badge sits above the prompt
 * so the text uses the full card width on narrow screens.
 */
export function QuestionPromptHeader({
  prompt,
  status,
  className,
}: {
  prompt: React.ReactNode;
  status: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <QuestionStatusBadge status={status} />
      <p className="text-base font-medium sm:text-lg">{prompt}</p>
    </div>
  );
}
