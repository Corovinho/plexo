import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  BookOpenCheck,
  Target,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  Eye,
  EyeOff,
  Brain,
  Archive,
} from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DisciplineBadge } from '@/components/ui/DisciplineBadge';
import {
  DISCIPLINE_LIST,
  PBL_STAGES,
  POMODORO_PRESETS,
  getDisciplineHex,
  getLocalDateString,
} from '@/data/facapeDefaults';
import type { DisciplineKey, DraftFlashcard, GoalCategory, GoalRow, PblCase, PblStage } from '@/types';

type EstudosSubview = 'pbl' | 'metas' | 'foco';

interface EstudosTabProps {
  initialSubview?: string;
  onSubviewChange?: (sub: EstudosSubview) => void;
  onSendToAnki: (draft: DraftFlashcard) => void;
}

export default function EstudosTab({
  initialSubview,
  onSubviewChange,
  onSendToAnki,
}: EstudosTabProps) {
  const {
    goals,
    pblCases,
    setPblCases,
    pomodoro,
    pomodoroLog,
    currentTerm,
    showToast,
  } = usePlexo();

  const [subview, setSubviewState] = useState<EstudosSubview>(() => {
    if (initialSubview === 'metas' || initialSubview === 'foco' || initialSubview === 'pbl') {
      return initialSubview;
    }
    return 'pbl';
  });

  const setSubview = (next: EstudosSubview) => {
    setSubviewState(next);
    onSubviewChange?.(next);
  };

  useEffect(() => {
    if (initialSubview === 'metas' || initialSubview === 'foco' || initialSubview === 'pbl') {
      setSubviewState(initialSubview);
    }
  }, [initialSubview]);

  // --- PBL State ---
  const [pblSheetOpen, setPblSheetOpen] = useState(false);
  const [pblTitle, setPblTitle] = useState('');
  const [pblDiscipline, setPblDiscipline] = useState<DisciplineKey>('Tutoria');
  const [showArchivedPbl, setShowArchivedPbl] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(
    pblCases.find((c) => !c.archived)?.id || null
  );
  const [newObjectiveByCase, setNewObjectiveByCase] = useState<Record<string, string>>({});

  // --- Metas State ---
  const [goalInputs, setGoalInputs] = useState<Record<GoalCategory, string>>({
    daily: '',
    weekly: '',
    tasks: '',
  });
  const [hideCompletedGoals, setHideCompletedGoals] = useState(false);
  const [openGoalSections, setOpenGoalSections] = useState<Record<GoalCategory, boolean>>({
    daily: true,
    weekly: true,
    tasks: true,
  });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState('');

  const visiblePblCases = useMemo(
    () => pblCases.filter((c) => (showArchivedPbl ? true : !c.archived)),
    [pblCases, showArchivedPbl]
  );

  const archivedCount = useMemo(
    () => pblCases.filter((c) => c.archived).length,
    [pblCases]
  );

  const todayStr = getLocalDateString();
  const todayMinutes = useMemo(
    () => pomodoroLog.filter((s) => s.date === todayStr).reduce((acc, s) => acc + s.minutes, 0),
    [pomodoroLog, todayStr]
  );

  const createPblCase = () => {
    if (!pblTitle.trim()) return;
    const item: PblCase = {
      id: crypto.randomUUID(),
      title: pblTitle.trim(),
      discipline: pblDiscipline,
      stage: 0,
      objectives: [],
      notes: '',
      term: currentTerm,
      archived: false,
      updatedAt: getLocalDateString(),
    };
    setPblCases((prev) => [item, ...prev]);
    setExpandedCaseId(item.id);
    setPblTitle('');
    setPblSheetOpen(false);
  };

  const updatePblCase = (id: string, patch: Partial<PblCase>) => {
    setPblCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: getLocalDateString() } : c))
    );
  };

  const removePblCase = (item: PblCase) => {
    setPblCases((prev) => prev.filter((c) => c.id !== item.id));
    showToast(`"${item.title}" removido`, () => {
      setPblCases((prev) => [item, ...prev]);
    });
  };

  const addObjective = (caseId: string) => {
    const text = (newObjectiveByCase[caseId] || '').trim();
    if (!text) return;
    setPblCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              objectives: [...c.objectives, { id: crypto.randomUUID(), text, done: false }],
              updatedAt: getLocalDateString(),
            }
          : c
      )
    );
    setNewObjectiveByCase((prev) => ({ ...prev, [caseId]: '' }));
  };

  const addGoal = async (category: GoalCategory) => {
    const text = goalInputs[category].trim();
    if (!text) return;
    setGoalInputs((prev) => ({ ...prev, [category]: '' }));
    await goals.insert({
      id: crypto.randomUUID(),
      text,
      completed: false,
      category,
    });
  };

  const deleteGoalWithUndo = async (goal: GoalRow) => {
    await goals.remove(goal.id);
    showToast('Meta excluída', () => {
      goals.insert({
        id: goal.id,
        text: goal.text,
        completed: goal.completed,
        category: goal.category,
      });
    });
  };

  const saveEditGoal = async () => {
    if (!editingGoalId || !editingGoalText.trim()) {
      setEditingGoalId(null);
      return;
    }
    await goals.update(editingGoalId, { text: editingGoalText.trim() });
    setEditingGoalId(null);
  };

  const activePreset = POMODORO_PRESETS[pomodoro.presetIdx] || POMODORO_PRESETS[0];
  const minutesDisplay = String(Math.floor(pomodoro.secondsLeft / 60)).padStart(2, '0');
  const secondsDisplay = String(pomodoro.secondsLeft % 60).padStart(2, '0');
  const progressRatio =
    pomodoro.totalSeconds > 0 ? 1 - pomodoro.secondsLeft / pomodoro.totalSeconds : 0;
  const ringRadius = 82;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-medium text-muted">Ciclo PBL, metas e foco médico</p>
          <h1 className="font-serif text-3xl text-ink tracking-tight leading-tight">Estudos</h1>
        </div>
        {subview === 'pbl' && (
          <button
            type="button"
            onClick={() => setPblSheetOpen(true)}
            className="plexo-btn-primary !py-2 !px-3.5 text-xs shrink-0"
          >
            <Plus size={15} />
            Problema
          </button>
        )}
      </div>

      {/* Segmented Control */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-surface border border-line">
        {(
          [
            { id: 'pbl', label: 'Ciclo PBL', icon: BookOpenCheck },
            { id: 'metas', label: 'Metas', icon: Target },
            { id: 'foco', label: 'Foco', icon: Timer },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = subview === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubview(item.id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                active ? 'bg-surface2 text-ink shadow-sm' : 'text-ink2 hover:text-ink'
              }`}
            >
              <Icon size={14} className={active ? 'text-accent' : ''} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* === SUBVIEW 1: CICLO PBL === */}
      {subview === 'pbl' && (
        <div className="space-y-3">
          {archivedCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowArchivedPbl((v) => !v)}
                className="text-xs font-medium text-ink2 hover:text-ink inline-flex items-center gap-1.5"
              >
                <Archive size={13} />
                {showArchivedPbl
                  ? 'Ocultar períodos anteriores'
                  : `Ver ${archivedCount} arquivado${archivedCount > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {visiblePblCases.length === 0 ? (
            <div className="plexo-card p-8 text-center">
              <p className="text-sm font-medium text-ink">Nenhum problema PBL ativo</p>
              <p className="text-xs text-muted mt-1">
                Acompanhe cada Tutoria, TBL ou MISCO da abertura ao fechamento.
              </p>
              <button
                type="button"
                onClick={() => setPblSheetOpen(true)}
                className="plexo-btn-primary text-xs mt-4"
              >
                <Plus size={14} />
                Novo problema PBL
              </button>
            </div>
          ) : (
            visiblePblCases.map((item) => {
              const isExpanded = expandedCaseId === item.id;
              const hex = getDisciplineHex(item.discipline);
              const doneObj = item.objectives.filter((o) => o.done).length;

              return (
                <div
                  key={item.id}
                  className={`plexo-card overflow-hidden ${item.archived ? 'opacity-70' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCaseId(isExpanded ? null : item.id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-surface2/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DisciplineBadge category={item.discipline} />
                        <span className="text-[11px] font-medium text-muted">
                          Etapa: <strong className="text-ink">{PBL_STAGES[item.stage].label}</strong>
                        </span>
                        {item.archived && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-muted">
                            {item.term}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-ink mt-1.5">{item.title}</h3>
                      {item.objectives.length > 0 && (
                        <p className="text-[11px] text-muted mt-1">
                          {doneObj}/{item.objectives.length} objetivos concluídos
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-muted shrink-0 transition-transform mt-1 ${
                        isExpanded ? 'rotate-180 text-accent' : ''
                      }`}
                    />
                  </button>

                  {/* 4-Step PBL Progress Bar */}
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-4 gap-1.5">
                      {PBL_STAGES.map((st) => {
                        const reached = item.stage >= st.stage;
                        const current = item.stage === st.stage;
                        return (
                          <button
                            key={st.stage}
                            type="button"
                            onClick={() => updatePblCase(item.id, { stage: st.stage as PblStage })}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all border ${
                              current
                                ? 'border-accent bg-accentSoft text-accent'
                                : reached
                                ? 'border-transparent text-ink bg-surface2'
                                : 'border-line text-muted bg-transparent hover:text-ink2'
                            }`}
                          >
                            <span
                              className="block h-1 rounded-full mb-1"
                              style={{
                                backgroundColor: reached ? hex : 'var(--border-strong)',
                              }}
                            />
                            {st.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded Objectives + Notes */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-line space-y-3 bg-surface2/25">
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                          Objetivos de Aprendizagem
                        </label>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            addObjective(item.id);
                          }}
                          className="flex gap-2 mb-2.5"
                        >
                          <input
                            type="text"
                            value={newObjectiveByCase[item.id] || ''}
                            onChange={(e) =>
                              setNewObjectiveByCase((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Adicionar objetivo da abertura..."
                            className="plexo-input flex-1 !py-2 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={!(newObjectiveByCase[item.id] || '').trim()}
                            className="plexo-btn-primary !px-3 !py-2"
                          >
                            <Plus size={14} />
                          </button>
                        </form>

                        <div className="space-y-1.5">
                          {item.objectives.map((obj) => (
                            <div
                              key={obj.id}
                              className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-surface border border-line"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updatePblCase(item.id, {
                                    objectives: item.objectives.map((o) =>
                                      o.id === obj.id ? { ...o, done: !o.done } : o
                                    ),
                                  })
                                }
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  obj.done
                                    ? 'bg-accent border-accent text-accentFg'
                                    : 'border-lineStrong bg-surface2'
                                }`}
                              >
                                {obj.done && <Check size={11} strokeWidth={3} />}
                              </button>
                              <span
                                className={`text-xs flex-1 ${
                                  obj.done ? 'line-through text-muted' : 'text-ink'
                                }`}
                              >
                                {obj.text}
                              </span>
                              {/* 1-tap shortcut: send learning objective directly to Anki! */}
                              <button
                                type="button"
                                title="Transformar objetivo em flashcard no Anki"
                                onClick={() =>
                                  onSendToAnki({
                                    front: `${item.title}: ${obj.text}`,
                                    back: '',
                                    discipline: item.discipline,
                                  })
                                }
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent hover:bg-accentSoft transition-colors shrink-0"
                              >
                                <Brain size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updatePblCase(item.id, {
                                    objectives: item.objectives.filter((o) => o.id !== obj.id),
                                  })
                                }
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger transition-colors shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                          Anotações / Referências (Guyton, Porto, Harrison...)
                        </label>
                        <textarea
                          rows={2}
                          value={item.notes}
                          onChange={(e) => updatePblCase(item.id, { notes: e.target.value })}
                          placeholder="Capítulos, dúvidas para o tutor..."
                          className="plexo-input w-full text-xs resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePblCase(item)}
                          className="text-xs text-muted hover:text-danger inline-flex items-center gap-1 py-1"
                        >
                          <Trash2 size={12} />
                          Remover problema
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* === SUBVIEW 2: METAS & TAREFAS (Supabase-synced + Inline Edit + Undo) === */}
      {subview === 'metas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted">Sincronizado com suas metas salvas</span>
            <button
              type="button"
              onClick={() => setHideCompletedGoals((v) => !v)}
              className="text-xs font-medium text-ink2 hover:text-ink inline-flex items-center gap-1.5"
            >
              {hideCompletedGoals ? <Eye size={13} /> : <EyeOff size={13} />}
              {hideCompletedGoals ? 'Mostrar concluídas' : 'Ocultar concluídas'}
            </button>
          </div>

          {(
            [
              { category: 'daily' as const, title: 'Metas Diárias' },
              { category: 'weekly' as const, title: 'Metas Semanais' },
              { category: 'tasks' as const, title: 'Gerenciador de Tarefas' },
            ]
          ).map(({ category, title }) => {
            const allItems = goals.data.filter((g) => g.category === category);
            const completedCount = allItems.filter((g) => g.completed).length;
            const visibleItems = hideCompletedGoals
              ? allItems.filter((g) => !g.completed)
              : [...allItems].sort((a, b) => Number(a.completed) - Number(b.completed));
            const isOpen = openGoalSections[category];
            const pct =
              allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

            return (
              <div key={category} className="plexo-card overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGoalSections((prev) => ({ ...prev, [category]: !prev[category] }))
                  }
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-surface2/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-ink">{title}</span>
                    <span className="font-mono text-[11px] text-muted tabular-nums">
                      {completedCount}/{allItems.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {allItems.length > 0 && (
                      <div className="w-14 h-1.5 rounded-full bg-surface2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-line">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        addGoal(category);
                      }}
                      className="flex gap-2 mb-3"
                    >
                      <input
                        type="text"
                        value={goalInputs[category]}
                        onChange={(e) =>
                          setGoalInputs((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                        placeholder="Adicionar item..."
                        className="plexo-input flex-1 !py-2"
                      />
                      <button
                        type="submit"
                        disabled={!goalInputs[category].trim()}
                        className="plexo-btn-primary !px-3 !py-2"
                      >
                        <Plus size={15} />
                      </button>
                    </form>

                    {visibleItems.length === 0 ? (
                      <p className="text-xs text-muted py-2 text-center">
                        {hideCompletedGoals && allItems.length > 0
                          ? 'Tudo concluído nesta lista!'
                          : 'Nenhum item adicionado.'}
                      </p>
                    ) : (
                      <div className="divide-y divide-line">
                        {visibleItems.map((goal) => (
                          <div key={goal.id} className="flex items-center gap-2.5 py-2">
                            <button
                              type="button"
                              onClick={() => goals.update(goal.id, { completed: !goal.completed })}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                goal.completed
                                  ? 'bg-accent border-accent text-accentFg'
                                  : 'border-lineStrong bg-surface2 hover:border-accent'
                              }`}
                            >
                              {goal.completed && <Check size={12} strokeWidth={3} />}
                            </button>

                            {editingGoalId === goal.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  saveEditGoal();
                                }}
                                className="flex items-center gap-1.5 flex-1 min-w-0"
                              >
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingGoalText}
                                  onChange={(e) => setEditingGoalText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Escape' && setEditingGoalId(null)}
                                  className="plexo-input flex-1 !py-1 !px-2 text-sm min-w-0"
                                />
                                <button
                                  type="submit"
                                  className="w-7 h-7 rounded-lg bg-accent text-accentFg flex items-center justify-center shrink-0"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGoalId(null)}
                                  className="w-7 h-7 rounded-lg bg-surface2 text-muted flex items-center justify-center shrink-0"
                                >
                                  <X size={14} />
                                </button>
                              </form>
                            ) : (
                              <>
                                <span
                                  onClick={() =>
                                    goals.update(goal.id, { completed: !goal.completed })
                                  }
                                  className={`text-sm flex-1 cursor-pointer select-none ${
                                    goal.completed ? 'line-through text-muted' : 'text-ink'
                                  }`}
                                >
                                  {goal.text}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGoalId(goal.id);
                                    setEditingGoalText(goal.text);
                                  }}
                                  aria-label="Editar meta"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition-colors shrink-0"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteGoalWithUndo(goal)}
                                  aria-label="Excluir meta"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === SUBVIEW 3: FOCO (GLOBAL PERSISTENT POMODORO) === */}
      {subview === 'foco' && (
        <div className="space-y-4">
          <div className="plexo-card p-5 flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-1.5 mb-5">
              {POMODORO_PRESETS.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => pomodoro.selectPreset(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    pomodoro.presetIdx === idx
                      ? 'bg-accentSoft border-accent text-accent'
                      : 'bg-surface2 border-line text-ink2 hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r={ringRadius}
                  fill="none"
                  stroke="var(--surface-2)"
                  strokeWidth="8"
                />
                <circle
                  cx="96"
                  cy="96"
                  r={ringRadius}
                  fill="none"
                  stroke={
                    activePreset.kind === 'focus'
                      ? getDisciplineHex(pomodoro.discipline)
                      : '#10b981'
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke-dashoffset] duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-4xl font-semibold text-ink tabular-nums tracking-tight">
                  {minutesDisplay}:{secondsDisplay}
                </span>
                <span className="text-[11px] font-medium text-muted mt-1">
                  {activePreset.kind === 'focus' ? pomodoro.discipline : 'Descanso'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={pomodoro.reset}
                aria-label="Reiniciar timer"
                className="plexo-btn-ghost !p-3"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={pomodoro.toggleRun}
                className="plexo-btn-primary !px-7 !py-3 text-sm"
              >
                {pomodoro.running ? <Pause size={16} /> : <Play size={16} />}
                {pomodoro.running
                  ? 'Pausar'
                  : pomodoro.secondsLeft < pomodoro.totalSeconds && pomodoro.secondsLeft > 0
                  ? 'Continuar'
                  : 'Iniciar foco'}
              </button>
            </div>

            <p className="text-[11px] text-muted text-center mt-3">
              Continua rodando mesmo se você for para o Anki ou bloquear o celular.
            </p>

            <div className="w-full mt-5 pt-4 border-t border-line">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted text-center mb-2.5">
                Matéria do bloco
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {DISCIPLINE_LIST.filter((d) => d !== 'Outro').map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pomodoro.setDiscipline(d)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      pomodoro.discipline === d
                        ? 'border-accent bg-accentSoft text-ink'
                        : 'border-line bg-surface2 text-ink2'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="plexo-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Foco acumulado hoje</p>
              <p className="font-mono text-xl font-bold text-ink tabular-nums mt-0.5">
                {todayMinutes} min
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted">Sessões concluídas</p>
              <p className="font-mono text-xl font-bold text-accent tabular-nums mt-0.5">
                {pomodoroLog.filter((s) => s.date === todayStr).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add PBL Problem Sheet */}
      <BottomSheet
        open={pblSheetOpen}
        onClose={() => setPblSheetOpen(false)}
        title="Novo problema PBL"
        subtitle="Acompanhe Abertura → Objetivos → Estudo → Fechamento"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">
              Nome do problema / sessão
            </label>
            <input
              type="text"
              value={pblTitle}
              onChange={(e) => setPblTitle(e.target.value)}
              placeholder="Ex.: Tutoria 2.5 — Dor torácica"
              className="plexo-input w-full"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Disciplina</label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINE_LIST.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPblDiscipline(d)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                    pblDiscipline === d
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
            onClick={createPblCase}
            disabled={!pblTitle.trim()}
            className="plexo-btn-primary w-full"
          >
            Criar problema PBL
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
