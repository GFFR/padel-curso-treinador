import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractText, getDocumentProxy } from "unpdf";

import type { ThemeCode } from "@/lib/domain/types";
import {
  classifyManualChunk,
  repoRoot,
  type MaterialEntry,
} from "./material-map";

export interface ExtractedChunk {
  themeCode: ThemeCode;
  kind: "presentation" | "manual";
  fileName: string;
  relativePath: string;
  pageStart: number;
  pageEnd: number;
  content: string;
}

/** Pages a manual chunk groups together; presentations stay one chunk per slide. */
const MANUAL_PAGES_PER_CHUNK = 3;
/** Pages with less text than this are treated as decorative and skipped. */
const MIN_PAGE_CHARS = 40;

function normalize(pageText: string): string {
  return pageText
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPages(absolutePath: string): Promise<string[]> {
  const buffer = await readFile(absolutePath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map(normalize);
}

/**
 * Extracts one material into theme-tagged, page-ranged chunks.
 * Presentations become one chunk per slide (they are the presentation-anchor
 * unit); manuals are grouped into small multi-page chunks. Chunks from the
 * shared FCH/antidoping manual are re-classified by content.
 */
export async function extractMaterialChunks(
  entry: MaterialEntry,
): Promise<ExtractedChunk[]> {
  const absolutePath = path.join(repoRoot(), entry.relativePath);
  const pages = await extractPages(absolutePath);
  const fileName = path.basename(entry.relativePath);
  const chunks: ExtractedChunk[] = [];

  if (entry.kind === "presentation") {
    pages.forEach((content, index) => {
      if (content.length < MIN_PAGE_CHARS) return;
      chunks.push({
        themeCode: entry.themeCode,
        kind: entry.kind,
        fileName,
        relativePath: entry.relativePath,
        pageStart: index + 1,
        pageEnd: index + 1,
        content,
      });
    });
    return chunks;
  }

  for (let start = 0; start < pages.length; start += MANUAL_PAGES_PER_CHUNK) {
    const group = pages.slice(start, start + MANUAL_PAGES_PER_CHUNK);
    const content = group.filter((p) => p.length >= MIN_PAGE_CHARS).join("\n\n");
    if (content.length < MIN_PAGE_CHARS) continue;
    const themeCode = classifyManualChunk(entry.themeCode, content);
    // The shared manual is registered under both FCH and FCH_DOPING; keep a
    // chunk only under the theme its content classifies to, so the two
    // material rows split the manual instead of duplicating it.
    if (
      (entry.themeCode === "FCH" || entry.themeCode === "FCH_DOPING") &&
      themeCode !== entry.themeCode
    ) {
      continue;
    }
    chunks.push({
      themeCode,
      kind: entry.kind,
      fileName,
      relativePath: entry.relativePath,
      pageStart: start + 1,
      pageEnd: Math.min(start + MANUAL_PAGES_PER_CHUNK, pages.length),
      content,
    });
  }
  return chunks;
}
