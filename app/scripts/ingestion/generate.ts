import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  GenerationBatchSchema,
  type CandidateQuestion,
} from "@/lib/ingestion/candidate-schema";
import type { SourceScope, ThemeCode } from "@/lib/domain/types";
import type { ExtractedChunk, TopicAnchor } from "./extract";

export const GENERATION_MODEL = "claude-opus-4-8";
export const PROMPT_VERSION = "v2";

const QUESTION_ANGLES = [
  "definição ou conceito-chave do slide",
  "cenário prático de treinador de Grau I",
  "afirmação correta/incorreta sobre o conteúdo do slide",
  "aplicação ou dilema ético/desportivo relacionado com o slide",
];

function renderChunk(chunk: ExtractedChunk | TopicAnchor): string {
  const pages =
    chunk.pageStart === chunk.pageEnd
      ? `página ${chunk.pageStart}`
      : `páginas ${chunk.pageStart}-${chunk.pageEnd}`;
  return `<material ficheiro="${chunk.fileName}" tipo="${chunk.kind === "presentation" ? "apresentação" : "manual"}" ${pages}>\n${chunk.content}\n</material>`;
}

/**
 * Prompt v2: presentation-first — the question must be answerable from the
 * anchor alone; manual excerpts only support the explanation.
 */
export function buildPromptBlocks(params: {
  themeCode: ThemeCode;
  themeName: string;
  sourceScope: SourceScope;
  anchor: TopicAnchor;
  manualChunks: ExtractedChunk[];
  questionCount: number;
  existingPrompts: string[];
}): Anthropic.ContentBlockParam[] {
  const manualSection =
    params.manualChunks.length > 0
      ? `Excertos do manual de curso (APENAS para enriquecer a explicação — NÃO uses isto como fonte da pergunta se não estiver no slide):\n\n${params.manualChunks.map(renderChunk).join("\n\n")}`
      : "(Sem excertos de manual para esta âncora.)";

  const angles = QUESTION_ANGLES.slice(0, params.questionCount)
    .map((angle, i) => `${i + 1}. ${angle}`)
    .join("\n");

  const avoidSection =
    params.existingPrompts.length > 0
      ? `\nPerguntas que JÁ EXISTEM para este slide (NÃO repitas o mesmo conceito nem formulação):\n${params.existingPrompts.map((p) => `- ${p}`).join("\n")}\n`
      : "";

  const stablePrefix = `Estás a criar perguntas de escolha múltipla para preparar estudantes para o exame do Curso de Treinador de Padel Grau I (componente geral), tema "${params.themeName}" (código ${params.themeCode}).

Regras OBRIGATÓRIAS (prompt v2 — presentation-first):

- Escreve tudo em português europeu.
- Cada pergunta é de escolha múltipla com exatamente quatro opções e uma só correta.
- A pergunta TEM DE ser respondível APENAS com o conteúdo do slide de apresentação abaixo — o aluno viu isto na aula.
- PROIBIDO perguntar sobre conteúdo que só apareça no manual e não no slide.
- O manual serve SÓ para enriquecer a "explanation" e "manualReference" — nunca como origem do enunciado.
- Usa o slide como "presentationAnchor" (ficheiro + página + excerto literal curto). A página deve ser ${params.anchor.pageStart}${params.anchor.pageEnd !== params.anchor.pageStart ? ` (intervalo ${params.anchor.pageStart}-${params.anchor.pageEnd})` : ""}.
- Tom: prático, orientado para o treinador de Grau I (responsabilidades, dilemas, fair play, conduta) — NÃO estilo manual académico (filosofia, estatísticas, correntes éticas) salvo se o slide o mencionar.
- Cada uma das ${params.questionCount} perguntas deve testar um ângulo DIFERENTE:
${angles}
- Os distratores devem ser plausíveis, nunca absurdos.
- Usa "todas as anteriores" ou "nenhuma das anteriores" com moderação; nesses casos preenche "justification" em TODAS as opções e adiciona a flag correspondente.
- Se não encontrares apoio no manual para a explicação, manualReference=null e flag "weak_manual_reference".
- Se apresentação e manual contradizerem-se, flag "source_conflict".
- Define themeCode="${params.themeCode}" e sourceScope="${params.sourceScope}".
- Devolve apenas dados estruturados conforme o schema.`;

  const volatileSuffix = `${avoidSection}
Slide de apresentação (ÚNICA fonte do enunciado e da resposta correta):

${renderChunk(params.anchor)}

${manualSection}

Gera exatamente ${params.questionCount} perguntas DISTINTAS ancoradas neste slide/tópico.`;

  return [
    {
      type: "text",
      text: stablePrefix,
      cache_control: { type: "ephemeral" },
    },
    { type: "text", text: volatileSuffix },
  ];
}

export interface GenerationCallResult {
  candidates: CandidateQuestion[];
  rawText: string;
  model: string;
}

/** One structured-output generation call for a single topic anchor. */
export async function generateCandidates(params: {
  client: Anthropic;
  themeCode: ThemeCode;
  themeName: string;
  sourceScope: SourceScope;
  anchor: TopicAnchor;
  manualChunks: ExtractedChunk[];
  questionCount: number;
  existingPrompts: string[];
}): Promise<GenerationCallResult> {
  const response = await params.client.messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: buildPromptBlocks({
          themeCode: params.themeCode,
          themeName: params.themeName,
          sourceScope: params.sourceScope,
          anchor: params.anchor,
          manualChunks: params.manualChunks,
          questionCount: params.questionCount,
          existingPrompts: params.existingPrompts,
        }),
      },
    ],
    output_config: { format: zodOutputFormat(GenerationBatchSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Structured output did not validate against the schema.");
  }

  const rawText =
    response.content.find((block) => block.type === "text")?.text ?? "";

  return { candidates: parsed.questions, rawText, model: response.model };
}

/** Default quota per anchor by theme size. */
export function defaultQuestionsPerAnchor(themeCode: ThemeCode): number {
  return themeCode === "PDD" || themeCode === "TMTD" ? 3 : 4;
}
