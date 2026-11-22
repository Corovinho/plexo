import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Check,
  Trash2,
  Pencil,
  Award,
  ListChecks,
} from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DisciplineBadge } from '@/components/ui/DisciplineBadge';
import {
  DISCIPLINE_LIST,
  MONTH_NAMES,
  daysUntil,
  formatDateBR,
  getDisciplineHex,
  getLocalDateString,
  parseLocalDate,
} from '@/data/facapeDefaults';
import type { DisciplineKey, ExamItem, ExamPeriod } from '@/types';

const WEEKDAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const PERIODS: ExamPeriod[] = ['Manhã', 'Tarde', 'Noite'];

export default function ProvasTab() {
  const { exams, setExams, currentTerm } = usePlexo();
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Fixes the old September bug: always starts on the CURRENT month!
  const [viewMonth, setViewMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [termFilter, setTermFilter] = useState<string>('Todos');

  // Detail sheet (grade + checklist + notes)
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Create / Edit exam sheet
  const [formOpen, setFormOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formPeriod, setFormPeriod] = useState<ExamPeriod>('Manhã');
  const [formDiscipline, setFormDiscipline] = useState<DisciplineKey>('HAMA');
  const [formTerm, setFormTerm] = useState(currentTerm);

  const availableTerms = useMemo(() => {
    const set = new Set<string>(['2º Período', currentTerm]);
    exams.forEach((e) => set.add(e.term));
    return ['Todos', ...Array.from(set)];
  }, [exams, currentTerm]);

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => (termFilter === 'Todos' ? true : e.term === termFilter))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams, termFilter]);

  const gradedExams = useMemo(
    () => filteredExams.filter((e) => typeof e.grade === 'number'),
    [filteredExams]
  );

  const averageGrade = useMemo(() => {
    if (gradedExams.length === 0) return null;
    const sum = gradedExams.reduce((acc, e) => acc + (e.grade || 0), 0);
    return (sum / gradedExams.length).toFixed(1);
  }, [gradedExams]);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();

  const examsByDateMap = useMemo(() => {
    const map: Record<string, ExamItem[]> = {};
    for (const ex of filteredExams) {
      if (!map[ex.date]) map[ex.date] = [];
      map[ex.date].push(ex);
    }
    return map;
  }, [filteredExams]);

  const monthExams = useMemo(() => {
    return filteredExams.filter((ex) => {
      const d = parseLocalDate(ex.date);
      return d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month;
    });
  }, [filteredExams, viewMonth]);

  const visibleListExams = selectedDayStr ? examsByDateMap[selectedDayStr] || [] : monthExams;

  const upcomingExams = useMemo(() => {
    const ref = new Date(`${todayStr}T12:00:00`);
    return filteredExams.filter((ex) => daysUntil(ex.date, ref) >= 0);
  }, [filteredExams, todayStr]);

  const activeExam = useMemo(
    () => exams.find((e) => e.id === activeExamId) || null,
    [exams, activeExamId]
  );

  const prevMonth = () => {
    setSelectedDayStr(null);
    setViewMonth((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
    );
  };

  const nextMonth = () => {
    setSelectedDayStr(null);
    setViewMonth((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
    );
  };

  const goToday = () => {
    setSelectedDayStr(null);
    setViewMonth({ year: today.getFullYear(), month: today.getMonth() });
  };

  const openCreateForm = () => {
    setEditingExamId(null);
    setFormTitle('');
    setFormDate(selectedDayStr || todayStr);
    setFormPeriod('Manhã');
    setFormDiscipline('HAMA');
    setFormTerm(currentTerm);
    setFormOpen(true);
  };

  const openEditForm = (ex: ExamItem) => {
    setEditingExamId(ex.id);
    setFormTitle(ex.title);
    setFormDate(ex.date);
    setFormPeriod(ex.period);
    setFormDiscipline(ex.discipline);
    setFormTerm(ex.term);
    setActiveExamId(null);
    setFormOpen(true);
  };

  const handleSaveExam = () => {
    if (!formTitle.trim() || !formDate) return;
    if (editingExamId) {
      setExams((prev) =>
        prev.map((e) =>
          e.id === editingExamId
            ? {
                ...e,
                title: formTitle.trim(),
                date: formDate,
                period: formPeriod,
                discipline: formDiscipline,
                term: formTerm,
              }
            : e
        )
      );
    } else {
      const created: ExamItem = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        date: formDate,
        period: formPeriod,
        discipline: formDiscipline,
        term: formTerm,
        grade: null,
        notes: '',
        checklist: [],
      };
      setExams((prev) => [...prev, created]);
      const d = parseLocalDate(formDate);
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
    setFormOpen(false);
  };

  const updateExam = (id: string, patch: Partial<ExamItem>) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    setActiveExamId(null);
  };

  const addChecklistTopic = () => {
    if (!activeExam || !newCheckItem.trim()) return;
    const nextList = [
      ...(activeExam.checklist || []),
      { id: crypto.randomUUID(), text: newCheckItem.trim(), done: false },
    ];
    updateExam(activeExam.id, { checklist: nextList });
    setNewCheckItem('');
  };

  const formatCountdownPill = (dateStr: string) => {
    const diff = daysUntil(dateStr, today);
    if (diff < 0) return { label: 'Realizada', urgent: false, past: true };
    if (diff === 0) return { label: 'Hoje', urgent: true, past: false };
    if (diff === 1) return { label: 'Amanhã', urgent: true, past: false };
    if (diff <= 5) return { label: `Em ${diff}d`, urgent: true, past: false };
    return { label: `Em ${diff}d`, urgent: false, past: false };
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-medium text-muted">
            {upcomingExams.length} prova{upcomingExams.length === 1 ? '' : 's'} pela frente
            {averageGrade && ` • Média ${averageGrade}`}
          </p>
          <h1 className="font-serif text-3xl text-ink tracking-tight leading-tight">
            Provas & Notas
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="plexo-btn-primary !py-2 !px-3.5 text-xs shrink-0"
        >
          <Plus size={15} />
          Prova
        </button>
      </div>

      {/* Term Filter */}
      {availableTerms.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {availableTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setTermFilter(term)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                termFilter === term
                  ? 'bg-accentSoft border-accent text-accent'
                  : 'bg-surface border-line text-ink2 hover:text-ink'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Calendar Card */}
      <div className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface2 border border-line text-ink2 hover:text-ink transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface2 border border-line text-ink2 hover:text-ink transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-sm font-bold text-ink">
            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
          </h2>

          <button
            type="button"
            onClick={goToday}
            className="text-xs font-semibold text-accent hover:underline px-2 py-1"
          >
            Hoje
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {WEEKDAY_HEADERS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`;
            const dayExams = examsByDateMap[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDayStr === dateStr;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayStr((prev) => (prev === dateStr ? null : dateStr))}
                className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-accent text-accentFg font-bold'
                    : isToday
                    ? 'bg-accentSoft text-accent font-bold ring-1 ring-accent/50'
                    : dayExams.length > 0
                    ? 'text-ink font-semibold hover:bg-surface2'
                    : 'text-ink2/80 hover:bg-surface2/60'
                }`}
              >
                <span className="text-xs tabular-nums leading-none">{day}</span>
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {dayExams.slice(0, 3).map((ex) => (
                    <span
                      key={ex.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'currentColor'
                          : getDisciplineHex(ex.discipline),
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Month or Selected Day Exams */}
      <div className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">
            {selectedDayStr
              ? `Provas em ${formatDateBR(selectedDayStr)}`
              : `Provas — ${MONTH_NAMES[viewMonth.month]}`}
          </h2>
          {selectedDayStr && (
            <button
              type="button"
              onClick={() => setSelectedDayStr(null)}
              className="text-xs font-medium text-accent hover:underline"
            >
              Ver mês todo
            </button>
          )}
        </div>

        {visibleListExams.length === 0 ? (
          <p className="text-xs text-muted text-center py-5">
            Nenhuma avaliação marcada neste período.
          </p>
        ) : (
          <div className="space-y-2.5">
            {visibleListExams.map((ex) => {
              const badge = formatCountdownPill(ex.date);
              const hex = getDisciplineHex(ex.discipline);
              const totalTopics = ex.checklist?.length || 0;
              const doneTopics = ex.checklist?.filter((c) => c.done).length || 0;

              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setActiveExamId(ex.id)}
                  className={`w-full text-left rounded-2xl p-3.5 border transition-all hover:border-lineStrong relative overflow-hidden ${
                    badge.past
                      ? 'bg-surface2/35 border-line opacity-75'
                      : 'bg-surface2/65 border-line'
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="pl-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                          {formatDateBR(ex.date)}
                        </span>
                        <span className="text-[11px] text-muted flex items-center gap-1">
                          <Clock size={10} />
                          {ex.period}
                        </span>
                        <DisciplineBadge category={ex.discipline} />
                      </div>
                      <h3 className="text-sm font-bold text-ink mt-1">{ex.title}</h3>
                      {totalTopics > 0 && (
                        <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                          <ListChecks size={11} />
                          {doneTopics}/{totalTopics} tópicos revisados
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {typeof ex.grade === 'number' ? (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg tabular-nums ${
                            ex.grade >= 7
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          Nota {ex.grade.toFixed(1)}
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                            badge.past
                              ? 'bg-surface text-muted'
                              : badge.urgent
                              ? 'bg-warm/15 text-warm'
                              : 'bg-surface text-ink2'
                          }`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Timeline (all months ahead) */}
      <div className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">
            Reta final — Próximas avaliações
          </h2>
          <span className="font-mono text-xs text-muted tabular-nums">
            {upcomingExams.length}
          </span>
        </div>

        {upcomingExams.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            Todas as provas cadastradas já foram concluídas!
          </p>
        ) : (
          <div className="divide-y divide-line">
            {upcomingExams.map((ex) => {
              const badge = formatCountdownPill(ex.date);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setActiveExamId(ex.id)}
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:opacity-85 transition-opacity"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getDisciplineHex(ex.discipline) }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{ex.title}</p>
                      <p className="text-[11px] text-muted font-mono tabular-nums">
                        {formatDateBR(ex.date)} • {ex.period}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                      badge.urgent ? 'bg-warm/15 text-warm' : 'bg-surface2 text-ink2'
                    }`}
                  >
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Exam Study & Grade Detail Sheet */}
      <BottomSheet
        open={Boolean(activeExam)}
        onClose={() => setActiveExamId(null)}
        title={activeExam?.title || ''}
        subtitle={
          activeExam
            ? `${formatDateBR(activeExam.date)} • ${activeExam.period} • ${activeExam.term}`
            : ''
        }
      >
        {activeExam && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <DisciplineBadge category={activeExam.discipline} size="sm" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditForm(activeExam)}
                  className="plexo-btn-ghost !py-1.5 !px-2.5 text-xs"
                >
                  <Pencil size={13} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteExam(activeExam.id)}
                  aria-label="Excluir prova"
                  className="plexo-btn-ghost !py-1.5 !px-2.5 text-xs text-danger border-danger/30 hover:bg-danger/10"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Grade input */}
            <div className="p-3.5 rounded-2xl bg-surface2 border border-line">
              <label className="text-xs font-semibold text-ink2 flex items-center gap-1.5 mb-2">
                <Award size={14} className="text-accent" />
                Nota obtida (0 a 10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={activeExam.grade ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      updateExam(activeExam.id, { grade: null });
                    } else {
                      const num = Math.min(10, Math.max(0, Number(val)));
                      if (!Number.isNaN(num)) updateExam(activeExam.id, { grade: num });
                    }
                  }}
                  placeholder="Ex.: 8.5"
                  className="plexo-input w-28 font-mono tabular-nums"
                />
                {typeof activeExam.grade === 'number' && (
                  <span
                    className={`text-xs font-semibold ${
                      activeExam.grade >= 7 ? 'text-emerald-400' : 'text-warm'
                    }`}
                  >
                    {activeExam.grade >= 7 ? 'Acima da média (≥ 7,0)' : 'Atenção (< 7,0)'}
                  </span>
                )}
              </div>
            </div>

            {/* Study checklist for this exam */}
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-2">
                Tópicos para revisar
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addChecklistTopic();
                }}
                className="flex gap-2 mb-2.5"
              >
                <input
                  type="text"
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  placeholder="Ex.: Semiologia cardíaca, ECG..."
                  className="plexo-input flex-1"
                />
                <button
                  type="submit"
                  disabled={!newCheckItem.trim()}
                  className="plexo-btn-primary !px-3"
                >
                  <Plus size={15} />
                </button>
              </form>

              {(activeExam.checklist || []).length === 0 ? (
                <p className="text-xs text-muted">Nenhum tópico adicionado ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {(activeExam.checklist || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface2 border border-line"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateExam(activeExam.id, {
                            checklist: (activeExam.checklist || []).map((c) =>
                              c.id === item.id ? { ...c, done: !c.done } : c
                            ),
                          })
                        }
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          item.done
                            ? 'bg-accent border-accent text-accentFg'
                            : 'border-lineStrong bg-surface'
                        }`}
                      >
                        {item.done && <Check size={11} strokeWidth={3} />}
                      </button>
                      <span
                        className={`text-xs flex-1 ${
                          item.done ? 'line-through text-muted' : 'text-ink'
                        }`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateExam(activeExam.id, {
                            checklist: (activeExam.checklist || []).filter((c) => c.id !== item.id),
                          })
                        }
                        className="text-muted hover:text-danger p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">
                Observações (sala, referências, lembretes)
              </label>
              <textarea
                rows={3}
                value={activeExam.notes || ''}
                onChange={(e) => updateExam(activeExam.id, { notes: e.target.value })}
                placeholder="Ex.: Levar jaleco e estetoscópio..."
                className="plexo-input w-full resize-none"
              />
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Add / Edit Exam Modal */}
      <BottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingExamId ? 'Editar avaliação' : 'Nova avaliação'}
        subtitle="Calendário de provas FACAPE"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Nome da prova</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex.: AV1 Morfofuncional, OSCE HAMA..."
              className="plexo-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">Data</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="plexo-input w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">Turno</label>
              <div className="grid grid-cols-3 gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPeriod(p)}
                    className={`py-2 rounded-lg text-xs font-semibold border ${
                      formPeriod === p
                        ? 'bg-accent text-accentFg border-accent'
                        : 'bg-surface2 text-ink2 border-line'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Disciplina</label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINE_LIST.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormDiscipline(d)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                    formDiscipline === d
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

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Período</label>
            <input
              type="text"
              value={formTerm}
              onChange={(e) => setFormTerm(e.target.value)}
              placeholder="Ex.: 2º Período ou 3º Período"
              className="plexo-input w-full"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveExam}
            disabled={!formTitle.trim() || !formDate}
            className="plexo-btn-primary w-full"
          >
            {editingExamId ? 'Salvar alterações' : 'Adicionar ao calendário'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
