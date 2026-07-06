# Curso Treinador Padel Grau I Study Dashboard

This context defines the language for a study dashboard that helps students prepare for the Curso de Treinador de Padel Grau I exam using course materials and generated practice questions.

## Language

**Course Material**:
Any official learning material available to students for the course, including in-class presentations and course manuals.
_Avoid_: Document, file, content

**Presentation**:
An in-class slide deck used by tutors to teach a course theme and expected to closely reflect exam emphasis.
_Avoid_: Slides, class PDF

**Course Manual**:
A detailed official manual used as reference material for explanations, study citations, and broader learning context.
_Avoid_: Manual, book, heavy content

**Question**:
A multiple-choice exam-style prompt with four answer options and one correct answer.
_Avoid_: Quiz item, card, exercise

**Question Bank**:
A reusable collection of generated and reviewed questions tagged by course theme, source scope, and source references.
_Avoid_: Question pool, generated set, item database

**Candidate Question**:
A generated question that has passed schema validation but may still be unreviewed, weakly sourced, or flagged for source conflict.
_Avoid_: AI output, draft item, generated question

**Explanation**:
A short justification for the correct answer, ideally backed by a course manual reference.
_Avoid_: Rationale, feedback, solution

**Presentation Anchor**:
The presentation slide or page that makes a question relevant to the course theme and exam preparation.
_Avoid_: Presentation source, slide reference

**Manual Reference**:
The course manual page or section used to justify a question's explanation and guide further study.
_Avoid_: Citation, manual source

**Question Report**:
A student-submitted signal that something may be wrong with a specific question, answer, explanation, or source reference.
_Avoid_: Bug, complaint, feedback

**Source Scope**:
The selected set of course materials used to generate or assemble questions for a practice exam.
_Avoid_: Config, mode, filter

**Course Theme**:
A calendar-defined learning area taught by one or more tutors and used as the weighting bucket for practice exam questions.
_Avoid_: Subject, topic, module

**Exam Blueprint**:
The target distribution of questions across course themes for an 80-question practice exam.
_Avoid_: Exam config, distribution, weighting

**Exam Score**:
The result of a practice exam on the Portuguese 0-20 scale, where each question contributes equally and 9.5 is the pass threshold.
_Avoid_: Grade, percentage, result rate

**Practice Session**:
An untimed study flow focused on one or more course themes rather than a full exam simulation.
_Avoid_: Quiz, drill, training mode

**Student Account**:
A student identity created through phone-number OTP and used to associate exam attempts, practice sessions, feedback, and performance stats.
_Avoid_: User, login, profile
