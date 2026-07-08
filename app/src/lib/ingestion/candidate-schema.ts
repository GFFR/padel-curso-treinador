import { z } from "zod";

/**
 * Structured output contract for AI candidate question generation
 * (docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md). The AI must return
 * data matching this schema; anything malformed is rejected, never repaired
 * (ADR 0007).
 */
export const CandidateQuestionSchema = z.object({
  themeCode: z.enum(["PDD", "TMTD", "FCH", "FCH_DOPING", "ED", "DA"]),
  sourceScope: z.enum(["presentations_only", "full_materials"]),
  presentationAnchor: z.object({
    fileName: z.string(),
    page: z.number().int().positive(),
    excerpt: z.string().min(1),
  }),
  manualReference: z
    .object({
      fileName: z.string(),
      page: z.number().int().positive().optional(),
      sectionTitle: z.string().optional(),
      excerpt: z.string().optional(),
    })
    .nullable(),
  prompt: z.string().min(1),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        justification: z.string().optional(),
      }),
    )
    .length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  qualityFlags: z.array(
    z.enum([
      "weak_manual_reference",
      "source_conflict",
      "uses_all_of_above",
      "uses_none_of_above",
      "weak_anchor_grounding",
    ]),
  ),
});

export type CandidateQuestion = z.infer<typeof CandidateQuestionSchema>;

/** Wrapper for one generation call returning several candidates. */
export const GenerationBatchSchema = z.object({
  questions: z.array(CandidateQuestionSchema),
});

export type GenerationBatchOutput = z.infer<typeof GenerationBatchSchema>;
