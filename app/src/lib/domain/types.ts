/** Calendar-defined course themes (docs/course-material-map.md). */
export const THEME_CODES = [
  "PDD",
  "TMTD",
  "FCH",
  "FCH_DOPING",
  "ED",
  "DA",
] as const;

export type ThemeCode = (typeof THEME_CODES)[number];

/** Short codes for compact UI (results breakdown, admin tables). */
export const THEME_LABELS: Record<ThemeCode, string> = {
  PDD: "PDD",
  TMTD: "TMTD",
  FCH: "FCH",
  FCH_DOPING: "FCH — Doping",
  ED: "ED",
  DA: "DA",
};

/** Full course theme names (seed.sql / course-material-map). */
export const THEME_NAMES: Record<ThemeCode, string> = {
  PDD: "Pedagogia e Didática do Desporto",
  TMTD: "Teoria e Metodologia do Treino Desportivo",
  FCH: "Funcionamento do Corpo Humano",
  FCH_DOPING: "Luta contra a Dopagem",
  ED: "Ética no Desporto",
  DA: "Desporto Adaptado",
};

export function themeName(code: string): string {
  return THEME_NAMES[code as ThemeCode] ?? code;
}

export const SOURCE_SCOPES = ["presentations_only", "full_materials"] as const;

export type SourceScope = (typeof SOURCE_SCOPES)[number];

export type QuestionStatus =
  | "unreviewed"
  | "approved"
  | "rejected"
  | "weakly_sourced"
  | "source_conflict";

/** Statuses a student may be served (ADR 0004 + provenance doc). */
export const STUDENT_VISIBLE_STATUSES: QuestionStatus[] = [
  "unreviewed",
  "approved",
  "weakly_sourced",
];

export const EXAM_TOTAL_QUESTIONS = 80;
export const EXAM_DURATION_MINUTES = 90;
export const EXAM_OPTION_COUNT = 4;
export const PASS_SCORE = 9.5;
export const MIN_QUESTIONS_PER_THEME = 4;

/** Snapshot of one question frozen into an attempt (exam_attempt_questions.question_snapshot). */
export interface QuestionSnapshot {
  questionId: string;
  themeCode: ThemeCode;
  status: QuestionStatus;
  prompt: string;
  options: { index: number; text: string; justification?: string | null }[];
  correctOptionIndex: number;
  explanation: string;
  sourceScope: SourceScope;
  presentationAnchor: {
    materialId: string | null;
    fileName: string | null;
    page: number | null;
  } | null;
  manualReference: {
    materialId: string | null;
    fileName: string | null;
    page: number | null;
    sectionTitle: string | null;
  } | null;
}
