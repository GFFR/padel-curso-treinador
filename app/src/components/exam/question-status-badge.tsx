import { Badge } from "@/components/ui/badge";

/**
 * Unreviewed/weakly-sourced questions are served to students but must be
 * clearly marked as generated content (ADR 0004).
 */
export function QuestionStatusBadge({ status }: { status: string }) {
  if (status === "approved") return null;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Gerada por IA — por rever
    </Badge>
  );
}
