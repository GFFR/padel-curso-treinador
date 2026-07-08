import type { CandidateQuestion } from "@/lib/ingestion/candidate-schema";

import type { TopicAnchor } from "./extract";
import { tokenize } from "./match-manual";

const MIN_SHARED_TOKENS = 2;

/**
 * Deterministic check: the question prompt should share significant terms with
 * the presentation anchor (presentation-first contract).
 */
export function isPromptGroundedInAnchor(
  prompt: string,
  anchor: TopicAnchor,
): boolean {
  const promptTokens = tokenize(prompt);
  const anchorTokens = tokenize(anchor.content);
  if (promptTokens.size === 0 || anchorTokens.size === 0) {
    // Very short anchors (e.g. fair-play definition slide): accept if any overlap.
    const promptWords = prompt.toLowerCase().split(/\s+/);
    const anchorLower = anchor.content.toLowerCase();
    return promptWords.some((w) => w.length >= 5 && anchorLower.includes(w));
  }
  let shared = 0;
  for (const token of promptTokens) {
    if (anchorTokens.has(token)) shared += 1;
  }
  return shared >= MIN_SHARED_TOKENS;
}

export function groundingScore(prompt: string, anchor: TopicAnchor): number {
  const promptTokens = tokenize(prompt);
  const anchorTokens = tokenize(anchor.content);
  if (promptTokens.size === 0 || anchorTokens.size === 0) return 0;
  let shared = 0;
  for (const token of promptTokens) {
    if (anchorTokens.has(token)) shared += 1;
  }
  return shared / promptTokens.size;
}

/**
 * Validates a candidate against anchor grounding. Returns null if OK, or a
 * rejection reason string.
 */
export function validateCandidateGrounding(
  candidate: CandidateQuestion,
  anchor: TopicAnchor,
): string | null {
  if (!isPromptGroundedInAnchor(candidate.prompt, anchor)) {
    return "prompt not grounded in anchor content";
  }
  if (candidate.presentationAnchor.page !== anchor.pageStart) {
    // Allow page within merged range.
    if (
      candidate.presentationAnchor.page < anchor.pageStart ||
      candidate.presentationAnchor.page > anchor.pageEnd
    ) {
      return "presentation anchor page outside topic range";
    }
  }
  return null;
}
