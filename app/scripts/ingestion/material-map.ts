import path from "node:path";

import type { ThemeCode } from "@/lib/domain/types";

/**
 * File → theme mapping from docs/course-material-map.md. Paths are relative to
 * the repository root (one level above app/).
 */
export const PRESENTATIONS_DIR = "Apresentações";
export const MANUALS_DIR = "Manuais de curso IPDJ";

export interface MaterialEntry {
  themeCode: ThemeCode;
  kind: "presentation" | "manual";
  /** Path relative to the repo root. */
  relativePath: string;
}

export const MATERIAL_MAP: MaterialEntry[] = [
  // Presentations
  {
    themeCode: "PDD",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/CG1 - Federação Portuguesa Padel_Pedagogia e Didática do Desporto (completo).pdf`,
  },
  {
    themeCode: "TMTD",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/Teoria_Metodologia_TD1_26.pdf`,
  },
  {
    themeCode: "TMTD",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/Teoria_Metodologia_TD2_26.pdf`,
  },
  {
    themeCode: "TMTD",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/CG1 - Federação Portuguesa Padel - MT (2026).pdf`,
  },
  {
    themeCode: "FCH",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/CG1 - Federação Portuguesa Padel - FCH.pdf`,
  },
  {
    themeCode: "FCH_DOPING",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/FORMAÇÃO ADoP - PADEL 2025.pdf`,
  },
  {
    themeCode: "ED",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/CG1 - Federação Portuguesa Padel - Ética.pdf`,
  },
  {
    themeCode: "DA",
    kind: "presentation",
    relativePath: `${PRESENTATIONS_DIR}/CURSO_TRE_NIVEL_1_PA_007.pdf`,
  },
  // Manuals — FUNCIONAMENTO CH ANTIDOPAGEM spans FCH and FCH_DOPING: one
  // material row per theme, chunks classified by content (see classifyManualChunk).
  {
    themeCode: "PDD",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/PEDAGOGIA DIDATICA DESPORTO_GI.pdf`,
  },
  {
    themeCode: "TMTD",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/TEORIA METODOLOGIA DO TREINO_GI.pdf`,
  },
  {
    themeCode: "FCH",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf`,
  },
  {
    themeCode: "FCH_DOPING",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf`,
  },
  {
    themeCode: "ED",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/ETICA NO DESPORTO_GI.pdf`,
  },
  {
    themeCode: "DA",
    kind: "manual",
    relativePath: `${MANUALS_DIR}/DESPORTO ADAPTADO_GI.pdf`,
  },
];

const DOPING_PATTERN =
  /dopagem|doping|adop\b|wada|substâncias proibidas|métodos proibidos|autorização de utilização terapêutica|passaporte biológico/g;

/**
 * Splits the shared FCH/antidoping manual by content: a chunk dominated by
 * antidoping vocabulary belongs to FCH_DOPING, the rest stays with FCH
 * (docs/course-material-map.md implementation note).
 *
 * Every page of that manual carries a running header that mentions
 * antidopagem, so distinct-keyword presence is useless — density is the
 * signal. Measured on the real PDF: body FCH pages sit at ≤0.9 occurrences
 * per 1000 chars (header noise), the doping section (pages 37+) at ≥1.8.
 */
export function classifyManualChunk(
  fileThemeCode: ThemeCode,
  chunkText: string,
): ThemeCode {
  if (fileThemeCode !== "FCH" && fileThemeCode !== "FCH_DOPING") {
    return fileThemeCode;
  }
  const text = chunkText.toLowerCase();
  const occurrences = text.match(DOPING_PATTERN)?.length ?? 0;
  const per1000Chars = (occurrences / Math.max(text.length, 1)) * 1000;
  return occurrences >= 8 && per1000Chars >= 1.5 ? "FCH_DOPING" : "FCH";
}

export function repoRoot(): string {
  // Scripts run from app/ (package.json scripts); the materials live one level up.
  return path.resolve(process.cwd(), "..");
}

export function materialsForTheme(themeCode: ThemeCode): MaterialEntry[] {
  return MATERIAL_MAP.filter((entry) => entry.themeCode === themeCode);
}
