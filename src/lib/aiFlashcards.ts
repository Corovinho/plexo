import type { DisciplineKey } from '@/types';

export interface GeneratedCard {
  front: string;
  back: string;
}

const CARD_JSON_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['cards'],
};

const SYSTEM_INSTRUCTION =
  'Você é um tutor de Medicina especialista em metodologia PBL (Problem-Based Learning) e repetição espaçada (Anki) para estudantes de Medicina no Brasil (foco em alto rendimento clínico, fisiologia, semiologia, farmacologia e saúde coletiva/SUS). Crie flashcards curtos, objetivos, sem ambiguidade, com uma pergunta direta na frente e uma resposta precisa e memorável no verso. Escreva sempre em português do Brasil.';

export async function generateFlashcardsWithGemini(params: {
  apiKey: string;
  sourceText: string;
  discipline?: DisciplineKey | '';
  count: number;
}): Promise<GeneratedCard[]> {
  const { apiKey, sourceText, discipline, count } = params;
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Cole sua chave gratuita do Google AI Studio para gerar automaticamente.');
  }

  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey: trimmedKey });
  const disciplineNote = discipline ? `Disciplina: ${discipline} (Medicina PBL FACAPE).` : 'Curso: Medicina PBL.';

  const prompt = `${disciplineNote}
Gere exatamente ${count} flashcards de alto rendimento para prova médica baseados no conteúdo ou tema abaixo.
Regras:
- Cada frente deve testar 1 conceito específico (evite perguntas longas ou vagas).
- Cada verso deve ser conciso (1 a 3 linhas no máximo), claro e direto ao ponto.
- Priorize mecanismos, critérios diagnósticos, condutas, anatomia/fisiologia aplicada e pegadinhas clássicas de prova.
- Retorne exclusivamente o JSON no formato {"cards":[{"front":"...","back":"..."}]}.

Conteúdo / Tema:
${sourceText.trim()}`;

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const interaction = await client.interactions.create({
        model,
        system_instruction: SYSTEM_INSTRUCTION,
        input: prompt,
        response_format: CARD_JSON_SCHEMA,
        response_mime_type: 'application/json',
        store: false,
      });

      const rawText = interaction.output_text || '';
      const parsed = parseCardsFromModelText(rawText);
      if (parsed.length > 0) return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  const msg =
    lastError instanceof Error
      ? lastError.message
      : 'Não foi possível gerar os flashcards agora.';
  if (msg.toLowerCase().includes('api key') || msg.includes('401') || msg.includes('403')) {
    throw new Error('Chave do Gemini inválida ou sem permissão. Confira em aistudio.google.com/apikey.');
  }
  if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
    throw new Error('Limite gratuito temporário atingido. Aguarde 1 minuto ou use a aba "Prompt + Colar".');
  }
  throw new Error(msg);
}

function parseCardsFromModelText(raw: string): GeneratedCard[] {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const obj = JSON.parse(cleaned);
    const list = Array.isArray(obj) ? obj : Array.isArray(obj?.cards) ? obj.cards : [];
    return list
      .filter(
        (c: unknown): c is GeneratedCard =>
          Boolean(c) &&
          typeof (c as GeneratedCard).front === 'string' &&
          typeof (c as GeneratedCard).back === 'string' &&
          (c as GeneratedCard).front.trim().length > 0 &&
          (c as GeneratedCard).back.trim().length > 0
      )
      .map((c: GeneratedCard) => ({
        front: c.front.trim(),
        back: c.back.trim(),
      }));
  } catch {
    return parseBatchFlashcards(raw);
  }
}

/**
 * Parses pasted lines in any common separator format:
 * "Pergunta ; Resposta", "Pergunta | Resposta", "Pergunta :: Resposta", or TSV (Tab)
 */
export function parseBatchFlashcards(input: string): GeneratedCard[] {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('```'));

  const results: GeneratedCard[] = [];
  for (const rawLine of lines) {
    // Strip leading numbering like "1. " or "- "
    const line = rawLine.replace(/^(?:\d+[.)]\s+|[-•*]\s+)/, '');
    let parts: string[] = [];

    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('::')) {
      parts = line.split('::');
    } else if (line.includes(' ; ')) {
      parts = line.split(' ; ');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes('|')) {
      parts = line.split('|');
    }

    if (parts.length >= 2) {
      const front = parts[0].trim();
      const back = parts.slice(1).join('; ').trim();
      if (front && back) {
        results.push({ front, back });
      }
    }
  }
  return results;
}

export function buildFreeAiPrompt(discipline: DisciplineKey | '', count: number, topic?: string): string {
  const discLabel = discipline ? ` de ${discipline}` : '';
  const contentBlock = topic?.trim()
    ? `\n\nConteúdo/tema base:\n${topic.trim()}`
    : '\n\n(Anexe o PDF/foto dos slides ou cole o resumo da aula logo abaixo desta mensagem)';

  return `Aja como um tutor de Medicina PBL. Crie ${count} flashcards de alto rendimento${discLabel} para revisão no Anki, focados no que realmente cai em prova médica.

REGRAS IMPORTANTES DE FORMATO:
- Responda APENAS com os cartões, 1 cartão por linha.
- Use ponto e vírgula (;) para separar Frente e Verso exatamente assim:
Pergunta direta e objetiva ; Resposta curta e precisa
- Não coloque numeração, não coloque títulos nem explicações extras.${contentBlock}`;
}
