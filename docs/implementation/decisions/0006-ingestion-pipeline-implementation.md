# 0006 — Ingestion pipeline implementation choices

**Status**: accepted (M4, 2026-07-07)

1. **PDF extraction: unpdf** (pdf.js under the hood), per-page text. All 13 course
   PDFs extract successfully (two emit harmless TrueType font warnings). Pages with
   <40 chars are skipped as decorative.
2. **Chunking**: presentations → one chunk per slide (the slide is the presentation-anchor
   unit); manuals → 3-page chunks. No embeddings — deterministic theme mapping only (0003).
3. **FCH/antidoping manual split**: every page of `FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf`
   carries a running header mentioning antidopagem, so keyword *presence* cannot split it.
   The classifier uses keyword **density** (≥8 occurrences AND ≥1.5 per 1000 chars →
   FCH_DOPING), calibrated on the real PDF: FCH body pages measure ≤0.9/1000, the doping
   section (pages 37+) measures 1.8–9.0/1000. Result: 13 FCH chunks (pages 1-36) and 9
   FCH_DOPING chunks (pages 37-64).
4. **Generation: Anthropic TypeScript SDK**, model `claude-opus-4-8`, adaptive thinking,
   structured outputs via `client.messages.parse()` + `zodOutputFormat` wrapping the
   brief's `CandidateQuestionSchema` (array wrapper `{questions: [...]}`). 6 anchor
   slides and 6 requested questions per call; `prompt_version: "v1"`.
5. **Prompt caching**: the rules + full manual corpus form a stable first content block
   with `cache_control: {type: "ephemeral"}`; only the anchor-slide block varies per
   call, so successive batches of a theme read the manual corpus from cache.
6. **Status mapping is deterministic code, not AI**: `source_conflict` flag → status
   `source_conflict`; `weak_manual_reference` flag or missing/unresolvable manual
   reference → `weakly_sourced`; otherwise `unreviewed`. AI never sets a status.
7. **Duplicate detection**: normalized prompt text (lowercase, de-accented, alphanumeric)
   compared against all existing questions of the theme, within and across runs.
8. **Idempotency**: materials upsert on `(theme_id, file_name)`; chunks are
   replace-on-reingest; questions dedupe by normalized prompt. Re-running a theme is safe.
9. **`--dry-run` mode** runs extraction/chunking only (no keys needed) and writes
   `.ingestion-out/<THEME>-chunks.json` for inspection. Verified for all six themes.
10. **Not yet executed against live services** — needs `ANTHROPIC_API_KEY` +
    Supabase keys (see `supabase-setup.md`); M7 will run all themes and tune.
    Known M7 candidate: for PDD (42 manual chunks) the cached prefix is large;
    consider manual-chunk selection per anchor batch if cost is an issue.
