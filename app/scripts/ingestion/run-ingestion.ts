/**
 * Ingestion pipeline CLI (docs/ingestion-pipeline.md).
 *
 *   npm run ingest -- --theme ED                       # full run (needs env keys)
 *   npm run ingest -- --theme ED --dry-run             # extraction only, no keys needed
 *   npm run ingest -- --theme ED --scope presentations_only
 *
 * Phases: extract PDFs → chunk + theme-tag → store materials/chunks →
 * AI structured generation → Zod validation → duplicate detection → insert.
 * Start with ED or DA (small, easy to inspect).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

import { THEME_CODES, type SourceScope, type ThemeCode } from "@/lib/domain/types";
import { materialsForTheme } from "./material-map";
import { extractMaterialChunks, type ExtractedChunk } from "./extract";
import { batchAnchors, generateCandidates, GENERATION_MODEL, PROMPT_VERSION } from "./generate";
import {
  createGenerationBatch,
  createServiceClient,
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
  return { theme, scope, dryRun: argv.includes("--dry-run") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Ingesting theme ${args.theme} (scope: ${args.scope})${args.dryRun ? " [dry-run]" : ""}`);

  // Phase 1-2: extract and chunk all materials of the theme.
  const entries = materialsForTheme(args.theme);
  if (entries.length === 0) throw new Error(`No materials mapped for ${args.theme}.`);

  const chunksByEntry: { entry: (typeof entries)[number]; chunks: ExtractedChunk[] }[] = [];
  for (const entry of entries) {
    const chunks = await extractMaterialChunks(entry);
    console.log(`  ${entry.kind}: ${path.basename(entry.relativePath)} → ${chunks.length} chunks`);
    chunksByEntry.push({ entry, chunks });
  }

  const anchors = chunksByEntry
    .filter(({ entry }) => entry.kind === "presentation")
    .flatMap(({ chunks }) => chunks);
  const manualChunks =
    args.scope === "full_materials"
      ? chunksByEntry
          .filter(({ entry }) => entry.kind === "manual")
          .flatMap(({ chunks }) => chunks)
      : [];

  if (anchors.length === 0) {
    throw new Error("No presentation chunks extracted — cannot anchor questions.");
  }

  if (args.dryRun) {
    const outDir = path.join(process.cwd(), ".ingestion-out");
    await mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `${args.theme}-chunks.json`);
    await writeFile(
      outFile,
      JSON.stringify({ anchors, manualChunks }, null, 2),
      "utf8",
    );
    console.log(
      `Dry run: ${anchors.length} anchor chunks, ${manualChunks.length} manual chunks → ${outFile}`,
    );
    return;
  }

  // Phase 3: persist materials + chunks (service role).
  const supabase = createServiceClient();
  const themes = await fetchThemes(supabase);
  const theme = themes.get(args.theme);
  if (!theme) throw new Error(`Theme ${args.theme} not seeded — run supabase/seed.sql first.`);

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

  // Phase 4-7: generate per anchor batch, validate, dedupe, insert.
  const anthropic = new Anthropic();
  const existingPrompts = await fetchExistingPrompts(supabase, theme.id);
  const totals = { inserted: 0, duplicates: 0, unresolvedAnchors: 0, failed: 0 };

  const anchorBatches = batchAnchors(anchors);
  console.log(`Generating from ${anchorBatches.length} anchor batches with ${GENERATION_MODEL}...`);

  for (const [index, anchorBatch] of anchorBatches.entries()) {
    const batchId = await createGenerationBatch(supabase, {
      themeId: theme.id,
      sourceScope: args.scope,
      model: GENERATION_MODEL,
      promptVersion: PROMPT_VERSION,
    });
    try {
      const result = await generateCandidates({
        client: anthropic,
        themeCode: args.theme,
        themeName: theme.name,
        sourceScope: args.scope,
        anchors: anchorBatch,
        manualChunks,
      });
      const outcome = await insertCandidates(supabase, {
        batchId,
        themeId: theme.id,
        sourceScope: args.scope,
        candidates: result.candidates,
        materialIdByFile,
        existingPrompts,
      });
      await finishGenerationBatch(supabase, batchId, "completed", {
        candidateCount: result.candidates.length,
        ...outcome,
      });
      totals.inserted += outcome.inserted;
      totals.duplicates += outcome.duplicates;
      totals.unresolvedAnchors += outcome.unresolvedAnchors;
      console.log(
        `  batch ${index + 1}/${anchorBatches.length}: +${outcome.inserted} questions` +
          (outcome.duplicates ? ` (${outcome.duplicates} duplicates skipped)` : ""),
      );
    } catch (error) {
      totals.failed += 1;
      await finishGenerationBatch(supabase, batchId, "failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`  batch ${index + 1} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(
    `Done. Inserted ${totals.inserted} questions ` +
      `(${totals.duplicates} duplicates, ${totals.unresolvedAnchors} unresolved anchors, ${totals.failed} failed batches).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
