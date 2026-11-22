import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  Search,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Layers,
  Flame,
} from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DisciplineBadge } from '@/components/ui/DisciplineBadge';
import { AiFlashcardModal } from '@/components/AiFlashcardModal';
import {
  DISCIPLINE_LIST,
  addDaysLocal,
  formatDateBR,
  getDisciplineHex,
  getLocalDateString,
} from '@/data/facapeDefaults';
import type { DisciplineKey, FlashcardRow } from '@/types';

type CardFilter = 'all' | 'due' | 'mastered';

function computeNextInterval(
  currentInterval: number,
  rating: 'again' | 'hard' | 'good' | 'easy'
): number {
  if (rating === 'again') return 0;
  if (rating === 'hard') return 1;
  if (rating === 'good') {
    if (currentInterval <= 0) return 1;
    if (currentInterval === 1) return 3;
    return Math.min(90, Math.round(currentInterval * 2));
  }
  if (currentInterval <= 0) return 4;
  if (currentInterval <= 2) return 7;
  return Math.min(120, Math.round(currentInterval * 2.5));
}

export default function AnkiTab() {
  const {
    flashcards,
    cardTags,
    setCardTags,
    pendingCardDraft,
    setPendingCardDraft,
    showToast,
  } = usePlexo();
  const todayStr = getLocalDateString();

  // Review session state — immutable ID queue snapshot + cram flag
  const [mode, setMode] = useState<'list' | 'review' | 'done'>('list');
  const [isCramMode, setIsCramMode] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [initialQueueSize, setInitialQueueSize] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Touch swipe tracking for one-handed mobile review
  const touchStartX = useRef<number | null>(null);

  // List filter / search
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CardFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('Todas');

  // Modals
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tag, setTag] = useState<DisciplineKey | ''>('');
  const [saving, setSaving] = useState(false);

  // Open pre-filled card modal when coming from Ciclo PBL objective!
  useEffect(() => {
    if (!pendingCardDraft) return;
    setEditingId(null);
    setFront(pendingCardDraft.front);
    setBack(pendingCardDraft.back);
    setTag(pendingCardDraft.discipline || '');
    setSheetOpen(true);
    setPendingCardDraft(null);
  }, [pendingCardDraft, setPendingCardDraft]);

  const cardsById = useMemo(() => {
    const map = new Map<string, FlashcardRow>();
    flashcards.data.forEach((c) => map.set(c.id, c));
    return map;
  }, [flashcards.data]);

  const dueCards = useMemo(
    () => flashcards.data.filter((c) => c.next_review <= todayStr),
    [flashcards.data, todayStr]
  );

  const masteredCount = useMemo(
    () => flashcards.data.filter((c) => c.interval >= 6).length,
    [flashcards.data]
  );

  const duplicateIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const c of flashcards.data) {
      const key = `${c.front.trim().toLowerCase()}||${c.back.trim().toLowerCase()}`;
      if (seen.has(key)) {
        dupes.push(c.id);
      } else {
        seen.add(key);
      }
    }
    return dupes;
  }, [flashcards.data]);

  const usedTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(cardTags).forEach((t) => set.add(t));
    return ['Todas', ...Array.from(set)];
  }, [cardTags]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flashcards.data.filter((c) => {
      if (filter === 'due' && c.next_review > todayStr) return false;
      if (filter === 'mastered' && c.interval < 6) return false;
      if (tagFilter !== 'Todas' && cardTags[c.id] !== tagFilter) return false;
      if (q && !c.front.toLowerCase().includes(q) && !c.back.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [flashcards.data, filter, tagFilter, cardTags, search, todayStr]);

  const startReview = (subset?: FlashcardRow[], cram = false) => {
    const list = subset && subset.length > 0 ? subset : dueCards;
    if (list.length === 0) return;
    const ids = list.map((c) => c.id);
    setReviewQueue(ids);
    setInitialQueueSize(ids.length);
    setReviewedCount(0);
    setFlipped(false);
    setIsCramMode(cram);
    setMode('review');
  };

  const currentCardId = reviewQueue[0];
  const currentCard = currentCardId ? cardsById.get(currentCardId) || null : null;

  const rateCard = useCallback(
    async (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentCard) return;

      // In cram ("Véspera de Prova") mode, only update schedule if card was due or missed
      if (!isCramMode || currentCard.next_review <= todayStr || rating === 'again') {
        const nextInterval = computeNextInterval(currentCard.interval || 0, rating);
        const nextDate = rating === 'again' ? todayStr : addDaysLocal(todayStr, nextInterval);

        await flashcards.update(currentCard.id, {
          next_review: nextDate,
          interval: nextInterval,
        });
      }

      setFlipped(false);

      setReviewQueue((prev) => {
        const [, ...rest] = prev;
        if (rating === 'again') {
          return [...rest, currentCard.id];
        }
        setReviewedCount((n) => n + 1);
        if (rest.length === 0) {
          setMode('done');
        }
        return rest;
      });
    },
    [currentCard, flashcards, todayStr, isCramMode]
  );

  // Keyboard shortcuts during review
  useEffect(() => {
    if (mode !== 'review') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped) {
        if (e.key === '1') rateCard('again');
        if (e.key === '2') rateCard('hard');
        if (e.key === '3') rateCard('good');
        if (e.key === '4') rateCard('easy');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, flipped, rateCard]);

  const openCreate = () => {
    setEditingId(null);
    setFront('');
    setBack('');
    setTag(tagFilter !== 'Todas' ? (tagFilter as DisciplineKey) : '');
    setSheetOpen(true);
  };

  const openEdit = (card: FlashcardRow) => {
    setEditingId(card.id);
    setFront(card.front);
    setBack(card.back);
    setTag(cardTags[card.id] || '');
    setSheetOpen(true);
  };

  const deleteCardWithUndo = async (card: FlashcardRow) => {
    const prevTag = cardTags[card.id];
    await flashcards.remove(card.id);
    showToast('Flashcard excluído', () => {
      flashcards.insert({
        id: card.id,
        front: card.front,
        back: card.back,
        next_review: card.next_review,
        interval: card.interval,
      });
      if (prevTag) {
        setCardTags((prev) => ({ ...prev, [card.id]: prevTag }));
      }
    });
  };

  const handleSave = async () => {
    if (!front.trim() || !back.trim() || saving) return;
    setSaving(true);

    if (editingId) {
      await flashcards.update(editingId, {
        front: front.trim(),
        back: back.trim(),
      });
      setCardTags((prev) => {
        const copy = { ...prev };
        if (tag) copy[editingId] = tag;
        else delete copy[editingId];
        return copy;
      });
    } else {
      const id = crypto.randomUUID();
      await flashcards.insert({
        id,
        front: front.trim(),
        back: back.trim(),
        next_review: todayStr,
        interval: 0,
      });
      if (tag) {
        setCardTags((prev) => ({ ...prev, [id]: tag }));
      }
    }

    setSaving(false);
    setSheetOpen(false);
  };

  const cleanDuplicates = async () => {
    for (const id of duplicateIds) {
      await flashcards.remove(id);
    }
    showToast('Cartões duplicados removidos!');
  };

  const isFilteredSubset = Boolean(search.trim() || tagFilter !== 'Todas');

  // === REVIEW MODE (One-handed thumb-zone + swipe to flip!) ===
  if (mode === 'review' && currentCard) {
    const cardTag = cardTags[currentCard.id];
    const goodDays = computeNextInterval(currentCard.interval || 0, 'good');
    const easyDays = computeNextInterval(currentCard.interval || 0, 'easy');
    const progressPct =
      initialQueueSize > 0
        ? Math.min(100, Math.round((reviewedCount / initialQueueSize) * 100))
        : 0;

    return (
      <div className="space-y-4 animate-in flex flex-col min-h-[calc(100vh-11rem)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode('list')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink2 hover:text-ink py-1"
          >
            <ArrowLeft size={15} />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            {isCramMode && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warm/15 text-warm">
                Véspera
              </span>
            )}
            <span className="font-mono text-xs text-muted tabular-nums">
              {reviewedCount}/{initialQueueSize} • restam {reviewQueue.length}
            </span>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Swipeable / Tappable Flashcard */}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = Math.abs(endX - touchStartX.current);
            touchStartX.current = null;
            if (delta > 45) {
              setFlipped((f) => !f);
            }
          }}
          className="w-full flex-1 plexo-card p-6 min-h-[260px] flex flex-col justify-between text-left transition-all hover:border-lineStrong active:scale-[0.99]"
        >
          <div className="flex items-center justify-between w-full">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                flipped ? 'bg-emerald-500/15 text-emerald-500' : 'bg-accentSoft text-accent'
              }`}
            >
              {flipped ? 'Resposta' : 'Pergunta'}
            </span>
            {cardTag && <DisciplineBadge category={cardTag} />}
          </div>

          <div className="py-6 text-center">
            <p className="text-base sm:text-lg font-medium text-ink leading-relaxed whitespace-pre-wrap">
              {flipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          <div className="text-center">
            <span className="text-[11px] text-muted">
              {flipped ? 'Avalie abaixo com um toque' : 'Toque ou deslize para revelar'}
            </span>
          </div>
        </button>

        {/* Comfortable Thumb-Zone Controls */}
        <div className="pt-1">
          {flipped ? (
            <div className="grid grid-cols-4 gap-2 animate-in">
              <button
                type="button"
                onClick={() => rateCard('again')}
                className="min-h-[58px] px-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:scale-95 transition-all"
              >
                <span className="block text-xs font-bold">Errei</span>
                <span className="block font-mono text-[10px] opacity-80 mt-0.5">agora</span>
              </button>
              <button
                type="button"
                onClick={() => rateCard('hard')}
                className="min-h-[58px] px-2 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 active:scale-95 transition-all"
              >
                <span className="block text-xs font-bold">Difícil</span>
                <span className="block font-mono text-[10px] opacity-80 mt-0.5">+1d</span>
              </button>
              <button
                type="button"
                onClick={() => rateCard('good')}
                className="min-h-[58px] px-2 rounded-2xl border border-sky-500/35 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 active:scale-95 transition-all"
              >
                <span className="block text-xs font-bold">Bom</span>
                <span className="block font-mono text-[10px] opacity-80 mt-0.5">+{goodDays}d</span>
              </button>
              <button
                type="button"
                onClick={() => rateCard('easy')}
                className="min-h-[58px] px-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                <span className="block text-xs font-bold">Fácil</span>
                <span className="block font-mono text-[10px] opacity-80 mt-0.5">+{easyDays}d</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="plexo-btn-primary w-full min-h-[54px] text-sm rounded-2xl"
            >
              Mostrar resposta
            </button>
          )}
        </div>
      </div>
    );
  }

  // === SESSION COMPLETED ===
  if (mode === 'done') {
    return (
      <div className="plexo-card p-8 text-center space-y-4 animate-in mt-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 size={26} />
        </div>
        <div>
          <h2 className="font-serif text-2xl text-ink">Revisão concluída!</h2>
          <p className="text-xs text-ink2 mt-1">
            Você revisou {reviewedCount} cartão{reviewedCount === 1 ? '' : 'ões'} nesta sessão.
          </p>
        </div>
        <button type="button" onClick={() => setMode('list')} className="plexo-btn-primary">
          Voltar aos cartões
        </button>
      </div>
    );
  }

  // === LIST MODE ===
  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-2 pt-1">
        <div>
          <p className="text-xs font-medium text-muted">
            Repetição espaçada • {flashcards.data.length} cartões
          </p>
          <h1 className="font-serif text-3xl text-ink tracking-tight leading-tight">Anki</h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="plexo-btn-ghost !py-2 !px-3 text-xs border-accent/35 text-accent bg-accentSoft hover:border-accent"
          >
            <Sparkles size={14} />
            IA / Lote
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="plexo-btn-primary !py-2 !px-3 text-xs"
          >
            <Plus size={15} />
            Cartão
          </button>
        </div>
      </div>

      {/* Review CTA Hero */}
      <div className="plexo-card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-ink tabular-nums">
              {dueCards.length}
            </span>
            <span className="text-xs font-semibold text-ink2">para revisar hoje</span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {dueCards.length === 0
              ? 'Tudo em dia! Use o modo Véspera para revisar antes da prova.'
              : `${masteredCount} dominado${masteredCount === 1 ? '' : 's'} • SM-2 ativo`}
          </p>
        </div>

        {dueCards.length > 0 ? (
          <button
            type="button"
            onClick={() => startReview(dueCards, false)}
            className="plexo-btn-primary !px-4 !py-2.5 text-xs shrink-0"
          >
            <RotateCcw size={14} />
            Revisar agora
          </button>
        ) : flashcards.data.length > 0 ? (
          <button
            type="button"
            onClick={() => startReview(flashcards.data, true)}
            className="plexo-btn-ghost text-xs shrink-0"
          >
            <Layers size={14} />
            Véspera (todos)
          </button>
        ) : null}
      </div>

      {/* Duplicate Cleanup Helper */}
      {duplicateIds.length > 0 && (
        <div className="rounded-2xl bg-warm/10 border border-warm/25 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink">
            <Sparkles size={14} className="text-warm shrink-0" />
            <span>
              Encontrei {duplicateIds.length} cartão{duplicateIds.length > 1 ? 'ões' : ''} duplicado
              {duplicateIds.length > 1 ? 's' : ''}.
            </span>
          </div>
          <button
            type="button"
            onClick={cleanDuplicates}
            className="text-xs font-semibold text-warm hover:underline shrink-0"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pergunta ou resposta..."
            className="plexo-input w-full !pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `Todos (${flashcards.data.length})` },
              { id: 'due', label: `Hoje (${dueCards.length})` },
              { id: 'mastered', label: `Dominados (${masteredCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-accentSoft border-accent text-accent'
                  : 'bg-surface border-line text-ink2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {usedTags.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {usedTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${
                  tagFilter === t
                    ? 'border-accent bg-accentSoft text-ink'
                    : 'border-line bg-surface2 text-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Pre-Exam Cram Action for active filter/discipline */}
        {isFilteredSubset && filteredCards.length > 0 && (
          <button
            type="button"
            onClick={() => startReview(filteredCards, true)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-warm/12 border border-warm/30 text-xs font-semibold text-warm flex items-center justify-center gap-2 hover:bg-warm/20 transition-colors"
          >
            <Flame size={14} />
            Modo Véspera: revisar estes {filteredCards.length} cartões agora
          </button>
        )}
      </div>

      {/* Card List */}
      <div className="plexo-card p-3">
        {filteredCards.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">
            {flashcards.data.length === 0
              ? 'Crie seu primeiro flashcard ou use "IA / Lote" para gerar vários de uma vez.'
              : 'Nenhum cartão encontrado com esse filtro.'}
          </p>
        ) : (
          <div className="divide-y divide-line">
            {filteredCards.map((card) => {
              const isDue = card.next_review <= todayStr;
              const t = cardTags[card.id];
              return (
                <div
                  key={card.id}
                  className="py-3 px-1.5 flex items-start justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono tabular-nums ${
                          isDue ? 'bg-warm/15 text-warm' : 'bg-surface2 text-muted'
                        }`}
                      >
                        {isDue ? 'Revisar hoje' : `Próx: ${formatDateBR(card.next_review)}`}
                      </span>
                      {t && <DisciplineBadge category={t} />}
                    </div>
                    <p className="text-sm font-semibold text-ink leading-snug">{card.front}</p>
                    <p className="text-xs text-ink2 mt-0.5 line-clamp-2">{card.back}</p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      aria-label="Editar cartão"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCardWithUndo(card)}
                      aria-label="Excluir cartão"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Single Flashcard Modal */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Editar flashcard' : 'Novo flashcard'}
        subtitle="Sincronizado na nuvem"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">
              Frente (Pergunta)
            </label>
            <textarea
              rows={3}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Ex.: Vacinas ao nascer (PNI)"
              className="plexo-input w-full resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">
              Verso (Resposta)
            </label>
            <textarea
              rows={3}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Ex.: BCG e Hepatite B"
              className="plexo-input w-full resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">
              Disciplina (opcional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTag('')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                  tag === ''
                    ? 'border-accent bg-accentSoft text-ink'
                    : 'border-line bg-surface2 text-ink2'
                }`}
              >
                Sem tag
              </button>
              {DISCIPLINE_LIST.filter((d) => d !== 'Outro').map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTag(d)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                    tag === d
                      ? 'border-accent bg-accentSoft text-ink'
                      : 'border-line bg-surface2 text-ink2'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getDisciplineHex(d) }}
                  />
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!front.trim() || !back.trim() || saving}
            className="plexo-btn-primary w-full"
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar flashcard'}
          </button>
        </div>
      </BottomSheet>

      {/* Free AI + Batch Import Modal */}
      <AiFlashcardModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
