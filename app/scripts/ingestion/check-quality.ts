/**
 * Post-ingest quality checks against live Supabase (service role).
 *
 *   npm run ingest:check -- --theme ED --bank-set v2 --questions-per-anchor 4
 */
import { config as loadEnv } from "dotenv";

import { THEME_CODES, type ThemeCode } from "@/lib/domain/types";
import {
  createServiceClient,
  fetchAnchorCoverage,
  fetchBankSetIdByCode,
  fetchThemes,
  normalizePrompt,
} from "./db";
import { materialsForTheme } from "./material-map";
import { extractMaterialChunks, mergeTopicAnchors } from "./extract";
import { defaultQuestionsPerAnchor } from "./generate";
import { groundingScore } from "./validate-candidate";

loadEnv({ path: ".env.local" });
loadEnv();

interface CliArgs {
  theme: ThemeCode;
  bankSetCode: string;
  questionsPerAnchor: number;
  minGroundingScore: number;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const theme = (get("--theme") ?? "ED") as ThemeCode;
  if (!THEME_CODES.includes(theme)) {
    throw new Error(`Unknown theme "${theme}".`);
  }
  const qpa = get("--questions-per-anchor");
  return {
    theme,
    bankSetCode: get("--bank-set") ?? "v2",
    questionsPerAnchor: qpa ? Number(qpa) : defaultQuestionsPerAnchor(theme),
    minGroundingScore: Number(get("--min-grounding") ?? "0.05"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createServiceClient();
  const themes = await fetchThemes(supabase);
  const theme = themes.get(args.theme);
  if (!theme) throw new Error(`Theme ${args.theme} not found.`);

  const bankSetId = await fetchBankSetIdByCode(supabase, args.bankSetCode);

  const entries = materialsForTheme(args.theme);
  const rawPresentation = (
    await Promise.all(
      entries
        .filter((e) => e.kind === "presentation")
        .map((e) => extractMaterialChunks(e)),
    )
  ).flat();
  const expectedAnchors = mergeTopicAnchors(rawPresentation);
  const coverage = await fetchAnchorCoverage(supabase, theme.id, bankSetId);

  let underQuota = 0;
  console.log(
    `\nAnchor coverage (${args.theme}, bank ${args.bankSetCode}, quota ${args.questionsPerAnchor}):\n`,
  );
  for (const anchor of expectedAnchors) {
    const materialRows = coverage.filter(
      (r) => r.fileName === anchor.fileName && r.page === anchor.pageStart,
    );
    const count = materialRows.reduce((sum, r) => sum + r.count, 0);
    const status = count >= args.questionsPerAnchor ? "OK" : "UNDER";
    if (status === "UNDER") underQuota += 1;
    console.log(
      `  ${status.padEnd(6)} ${anchor.fileName} p${anchor.pageStart}-${anchor.pageEnd}: ${count}/${args.questionsPerAnchor}`,
    );
  }

  const { data: questions, error } = await supabase
    .from("questions")
    .select(
      "id, prompt, presentation_anchor_material_id, presentation_anchor_page, presentation_anchor:source_materials!questions_presentation_anchor_material_id_fkey ( file_name )",
    )
    .eq("theme_id", theme.id)
    .eq("bank_set_id", bankSetId);
  if (error) throw new Error(error.message);

  const anchorContentByKey = new Map(
    expectedAnchors.map((a) => [`${a.fileName}:${a.pageStart}`, a.content]),
  );

  let duplicatePrompts = 0;
  const seenByAnchor = new Map<string, Set<string>>();
  for (const q of questions ?? []) {
    const page = q.presentation_anchor_page as number | null;
    const material = Array.isArray(q.presentation_anchor)
      ? q.presentation_anchor[0]
      : q.presentation_anchor;
    const fileName = material?.file_name ?? "?";
    const key = `${fileName}:${page}`;
    const normalized = normalizePrompt(q.prompt);
    const set = seenByAnchor.get(key) ?? new Set();
    if (set.has(normalized)) duplicatePrompts += 1;
    set.add(normalized);
    seenByAnchor.set(key, set);
  }

  let weakGrounding = 0;
  for (const q of questions ?? []) {
    const page = q.presentation_anchor_page as number | null;
    const material = Array.isArray(q.presentation_anchor)
      ? q.presentation_anchor[0]
      : q.presentation_anchor;
    const content = anchorContentByKey.get(`${material?.file_name}:${page}`);
    if (!content || page == null) continue;
    const anchor = {
      themeCode: args.theme,
      kind: "presentation" as const,
      fileName: material?.file_name ?? "",
      relativePath: "",
      pageStart: page,
      pageEnd: page,
      content,
    };
    if (groundingScore(q.prompt, anchor) < args.minGroundingScore) {
      weakGrounding += 1;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Expected anchors: ${expectedAnchors.length}`);
  console.log(`  Under quota:      ${underQuota}`);
  console.log(`  Total questions:  ${questions?.length ?? 0}`);
  console.log(`  Duplicate prompts (same anchor): ${duplicatePrompts}`);
  console.log(`  Weak grounding:   ${weakGrounding}`);

  if (underQuota > 0 || duplicatePrompts > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
