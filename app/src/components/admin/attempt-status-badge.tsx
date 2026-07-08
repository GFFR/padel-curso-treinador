import { Badge } from "@/components/ui/badge";
import {
  ATTEMPT_STATUS_LABELS,
  type AttemptStatus,
} from "@/lib/admin/attempts";

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  if (status === "concluido") {
    return <Badge className="bg-court text-court-line">Concluído</Badge>;
  }
  if (status === "expirado") {
    return <Badge variant="destructive">Expirado</Badge>;
  }
  return <Badge className="bg-ball text-court-deep">Em curso</Badge>;
}

export function AttemptStatusLabel({ status }: { status: AttemptStatus }) {
  return <>{ATTEMPT_STATUS_LABELS[status]}</>;
}
