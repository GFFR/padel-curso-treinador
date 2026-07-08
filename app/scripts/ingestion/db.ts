import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { CandidateQuestion } from "@/lib/ingestion/candidate-schema";
import type { SourceScope, ThemeCode } from "@/lib/domain/types";
import type { ExtractedChunk } from "./extract";
import { validateCandidateGrounding } from "./validate-candidate";
import type { TopicAnchor } from "./extract";

/** Service-role client for pipeline scripts (bypasses RLS; never in browser). */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchThemes(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("course_themes")
    .select("id, code, name");
  if (error) throw new Error(`Failed to load themes: ${error.message}`);
  return new Map<ThemeCode, { id: string; name: string }>(
    (data ?? []).map((t) => [t.code as ThemeCode, { id: t.id, name: t.name }]),
  );
}

export async function fetchBankSetIdByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("question_bank_sets")
    .select("id")
    .eq("code", code)
    .single();
  if (error || !data) {
    throw new Error(`Unknown bank set "${code}": ${error?.message}`);
  }
  return data.id;
}

/** Upserts a source material row and returns its id (unique per theme+file). */
export async function upsertMaterial(
  supabase: SupabaseClient,
  params: {
    themeId: string;
    kind: "presentation" | "manual";
    fileName: string;
    filePath: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("source_materials")
    .upsert(
      {
        theme_id: params.themeId,
        kind: params.kind,
        file_name: params.fileName,
        file_path: params.filePath,
        title: params.fileName.replace(/\.pdf$/i, ""),
      },
      { onConflict: "theme_id,file_name" },
    )
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to upsert material ${params.fileName}: ${error?.message}`);
  }
  return data.id;
}

/** Replaces the stored chunks of one material+theme with a fresh extraction. */
export async function replaceChunks(
  supabase: SupabaseClient,
  materialId: string,
  themeId: string,
  chunks: ExtractedChunk[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("source_chunks")
    .delete()
    .eq("source_material_id", materialId)
    .eq("theme_id", themeId);
  if (deleteError) {
    throw new Error(`Failed to clear old chunks: ${deleteError.message}`);
  }
  if (chunks.length === 0) return;
  const { error } = await supabase.from("source_chunks").insert(
    chunks.map((chunk) => ({
      source_material_id: materialId,
      theme_id: themeId,
      page_start: chunk.pageStart,
      page_end: chunk.pageEnd,
      content: chunk.content,
    })),
  );
  if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
}

export async function createGenerationBatch(
  supabase: SupabaseClient,
  params: {
    themeId: string;
    sourceScope: SourceScope;
    model: string;
    promptVersion: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("generation_batches")
    .insert({
      theme_id: params.themeId,
      source_scope: params.sourceScope,
      model: params.model,
      prompt_version: params.promptVersion,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create generation batch: ${error?.message}`);
  }
  return data.id;
}

export async function finishGenerationBatch(
  supabase: SupabaseClient,
  batchId: string,
  status: "completed" | "failed",
  rawOutput: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("generation_batches")
    .update({ status, raw_output: rawOutput })
    .eq("id", batchId);
  if (error) throw new Error(`Failed to update batch: ${error.message}`);
}

/** Normalized prompt text used for duplicate detection. */
export function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ExistingPromptsResult {
  normalized: Set<string>;
  raw: string[];
}

