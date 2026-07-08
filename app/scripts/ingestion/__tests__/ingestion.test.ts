import { describe, expect, it } from "vitest";

import { normalizePrompt } from "../db";
import {
  isSparseSlideContent,
  mergeTopicAnchors,
  type ExtractedChunk,
} from "../extract";
import { matchManualChunks, scoreManualChunk } from "../match-manual";
import { buildPromptBlocks } from "../generate";
import {
  groundingScore,
  isPromptGroundedInAnchor,
  validateCandidateGrounding,
} from "../validate-candidate";

function presentationChunk(
  page: number,
  content: string,
  fileName = "test.pdf",
): ExtractedChunk {
  return {
    themeCode: "ED",
    kind: "presentation",
    fileName,
    relativePath: `Apresentações/${fileName}`,
    pageStart: page,
    pageEnd: page,
    content,
  };
}

describe("normalizePrompt", () => {
  it("treats punctuation variants as duplicates", () => {
    expect(normalizePrompt("fair-play no desporto?")).toBe(
      normalizePrompt("fair play no desporto"),
    );
  });
});

describe("mergeTopicAnchors", () => {
  it("merges sparse title slides into the next content slide", () => {
    const chunks = [
      presentationChunk(1, "INTRODUCAO"),
      presentationChunk(2, "FAIR-PLAY\nComportamento leal e respeito pelas regras do jogo."),
    ];
    const merged = mergeTopicAnchors(chunks);
    expect(merged).toHaveLength(1);
    expect(merged[0].pageStart).toBe(1);
    expect(merged[0].content).toContain("FAIR-PLAY");
    expect(merged[0].content).toContain("INTRODUCAO");
  });

  it("keeps standalone content slides separate", () => {
    const chunks = [
      presentationChunk(
        3,
        "Responsabilidades dos treinadores incluem respeitar os praticantes e fomentar o desportivismo.",
      ),
      presentationChunk(
        4,
        "O treinador deve opor-se ao doping e ser modelo ético para os mais jovens.",
      ),
    ];
    expect(mergeTopicAnchors(chunks)).toHaveLength(2);
  });
});

describe("isSparseSlideContent", () => {
  it("flags short title-only slides", () => {
    expect(isSparseSlideContent("INTRODUCAO")).toBe(true);
  });
});

describe("matchManualChunks", () => {
  it("prefers manual chunks with overlapping vocabulary", () => {
    const anchor = presentationChunk(
      7,
      "FAIR-PLAY significa comportamento leal e respeito pelas regras desportivas.",
    );
    const relevant = {
      ...presentationChunk(1, "manual chunk"),
      kind: "manual" as const,
      content:
        "O fair play manifesta comportamento leal respeito regras desportivas espírito desportivo.",
    };
    const irrelevant = {
      ...presentationChunk(2, "manual chunk"),
      kind: "manual" as const,
      content: "Metodologia periodização treino força resistência velocidade.",
    };
    expect(scoreManualChunk(anchor, relevant)).toBeGreaterThan(
      scoreManualChunk(anchor, irrelevant),
    );
    const matched = matchManualChunks(anchor, [irrelevant, relevant]);
    expect(matched[0].content).toContain("fair play");
  });
});

describe("validateCandidateGrounding", () => {
  const anchor = presentationChunk(
    13,
    "Responsabilidades dos treinadores: respeitar praticantes, fomentar desportivismo, recusar fraude.",
  );

  it("accepts prompts grounded in anchor terms", () => {
    expect(
      isPromptGroundedInAnchor(
        "Qual responsabilidade do treinador sobre desportivismo e respeito aos praticantes?",
        anchor,
      ),
    ).toBe(true);
  });

  it("rejects prompts with no anchor overlap", () => {
    expect(
      isPromptGroundedInAnchor(
        "Segundo Kant, o que é a ética deontológica?",
        anchor,
      ),
    ).toBe(false);
  });

  it("validateCandidateGrounding returns reason when not grounded", () => {
    const result = validateCandidateGrounding(
      {
        themeCode: "ED",
        sourceScope: "full_materials",
        presentationAnchor: { fileName: "test.pdf", page: 13, excerpt: "..." },
        manualReference: null,
        prompt: "O que defende John Stuart Mill sobre utilitarismo?",
        options: [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }],
        correctOptionIndex: 0,
        explanation: "test",
        qualityFlags: [],
      },
      anchor,
    );
    expect(result).toBeTruthy();
  });

  it("computes grounding score between 0 and 1", () => {
    const score = groundingScore(
      "Qual responsabilidade do treinador sobre desportivismo?",
      anchor,
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("buildPromptBlocks", () => {
  it("includes presentation-first rules and single anchor", () => {
    const anchor = presentationChunk(7, "FAIR-PLAY comportamento leal.");
    const blocks = buildPromptBlocks({
      themeCode: "ED",
      themeName: "Etica no Desporto",
      sourceScope: "full_materials",
      anchor,
      manualChunks: [],
      questionCount: 4,
      existingPrompts: ["Pergunta existente?"],
    });
    const text = blocks.map((b) => ("text" in b ? b.text : "")).join("\n");
    expect(text).toContain("presentation-first");
    expect(text).toContain("APENAS com o conte");
    expect(text).toContain("Pergunta existente?");
    expect(text).toContain("FAIR-PLAY");
  });
});
