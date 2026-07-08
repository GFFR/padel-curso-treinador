# Ingestion Pipeline

The MVP should use an admin/developer-run ingestion pipeline over the known local PDFs.

The pipeline should:

- Read presentations and course manuals from the existing material folders
- Map each file to a calendar-defined course theme
- Split manuals that cover multiple themes into theme-specific chunks
- Extract presentation anchors and manual references
- Use AI to generate candidate questions from presentation anchors when possible
- Ask AI to return candidate questions in a strict structured output schema
- Match each candidate question to a manual reference for explanation (v2: matched excerpts only; manual never sources the question stem)
- Validate structured output before inserting anything into the database
- Flag weakly sourced questions and source conflicts for admin attention
- Store generation batches in the question bank

AI should be used for semantic work: turning source material into exam-style questions, writing explanations, proposing plausible distractors, and connecting presentation anchors to manual references. Deterministic code should handle extraction, theme mapping, schema validation, duplicate detection, source conflict flags, and database insertion.

## Candidate Question Schema

The generation prompt should require structured output that is ready for validation and import. Each candidate question should include:

- Course theme
- Source scope
- Presentation anchor file and slide/page
- Manual reference file and page/section, when found
- Prompt in Portuguese
- Four answer options in Portuguese
- Correct option index
- Explanation in Portuguese
- Per-option justification when using "all of the above" or "none of the above"
- Quality flags, such as weak manual reference or source conflict
- Generation metadata, such as model, prompt version, and generation batch ID

The database import step should reject malformed candidates rather than trying to repair them silently.

A full admin upload and document-management UI can be added later if the course material set changes often.
