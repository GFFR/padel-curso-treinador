/**
 * Ingestion pipeline CLI v2 (docs/ingestion-pipeline.md).
 *
 *   npm run ingest -- --theme ED                       # full run (needs env keys)
 *   npm run ingest -- --theme ED --dry-run             # extraction only, no keys needed
 *   npm run ingest -- --theme ED --scope presentations_only
 *   npm run ingest -- --theme ED --bank-set v2 --questions-per-anchor 4
 *   npm run ingest -- --theme ED --anchor 0..3         # topic anchors 0..2 only
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

import { THEME_CODES, type SourceScope, type ThemeCode } from "@/lib/domain/types";
import { materialsForTheme } from "./material-map";
import {
  extractMaterialChunks,
  mergeTopicAnchors,
  type ExtractedChunk,
} from "./extract";
import {
  defaultQuestionsPerAnchor,
  generateCandidates,
  GENERATION_MODEL,
  PROMPT_VERSION,
} from "./generate";
import { matchManualChunks } from "./match-manual";
import {
  createGenerationBatch,
  createServiceClient,
  fetchBankSetIdByCode,
  fetchExistingPrompts,
  fetchThemes,
  finishGenerationBatch,
  insertCandidates,
  replaceChunks,
  upsertMaterial,
} from "./db";

loadEnv({ path: ".env.local" });
loadEnv();

interface CliArgs {
  theme: ThemeCode;
  scope: SourceScope;
  dryRun: boolean;
  bankSetCode: string;
  questionsPerAnchor: number | null;
  anchorRange: { from: number; to: number } | null;
  maxRetries: number;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const theme = (get("--theme") ?? "ED") as ThemeCode;
  if (!THEME_CODES.includes(theme)) {
    throw new Error(`Unknown theme "${theme}". Use one of: ${THEME_CODES.join(", ")}`);
  }
  const scope = (get("--scope") ?? "full_materials") as SourceScope;
  if (scope !== "full_materials" && scope !== "presentations_only") {
    throw new Error(`Unknown scope "${scope}".`);
  }
  const qpa = get("--questions-per-anchor");
  const rangeArg = get("--anchor") ?? get("--anchors");
  let anchorRange: CliArgs["anchorRange"] = null;
  if (rangeArg) {
    const match = /^(\d+)\.\.(\d+)$/.exec(rangeArg);
    if (!match) throw new Error(`--anchor expects "from..to" (0-based, end-exclusive).`);
    anchorRange = { from: Number(match[1]), to: Number(match[2]) };
  }
  const maxRetries = Number(get("--max-retries") ?? "2");
  return {
    theme,
    scope,
    dryRun: argv.includes("--dry-run"),
    bankSetCode: get("--bank-set") ?? "v2",
    questionsPerAnchor: qpa ? Number(qpa) : null,
    anchorRange,
    maxRetries,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const questionsPerAnchor =
    args.questionsPerAnchor ?? defaultQuestionsPerAnchor(args.theme);

  console.log(
    `Ingesting theme ${args.theme} (scope: ${args.scope}, bank: ${args.bankSetCode}, ` +
      `${questionsPerAnchor} Q/anchor)${args.dryRun ? " [dry-run]" : ""}`,
  );

  const entries = materialsForTheme(args.theme);
  if (entries.length === 0) throw new Error(`No materials mapped for ${args.theme}.`);

  const chunksByEntry: { entry: (typeof entries)[number]; chunks: ExtractedChunk[] }[] =
    [];
  for (const entry of entries) {
    const chunks = await extractMaterialChunks(entry);
    console.log(`  ${entry.kind}: ${path.basename(entry.relativePath)} → ${chunks.length} chunks`);
    chunksByEntry.push({ entry, chunks });
  }

  const rawPresentationChunks = chunksByEntry
    .filter(({ entry }) => entry.kind === "presentation")
    .flatMap(({ chunks }) => chunks);

  let topicAnchors = mergeTopicAnchors(rawPresentationChunks);
  if (args.anchorRange) {
    topicAnchors = topicAnchors.slice(args.anchorRange.from, args.anchorRange.to);
    console.log(
      `Topic anchor slice ${args.anchorRange.from}..${args.anchorRange.to}: ` +
        topicAnchors.map((c) => `${c.fileName} p${c.pageStart}`).join(", "),
    );
  }

  const manualChunks =
    args.scope === "full_materials"
      ? chunksByEntry
          .filter(({ entry }) => entry.kind === "manual")
          .flatMap(({ chunks }) => chunks)
      : [];

  if (topicAnchors.length === 0) {
    throw new Error("No topic anchors extracted — cannot generate questions.");
  }

  if (args.dryRun) {
    const outDir = path.join(process.cwd(), ".ingestion-out");
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `${args.theme}-chunks.json`);
    await writeFile(
      outFile,
      JSON.stringify({ topicAnchors, manualChunks }, null, 2),
      "utf8",
    );
    console.log(
      `Dry run: ${topicAnchors.length} topic anchors, ${manualChunks.length} manual chunks → ${outFile}`,
    );
    return;
  }

  const supabase = createServiceClient();
  const themes = await fetchThemes(supabase);
  const theme = themes.get(args.theme);
  if (!theme) throw new Error(`Theme ${args.theme} not seeded — run supabase/seed.sql first.`);

  const bankSetId = await fetchBankSetIdByCode(supabase, args.bankSetCode);

  const materialIdByFile = new Map<string, string>();
  for (const { entry, chunks } of chunksByEntry) {
    const fileName = path.basename(entry.relativePath);
    const materialId = await upsertMaterial(supabase, {
      themeId: theme.id,
      kind: entry.kind,
      fileName,
      filePath: entry.relativePath,
    });
    materialIdByFile.set(fileName, materialId);
    await replaceChunks(
      supabase,
      materialId,
      theme.id,
      chunks.filter((chunk) => chunk.themeCode === args.theme),
    );
  }

  const anthropic = new Anthropic();
  const totals = {
    inserted: 0,
    duplicates: 0,
    unresolvedAnchors: 0,
    rejectedGrounding: 0,
    failed: 0,
  };

  console.log(
    `Generating ${questionsPerAnchor} questions × ${topicAnchors.length} anchors with ${GENERATION_MODEL} (${PROMPT_VERSION})...`,
  );

  for (const [index, anchor] of topicAnchors.entries()) {
    const anchorMaterialId = materialIdByFile.get(anchor.fileName) ?? null;
    let anchorInserted = 0;
    let retries = 0;

    while (anchorInserted < questionsPerAnchor && retries <= args.maxRetries) {
      const existing = await fetchExistingPrompts(supabase, {
        themeId: theme.id,
        bankSetId,
        anchorMaterialId,
        anchorPage: anchor.pageStart,
      });

      const stillNeeded = questionsPerAnchor - anchorInserted;
      const batchId = await createGenerationBatch(supabase, {
        themeId: theme.id,
        sourceScope: args.scope,
        model: GENERATION_MODEL,
        promptVersion: PROMPT_VERSION,
      });

      try {
        const matchedManual = matchManualChunks(anchor, manualChunks);
        const result = await generateCandidates({
          client: anthropic,
          themeCode: args.theme,
          themeName: theme.name,
          sourceScope: args.scope,
          anchor,
          manualChunks: matchedManual,
          questionCount: stillNeeded,
          existingPrompts: existing.raw,
        });

        const outcome = await insertCandidates(supabase, {
          batchId,
          themeId: theme.id,
          bankSetId,
          sourceScope: args.scope,
          anchor,
          candidates: result.candidates,
          materialIdByFile,
          existingPrompts: existing.normalized,
        });

        await finishGenerationBatch(supabase, batchId, "completed", {
          candidateCount: result.candidates.length,
          anchor: `${anchor.fileName} p${anchor.pageStart}`,
          ...outcome,
        });

        anchorInserted += outcome.inserted;
        totals.inserted += outcome.inserted;
        totals.duplicates += outcome.duplicates;
        totals.unresolvedAnchors += outcome.unresolvedAnchors;
        totals.rejectedGrounding += outcome.rejectedGrounding;

        if (outcome.inserted === 0) retries += 1;
        else retries = 0;
      } catch (error) {
        totals.failed += 1;
        retries += 1;
        await finishGenerationBatch(supabase, batchId, "failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          `  anchor ${index + 1} retry ${retries}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    const status =
      anchorInserted >= questionsPerAnchor
        ? "OK"
        : `UNDER (${anchorInserted}/${questionsPerAnchor})`;
    console.log(
      `  anchor ${index + 1}/${topicAnchors.length}: ${anchor.fileName} p${anchor.pageStart} → ${status}`,
    );
  }

  console.log(
    `Done. Inserted ${totals.inserted} questions ` +
      `(${totals.duplicates} duplicates, ${totals.rejectedGrounding} grounding rejects, ` +
      `${totals.unresolvedAnchors} unresolved anchors, ${totals.failed} failed batches).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
