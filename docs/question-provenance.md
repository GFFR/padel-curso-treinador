# Question Provenance

Each question should keep two source roles:

- Presentation anchor: the presentation slide or page that establishes why the question is relevant for the course theme and expected exam emphasis.
- Manual reference: the manual page or section that supports the explanation and gives the student a study reference.

Questions should be generated from presentation content when possible, then matched to the best manual reference for explanation. **v2 ingestion** requires the question stem to be answerable from the presentation anchor alone; manual-only topics are rejected. If no manual reference can be found, the question can still exist but should be flagged as weakly sourced for admin review.

Question bank **sets** (v1, v2, …) let admins keep older generations while activating a new set globally or per theme (`/admin/banco`).

If the presentation anchor and manual reference appear to disagree, the question should be flagged as a source conflict and should require admin review before being used in student exams or practice sessions.

For student-facing explanations, show the manual reference when available. Presentation anchors may be visible as supporting context, but their main purpose is to preserve exam relevance.
