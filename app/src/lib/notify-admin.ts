import "server-only";

import { Resend } from "resend";

export interface SupportReportNotification {
  kind: "bug" | "suggestion";
  message: string;
  studentEmail: string | null;
  questionContext?: {
    prompt?: string;
    themeCode?: string;
    selectedOptionIndex?: number | null;
  } | null;
}

function isNotifyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_NOTIFY_EMAIL);
}

function adminReportsUrl(): string {
  const base =
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return base ? `${base}/admin/reportes` : "/admin/reportes";
}

function buildEmailBody(report: SupportReportNotification): string {
  const kindLabel = report.kind === "bug" ? "Problema" : "Sugestão";
  const lines = [
    `Tipo: ${kindLabel}`,
    `Aluno: ${report.studentEmail ?? "desconhecido"}`,
    "",
    report.message,
  ];

  const ctx = report.questionContext;
  if (ctx?.prompt) {
    lines.push("", "--- Pergunta ---", `[${ctx.themeCode ?? "?"}] ${ctx.prompt}`);
    if (ctx.selectedOptionIndex != null) {
      lines.push(`Resposta do aluno: opção ${ctx.selectedOptionIndex + 1}`);
    }
  }

  lines.push("", `Ver em: ${adminReportsUrl()}`);
  return lines.join("\n");
}

/**
 * Sends an admin email when a support report is filed. Skips silently when
 * RESEND_API_KEY or ADMIN_NOTIFY_EMAIL are unset; never throws (report insert
 * must succeed even if email fails).
 */
export async function notifyAdminOfSupportReport(
  report: SupportReportNotification,
): Promise<void> {
  if (!isNotifyConfigured()) return;

  const kindLabel = report.kind === "bug" ? "Problema" : "Sugestão";
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Padel Grau I <onboarding@resend.dev>";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: process.env.ADMIN_NOTIFY_EMAIL!,
      subject: `[Padel Grau I] ${kindLabel} — apoio ao aluno`,
      text: buildEmailBody(report),
    });
  } catch (error) {
    console.error("Failed to send support report notification:", error);
  }
}
