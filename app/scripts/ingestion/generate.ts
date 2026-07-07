import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  GenerationBatchSchema,
  type CandidateQuestion,
} from "@/lib/ingestion/candidate-schema";
import type { SourceScope, ThemeCode } from "@/lib/domain/types";
import type { ExtractedChunk } from "./extract";

export const GENERATION_MODEL = "claude-opus-4-8";
export const PROMPT_VERSION = "v1";

/** Presentation chunks fed per generation call. */
const ANCHORS_PER_CALL = 6;
/** Questions requested per generation call. */
const QUESTIONS_PER_CALL = 6;

function renderChunk(chunk: ExtractedChunk): string {
  const pages =
    chunk.pageStart === chunk.pageEnd
      ? `página ${chunk.pageStart}`
      : `páginas ${chunk.pageStart}-${chunk.pageEnd}`;
  return `<material ficheiro="${chunk.fileName}" tipo="${chunk.kind === "presentation" ? "apresentação" : "manual"}" ${pages}>\n${chunk.content}\n</material>`;
}

/**
 * The AI prompt contract from the implementation brief: Portuguese exam-style
 * questions anchored in presentations, explained by manual references, with
 * quality flags instead of invented citations.
 *
 * Built as two content blocks: a stable prefix (rules + full manual corpus,
 * identical across all anchor batches of a theme, marked with cache_control so
 * successive calls read it from the prompt cache) and a volatile suffix (the
 * anchor slides of this batch).
 */
function buildPromptBlocks(params: {
  themeCode: ThemeCode;
  themeName: string;
  sourceScope: SourceScope;
  anchors: ExtractedChunk[];
  manualChunks: ExtractedChunk[];
  questionCount: number;
}): Anthropic.ContentBlockParam[] {
  const manualSection =
    params.manualChunks.length > 0
      ? `Excertos do manual de curso (para justificar as respostas):\n\n${params.manualChunks.map(renderChunk).join("\n\n")}`
      : "(Não há excertos de manual disponíveis nesta execução.)";

  const stablePrefix = `Estás a criar perguntas de escolha múltipla para preparar estudantes para o exame do Curso de Treinador de Padel Grau I (componente geral), tema "${params.themeName}" (código ${params.themeCode}).

Regras para todas as perguntas:

- Escreve tudo em português europeu.
- Cada pergunta é de escolha múltipla com exatamente quatro opções e uma só correta.
- Usa um slide da apresentação como "presentationAnchor" (ficheiro + página + excerto literal curto) — é a razão pela qual a pergunta pertence ao corpus do exame.
- Usa o manual como "manualReference" para justificar a resposta correta, com página/secção quando identificável. Se não encontrares apoio no manual, define manualReference como null e adiciona a flag "weak_manual_reference" — nunca inventes citações.
- Se a apresentação e o manual parecerem contradizer-se, adiciona a flag "source_conflict" em vez de resolveres o conflito silenciosamente.
- Prefere perguntas com elevada probabilidade de sair no exame real (conceitos centrais, definições, classificações, regras).
- Os distratores devem ser plausíveis (erros comuns, conceitos confundíveis), nunca absurdos.
- Usa "todas as anteriores" ou "nenhuma das anteriores" com moderação; nesses casos preenche "justification" em TODAS as opções e adiciona a flag correspondente ("uses_all_of_above" / "uses_none_of_above").
- "explanation" é uma justificação curta da resposta correta, idealmente apoiada no manual.
- Define themeCode="${params.themeCode}" e sourceScope="${params.sourceScope}" em todas as perguntas.
- Devolve apenas dados estruturados conforme o schema.

${manualSection}`;

  const volatileSuffix = `Slides das apresentações das aulas para esta execução (a âncora de cada pergunta — indicam a matéria com maior ênfase no exame):

${params.anchors.map(renderChunk).join("\n\n")}

Gera exatamente ${params.questionCount} perguntas ancoradas nestes slides.`;

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

/** One structured-output generation call. Throws if the SDK cannot parse. */
export async function generateCandidates(params: {
  client: Anthropic;
  themeCode: ThemeCode;
  themeName: string;
  sourceScope: SourceScope;
  anchors: ExtractedChunk[];
  manualChunks: ExtractedChunk[];
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
          anchors: params.anchors,
          manualChunks: params.manualChunks,
          questionCount: QUESTIONS_PER_CALL,
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

/** Splits anchor chunks into batches for successive generation calls. */
export function batchAnchors(anchors: ExtractedChunk[]): ExtractedChunk[][] {
  const batches: ExtractedChunk[][] = [];
  for (let i = 0; i < anchors.length; i += ANCHORS_PER_CALL) {
    batches.push(anchors.slice(i, i + ANCHORS_PER_CALL));
  }
  return batches;
}
