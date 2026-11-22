import { useMemo, useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  KeyRound,
  Loader2,
  ClipboardPaste,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { usePlexo } from '@/context/PlexoContext';
import {
  DISCIPLINE_LIST,
  getDisciplineHex,
  getLocalDateString,
} from '@/data/facapeDefaults';
import {
  buildFreeAiPrompt,
  generateFlashcardsWithGemini,
  parseBatchFlashcards,
  type GeneratedCard,
} from '@/lib/aiFlashcards';
import type { DisciplineKey } from '@/types';

interface AiFlashcardModalProps {
  open: boolean;
  onClose: () => void;
}

const COUNT_OPTIONS = [5, 8, 12, 15];

export function AiFlashcardModal({ open, onClose }: AiFlashcardModalProps) {
  const { geminiApiKey, setGeminiApiKey, flashcards, setCardTags, showToast } = usePlexo();

  const [mode, setMode] = useState<'gemini' | 'batch'>('gemini');
  const [discipline, setDiscipline] = useState<DisciplineKey | ''>('MISCO');
  const [count, setCount] = useState<number>(8);

  // Gemini direct mode
  const [sourceText, setSourceText] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCards, setPreviewCards] = useState<(GeneratedCard & { selected: boolean })[]>([]);

  // Batch / Prompt mode
  const [batchText, setBatchText] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);

  const parsedBatch = useMemo(() => parseBatchFlashcards(batchText), [batchText]);

  const handleGenerate = async () => {
    if (!sourceText.trim() || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const cards = await generateFlashcardsWithGemini({
        apiKey: geminiApiKey,
        sourceText,
        discipline,
        count,
      });
      setPreviewCards(cards.map((c) => ({ ...c, selected: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar flashcards.');
    } finally {
      setGenerating(false);
    }
  };

  const saveCardsToAnki = async (cardsToSave: GeneratedCard[]) => {
    if (cardsToSave.length === 0 || savingBatch) return;
    setSavingBatch(true);
    const todayStr = getLocalDateString();
    const newTags: Record<string, DisciplineKey> = {};

    for (const c of cardsToSave) {
      const id = crypto.randomUUID();
      await flashcards.insert({
        id,
        front: c.front,
        back: c.back,
        next_review: todayStr,
        interval: 0,
      });
      if (discipline) {
        newTags[id] = discipline;
      }
    }

    if (Object.keys(newTags).length > 0) {
      setCardTags((prev) => ({ ...prev, ...newTags }));
    }

    setSavingBatch(false);
    setPreviewCards([]);
    setSourceText('');
    setBatchText('');
    showToast(`${cardsToSave.length} flashcard${cardsToSave.length > 1 ? 's' : ''} adicionado${cardsToSave.length > 1 ? 's' : ''} ao Anki!`);
    onClose();
  };

  const handleCopyPrompt = async () => {
    const prompt = buildFreeAiPrompt(discipline, count, sourceText);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      setError('Não foi possível copiar automaticamente.');
    }
  };

  const selectedCount = previewCards.filter((c) => c.selected).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Gerar Flashcards (Grátis)"
      subtitle="IA médica PBL ou colar vários de uma vez"
    >
      <div className="space-y-4">
        {/* Mode Switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-surface2 border border-line">
          <button
            type="button"
            onClick={() => {
              setMode('gemini');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'gemini' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'
            }`}
          >
            <Sparkles size={13} className={mode === 'gemini' ? 'text-accent' : ''} />
            IA Direto (Gemini)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('batch');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'batch' ? 'bg-surface text-ink shadow-sm' : 'text-ink2'
            }`}
          >
            <ClipboardPaste size={13} className={mode === 'batch' ? 'text-accent' : ''} />
            Prompt + Colar Lote
          </button>
        </div>

        {/* Shared Discipline & Quantity selectors */}
        <div>
          <label className="text-xs font-semibold text-ink2 block mb-1.5">
            Disciplina dos cartões
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDiscipline('')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
                discipline === ''
                  ? 'border-accent bg-accentSoft text-ink'
                  : 'border-line bg-surface2 text-ink2'
              }`}
            >
              Geral
            </button>
            {DISCIPLINE_LIST.filter((d) => d !== 'Outro').map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiscipline(d)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 ${
                  discipline === d
                    ? 'border-accent bg-accentSoft text-ink'
                    : 'border-line bg-surface2 text-ink2'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getDisciplineHex(d) }}
                />
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* === MODE 1: GEMINI DIRECT === */}
        {mode === 'gemini' && (
          <div className="space-y-3.5">
            {!geminiApiKey ? (
              <div className="p-3.5 rounded-2xl bg-surface2 border border-line space-y-2.5">
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <KeyRound size={14} className="text-accent" />
                  Ative grátis em 30 segundos (R$ 0, sem cartão)
                </p>
                <ol className="text-[11px] text-ink2 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>
                    Acesse o{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink size={10} />
                    </a>{' '}
                    e clique em <strong>Create API key</strong>.
                  </li>
                  <li>Cole a chave abaixo (fica salva só neste celular).</li>
                </ol>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder="Cole sua chave AIza..."
                    className="plexo-input flex-1 !bg-surface text-xs font-mono"
                  />
                  <button
                    type="button"
                    disabled={!keyDraft.trim()}
                    onClick={() => {
                      setGeminiApiKey(keyDraft.trim());
                      setKeyDraft('');
                      showToast('Chave Gemini salva neste aparelho!');
                    }}
                    className="plexo-btn-primary text-xs !px-3.5"
                  >
                    Salvar
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  Prefere não usar chave? Troque para <strong>Prompt + Colar Lote</strong> acima.
                </p>
              </div>
            ) : previewCards.length === 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink2">Quantidade</label>
                  <div className="flex gap-1.5">
                    {COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCount(n)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border ${
                          count === n
                            ? 'bg-accentSoft border-accent text-accent'
                            : 'bg-surface2 border-line text-ink2'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink2 block mb-1.5">
                    Tema, resumo da Tutoria ou texto da aula
                  </label>
                  <textarea
                    rows={5}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Ex.: Cole seu resumo de MISCO/HAMA ou digite um tema como 'Calendário vacinal gestante e idoso PNI' ou 'Semiologia do aparelho respiratório: sopros, sibilos e estertores'..."
                    className="plexo-input w-full resize-none text-xs leading-relaxed"
                  />
                </div>

                {error && <p className="text-xs text-danger font-medium">{error}</p>}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!sourceText.trim() || generating}
                  className="plexo-btn-primary w-full py-2.5"
                >
                  {generating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Gerando {count} flashcards médicos...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Gerar {count} flashcards com IA
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Editable preview of AI-generated cards */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink">
                    Prévia ({selectedCount}/{previewCards.length} selecionados)
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewCards([])}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Gerar novamente
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {previewCards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-opacity ${
                        card.selected
                          ? 'bg-surface2 border-lineStrong'
                          : 'bg-surface2/40 border-line opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewCards((prev) =>
                              prev.map((c, i) =>
                                i === idx ? { ...c, selected: !c.selected } : c
                              )
                            )
                          }
                          className="text-accent mt-0.5 shrink-0"
                        >
                          {card.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <input
                            type="text"
                            value={card.front}
                            onChange={(e) =>
                              setPreviewCards((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, front: e.target.value } : c
                                )
                              )
                            }
                            className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none border-b border-transparent focus:border-accent pb-0.5"
                          />
                          <textarea
                            rows={2}
                            value={card.back}
                            onChange={(e) =>
                              setPreviewCards((prev) =>
                                prev.map((c, i) =>
                                  i === idx ? { ...c, back: e.target.value } : c
                                )
                              )
                            }
                            className="w-full bg-transparent text-xs text-ink2 focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={selectedCount === 0 || savingBatch}
                  onClick={() =>
                    saveCardsToAnki(previewCards.filter((c) => c.selected))
                  }
                  className="plexo-btn-primary w-full py-2.5"
                >
                  {savingBatch
                    ? 'Salvando no Anki...'
                    : `Salvar ${selectedCount} cartão${selectedCount > 1 ? 'ões' : ''} no Anki`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* === MODE 2: FREE PROMPT + BATCH PASTE (ZERO API KEY NEEDED) === */}
        {mode === 'batch' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-surface2 border border-line space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">
                  1. Copie o prompt para ChatGPT ou Gemini grátis
                </span>
                <div className="flex gap-1">
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                        count === n
                          ? 'bg-accentSoft border-accent text-accent'
                          : 'bg-surface border-line text-muted'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-ink2 leading-relaxed">
                Ótimo para mandar <strong>PDF ou foto dos slides</strong> direto no app grátis do ChatGPT/Gemini e depois colar o resultado aqui.
              </p>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="plexo-btn-ghost w-full text-xs !bg-surface"
              >
                {copiedPrompt ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    Prompt copiado! Agora cole no ChatGPT/Gemini
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copiar Prompt Médico ({count} cartões)
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink2">
                  2. Cole os cartões aqui (1 por linha)
                </label>
                {parsedBatch.length > 0 && (
                  <span className="text-[11px] font-semibold text-accent font-mono tabular-nums">
                    {parsedBatch.length} detectado{parsedBatch.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={'Formato: Pergunta ; Resposta\nEx.:\nVacinas ao nascer ; BCG e Hepatite B\nSinal de Blumberg ; Dor à descompressão brusca (irritação peritoneal)'}
                className="plexo-input w-full resize-none text-xs font-mono leading-relaxed"
              />
            </div>

            <button
              type="button"
              disabled={parsedBatch.length === 0 || savingBatch}
              onClick={() => saveCardsToAnki(parsedBatch)}
              className="plexo-btn-primary w-full py-2.5"
            >
              {savingBatch
                ? 'Importando...'
                : parsedBatch.length > 0
                ? `Importar ${parsedBatch.length} flashcard${parsedBatch.length > 1 ? 's' : ''}`
                : 'Cole pelo menos 1 linha (Pergunta ; Resposta)'}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
