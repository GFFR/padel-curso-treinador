import type { ExtractedChunk, TopicAnchor } from "./extract";

const STOP_WORDS = new Set([
  "a", "o", "os", "as", "de", "da", "do", "dos", "das", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "e", "ou", "que", "para", "por", "com", "sem", "se", "ao",
  "aos", "à", "às", "é", "ser", "como", "mais", "menos", "sobre", "entre", "quando",
  "onde", "qual", "quais", "este", "esta", "estes", "estas", "esse", "essa", "isso",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  return shared;
}

/**
 * Scores manual chunks against one topic anchor by shared significant tokens.
 */
export function scoreManualChunk(anchor: TopicAnchor, manual: ExtractedChunk): number {
  const anchorTokens = tokenize(anchor.content);
  const manualTokens = tokenize(manual.content);
  return overlapScore(anchorTokens, manualTokens);
}

const MAX_MANUAL_CHARS = 1500;

/**
 * Returns the best-matching manual excerpts for one anchor (top 1–2 chunks,
 * trimmed to ~1500 chars total).
 */
export function matchManualChunks(
  anchor: TopicAnchor,
  manualChunks: ExtractedChunk[],
  maxChunks = 2,
): ExtractedChunk[] {
  const ranked = [...manualChunks]
    .map((chunk) => ({ chunk, score: scoreManualChunk(anchor, chunk) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const selected: ExtractedChunk[] = [];
  let chars = 0;
  for (const { chunk } of ranked) {
    if (selected.length >= maxChunks) break;
    if (chars + chunk.content.length > MAX_MANUAL_CHARS && selected.length > 0) {
      break;
    }
    selected.push({
      ...chunk,
      content:
        chars + chunk.content.length > MAX_MANUAL_CHARS
          ? chunk.content.slice(0, MAX_MANUAL_CHARS - chars)
          : chunk.content,
    });
    chars += chunk.content.length;
  }
  return selected;
}

export { tokenize };
