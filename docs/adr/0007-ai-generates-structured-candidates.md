# AI generates structured candidates

The ingestion pipeline will use AI to generate candidate questions, explanations, distractors, and source matches, but AI output must conform to a strict structured schema before database insertion. Deterministic pipeline code owns extraction, validation, duplicate detection, quality flags, and persistence so malformed or weakly sourced generated content cannot be silently imported into the question bank.