export async function fetchExistingPrompts(
  supabase: SupabaseClient,
  params: {
    themeId: string;
    bankSetId: string;
    anchorMaterialId?: string | null;
    anchorPage?: number | null;
  },
): Promise<ExistingPromptsResult> {
  let query = supabase
    .from("questions")
    .select("prompt")
    .eq("theme_id", params.themeId)
    .eq("bank_set_id", params.bankSetId);

  if (params.anchorMaterialId && params.anchorPage != null) {
    query = query
      .eq("presentation_anchor_material_id", params.anchorMaterialId)
      .eq("presentation_anchor_page", params.anchorPage);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load existing prompts: ${error.message}`);
  const raw = (data ?? []).map((row) => row.prompt);
  return {
    raw,
    normalized: new Set(raw.map((p) => normalizePrompt(p))),
  };
}

export interface AnchorCoverageRow {
  materialId: string;
  fileName: string;
  page: number;
  count: number;
}

export async function fetchAnchorCoverage(
  supabase: SupabaseClient,
  themeId: string,
  bankSetId: string,
): Promise<AnchorCoverageRow[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "presentation_anchor_material_id, presentation_anchor_page, presentation_anchor:source_materials!questions_presentation_anchor_material_id_fkey ( file_name )",
    )
    .eq("theme_id", themeId)
    .eq("bank_set_id", bankSetId)
    .not("presentation_anchor_material_id", "is", null)
    .not("presentation_anchor_page", "is", null);

  if (error) throw new Error(`Failed to load anchor coverage: ${error.message}`);

  const counts = new Map<string, AnchorCoverageRow>();
  for (const row of data ?? []) {
    const materialId = row.presentation_anchor_material_id as string;
    const page = row.presentation_anchor_page as number;
    const key = `${materialId}:${page}`;
    const material = Array.isArray(row.presentation_anchor)
      ? row.presentation_anchor[0]
      : row.presentation_anchor;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        materialId,
        fileName: material?.file_name ?? "?",
        page,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort((a, b) => a.page - b.page);
}

export interface InsertResult {
  inserted: number;
  duplicates: number;
  unresolvedAnchors: number;
  rejectedGrounding: number;
}

/**
 * Inserts validated candidates as unreviewed/flagged questions with options.
 */
export async function insertCandidates(
  supabase: SupabaseClient,
  params: {
    batchId: string;
    themeId: string;
    bankSetId: string;
    sourceScope: SourceScope;
    anchor: TopicAnchor;
    candidates: CandidateQuestion[];
    materialIdByFile: Map<string, string>;
    existingPrompts: Set<string>;
  },
): Promise<InsertResult> {
  let inserted = 0;
  let duplicates = 0;
  let unresolvedAnchors = 0;
  let rejectedGrounding = 0;

  const anchorMaterialId =
    params.materialIdByFile.get(params.anchor.fileName) ?? null;

  for (const candidate of params.candidates) {
    const normalized = normalizePrompt(candidate.prompt);
    if (params.existingPrompts.has(normalized)) {
      duplicates += 1;
      continue;
    }

    const groundingReason = validateCandidateGrounding(candidate, params.anchor);
    if (groundingReason) {
      rejectedGrounding += 1;
      continue;
    }

    if (!anchorMaterialId) unresolvedAnchors += 1;

    const manualMaterialId = candidate.manualReference
      ? (params.materialIdByFile.get(candidate.manualReference.fileName) ?? null)
      : null;

    const flags = [...candidate.qualityFlags];
    if (candidate.manualReference && !manualMaterialId) {
      if (!flags.includes("weak_manual_reference")) {
        flags.push("weak_manual_reference");
      }
    }

    const status = flags.includes("source_conflict")
      ? "source_conflict"
      : flags.includes("weak_manual_reference") ||
          flags.includes("weak_anchor_grounding") ||
          !candidate.manualReference
        ? "weakly_sourced"
        : "unreviewed";

    const { data: question, error } = await supabase
      .from("questions")
      .insert({
        theme_id: params.themeId,
        bank_set_id: params.bankSetId,
        generation_batch_id: params.batchId,
        source_scope: params.sourceScope,
        prompt: candidate.prompt,
        correct_option_index: candidate.correctOptionIndex,
        explanation: candidate.explanation,
        status,
        presentation_anchor_material_id: anchorMaterialId,
        presentation_anchor_page: params.anchor.pageStart,
        manual_reference_material_id: manualMaterialId,
        manual_reference_page: candidate.manualReference?.page ?? null,
        manual_reference_section: candidate.manualReference?.sectionTitle ?? null,
        quality_flags: flags,
      })
      .select("id")
      .single();
    if (error || !question) {
      throw new Error(`Failed to insert question: ${error?.message}`);
    }

    const { error: optionsError } = await supabase.from("question_options").insert(
      candidate.options.map((option, index) => ({
        question_id: question.id,
        option_index: index,
        text: option.text,
        justification: option.justification ?? null,
      })),
    );
    if (optionsError) {
      throw new Error(`Failed to insert options: ${optionsError.message}`);
    }

    params.existingPrompts.add(normalized);
    inserted += 1;
  }

  return { inserted, duplicates, unresolvedAnchors, rejectedGrounding };
}
