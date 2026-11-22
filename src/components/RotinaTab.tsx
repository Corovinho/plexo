import { useMemo, useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Pencil,
  Clock,
  CalendarDays,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DisciplineBadge } from '@/components/ui/DisciplineBadge';
import {
  CUSTOM_COLOR_OPTIONS,
  DAYS_FULL_MON_FIRST,
  DAYS_SHORT,
  DISCIPLINE_LIST,
  formatDateBR,
  formatDuration,
  getDisciplineHex,
  getDisciplineMeta,
  getLocalDateString,
  getTodayMonIndex,
  timeToMinutes,
} from '@/data/facapeDefaults';
import type { DisciplineKey, ScheduleEventRow } from '@/types';

export default function RotinaTab() {
  const { schedule, absences, setAbsences, showToast } = usePlexo();
  const todayIdx = getTodayMonIndex();

  const [selectedDay, setSelectedDay] = useState<number>(todayIdx);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'absences'>('day');

  // Add / Edit class modal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDay, setFormDay] = useState<number>(todayIdx);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('Tutoria');
  const [title, setTitle] = useState('');
  const [customColor, setCustomColor] = useState(CUSTOM_COLOR_OPTIONS[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Faltômetro limit edit state
  const [editingLimitDisc, setEditingLimitDisc] = useState<DisciplineKey | null>(null);
  const [limitDraft, setLimitDraft] = useState('4');

  const eventsByDay = useMemo(() => {
    const map: Record<number, ScheduleEventRow[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    for (const ev of schedule.data) {
      if (map[ev.day]) map[ev.day].push(ev);
    }
    for (let d = 0; d < 7; d++) {
      map[d].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    }
    return map;
  }, [schedule.data]);

  const dayEvents = eventsByDay[selectedDay] || [];

  const totalWeeklyHours = useMemo(() => {
    const mins = schedule.data.reduce(
      (acc, e) => acc + Math.max(0, timeToMinutes(e.end_time) - timeToMinutes(e.start_time)),
      0
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  }, [schedule.data]);

  const openCreate = (dayIndex = selectedDay) => {
    setEditingId(null);
    setFormDay(dayIndex);
    setStartTime('08:00');
    setEndTime('10:00');
    setCategory('Tutoria');
    setTitle('');
    setCustomColor(CUSTOM_COLOR_OPTIONS[0].value);
    setFormError(null);
    setSheetOpen(true);
  };

  const openEdit = (ev: ScheduleEventRow) => {
    setEditingId(ev.id);
    setFormDay(ev.day);
    setStartTime(ev.start_time);
    setEndTime(ev.end_time);
    setCategory(ev.category);
    setTitle(ev.title);
    setCustomColor(ev.custom_color || CUSTOM_COLOR_OPTIONS[0].value);
    setFormError(null);
    setSheetOpen(true);
  };

  const deleteEventWithUndo = async (ev: ScheduleEventRow) => {
    await schedule.remove(ev.id);
    showToast(`"${ev.title}" removida da grade`, () => {
      schedule.insert({
        id: ev.id,
        day: ev.day,
        start_time: ev.start_time,
        end_time: ev.end_time,
        category: ev.category,
        title: ev.title,
        custom_color: ev.custom_color,
      });
    });
  };

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setFormError('Informe o horário de início e término.');
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setFormError('O horário de término precisa ser depois do início.');
      return;
    }
    if (saving) return;
    setSaving(true);
    setFormError(null);

    const payload = {
      day: formDay,
      start_time: startTime,
      end_time: endTime,
      category,
      title: title.trim() || category,
      custom_color: category === 'Outro' ? customColor : null,
    };

    if (editingId) {
      await schedule.update(editingId, payload);
    } else {
      await schedule.insert({ id: crypto.randomUUID(), ...payload });
    }

    setSelectedDay(formDay);
    setSaving(false);
    setSheetOpen(false);
  };

  // Faltômetro actions
  const addAbsence = (discipline: DisciplineKey) => {
    const todayStr = getLocalDateString();
    setAbsences((prev) =>
      prev.map((a) =>
        a.discipline === discipline
          ? { ...a, entries: [...a.entries, { id: crypto.randomUUID(), date: todayStr }] }
          : a
      )
    );
  };

  const removeLastAbsence = (discipline: DisciplineKey) => {
    setAbsences((prev) =>
      prev.map((a) =>
        a.discipline === discipline && a.entries.length > 0
          ? { ...a, entries: a.entries.slice(0, -1) }
          : a
      )
    );
  };

  const saveLimit = (discipline: DisciplineKey) => {
    const num = Math.max(1, Math.min(30, parseInt(limitDraft, 10) || 4));
    setAbsences((prev) =>
      prev.map((a) => (a.discipline === discipline ? { ...a, maxAllowed: num } : a))
    );
    setEditingLimitDisc(null);
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="space-y-4 animate-in">
      {/* Header Row */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-xs font-medium text-muted">
            Grade semanal • {totalWeeklyHours} de aulas
          </p>
          <h1 className="font-serif text-3xl text-ink tracking-tight leading-tight">
            Rotina FACAPE
          </h1>
        </div>

        {viewMode !== 'absences' && (
          <button
            type="button"
            onClick={() => openCreate(selectedDay)}
            className="plexo-btn-primary !py-2 !px-3.5 text-xs shrink-0"
          >
            <Plus size={15} />
            Aula
          </button>
        )}
      </div>

      {/* 3-Way View Switcher */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-surface border border-line">
        <button
          type="button"
          onClick={() => setViewMode('day')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'day' ? 'bg-surface2 text-ink shadow-sm' : 'text-ink2 hover:text-ink'
          }`}
        >
          <CalendarDays size={13} className={viewMode === 'day' ? 'text-accent' : ''} />
          Por Dia
        </button>
        <button
          type="button"
          onClick={() => setViewMode('week')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'week' ? 'bg-surface2 text-ink shadow-sm' : 'text-ink2 hover:text-ink'
          }`}
        >
          <LayoutGrid size={13} className={viewMode === 'week' ? 'text-accent' : ''} />
          Semana
        </button>
        <button
          type="button"
          onClick={() => setViewMode('absences')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'absences' ? 'bg-surface2 text-ink shadow-sm' : 'text-ink2 hover:text-ink'
          }`}
        >
          <ShieldAlert size={13} className={viewMode === 'absences' ? 'text-accent' : ''} />
          Faltas
        </button>
      </div>

      {/* === VIEW 1: POR DIA === */}
      {viewMode === 'day' && (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS_SHORT.map((day, i) => {
              const count = eventsByDay[i]?.length || 0;
              const isSelected = selectedDay === i;
              const isToday = i === todayIdx;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all relative ${
                    isSelected
                      ? 'bg-accent text-accentFg border-accent font-bold'
                      : isToday
                      ? 'bg-surface border-accent/50 text-ink font-semibold'
                      : 'bg-surface border-line text-ink2 hover:border-lineStrong'
                  }`}
                >
                  <span className="text-[11px]">{day}</span>
                  <div className="flex items-center gap-0.5 mt-1 h-1.5">
                    {count > 0 ? (
                      Array.from({ length: Math.min(count, 3) }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? 'bg-accentFg' : 'bg-accent'
                          }`}
                        />
                      ))
                    ) : (
                      <span className="w-1 h-1 rounded-full opacity-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="plexo-card p-4">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  {DAYS_FULL_MON_FIRST[selectedDay]}
                  {selectedDay === todayIdx && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accentSoft text-accent">
                      Hoje
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-muted mt-0.5">
                  {dayEvents.length === 0
                    ? 'Dia livre para estudo individual e revisão PBL'
                    : `${dayEvents.length} atividade${dayEvents.length > 1 ? 's' : ''} agendada${
                        dayEvents.length > 1 ? 's' : ''
                      }`}
                </p>
              </div>
            </div>

            {dayEvents.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-surface2/50 border border-dashed border-lineStrong">
                <p className="text-sm font-medium text-ink2">Nenhuma aula neste dia</p>
                <p className="text-xs text-muted mt-1">
                  Aproveite para estudar Tutoria, TBL ou revisar Anki.
                </p>
                <button
                  type="button"
                  onClick={() => openCreate(selectedDay)}
                  className="plexo-btn-ghost text-xs mt-3"
                >
                  <Plus size={14} />
                  Adicionar bloco de estudo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayEvents.map((ev) => {
                  const hex = getDisciplineHex(ev.category, ev.custom_color);
                  const meta = getDisciplineMeta(ev.category);
                  const duration = formatDuration(ev.start_time, ev.end_time);
                  const isLive =
                    selectedDay === todayIdx &&
                    timeToMinutes(ev.start_time) <= nowMinutes &&
                    nowMinutes < timeToMinutes(ev.end_time);

                  return (
                    <div
                      key={ev.id}
                      className={`rounded-2xl p-3.5 border transition-colors relative overflow-hidden ${
                        isLive
                          ? 'bg-accentSoft/40 border-accent/40'
                          : 'bg-surface2/60 border-line'
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 w-1.5"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="pl-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-ink">{ev.title}</h3>
                            <DisciplineBadge category={ev.category} customColor={ev.custom_color} />
                            {isLive && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent text-accentFg">
                                Agora
                              </span>
                            )}
                          </div>
                          {ev.title === ev.category && meta.fullName !== ev.title && (
                            <p className="text-xs text-ink2 mt-0.5">{meta.fullName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-ink2">
                            <Clock size={12} className="text-muted" />
                            <span className="font-mono tabular-nums font-medium">
                              {ev.start_time} — {ev.end_time}
                            </span>
                            {duration && <span className="text-[11px] text-muted">({duration})</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(ev)}
                            aria-label="Editar aula"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEventWithUndo(ev)}
                            aria-label="Excluir aula"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* === VIEW 2: SEMANA COMPLETA === */}
      {viewMode === 'week' && (
        <div className="space-y-2.5">
          {DAYS_FULL_MON_FIRST.map((dayName, dayIdx) => {
            const list = eventsByDay[dayIdx] || [];
            const isToday = dayIdx === todayIdx;

            return (
              <div
                key={dayName}
                className={`plexo-card p-3.5 transition-colors ${
                  isToday ? 'border-accent/40' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(dayIdx);
                      setViewMode('day');
                    }}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accentSoft text-accent">
                        Hoje
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreate(dayIdx)}
                    aria-label={`Adicionar aula em ${dayName}`}
                    className="text-muted hover:text-accent p-1 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {list.length === 0 ? (
                  <p className="text-xs text-muted">Livre</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {list.map((ev) => {
                      const hex = getDisciplineHex(ev.category, ev.custom_color);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => openEdit(ev)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface2 border border-line hover:border-lineStrong transition-colors text-left"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="text-xs font-semibold text-ink">{ev.title}</span>
                          <span className="font-mono text-[11px] text-muted tabular-nums">
                            {ev.start_time}–{ev.end_time}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === VIEW 3: FALTÔMETRO POR DISCIPLINA === */}
      {viewMode === 'absences' && (
        <div className="space-y-3">
          <div className="plexo-card p-3.5 flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-ink2 leading-relaxed">
              Controle suas faltas em cada módulo da FACAPE (limite padrão de 25%). Toque no limite para ajustar conforme a carga horária da disciplina.
            </p>
          </div>

          <div className="space-y-2.5">
            {absences.map((item) => {
              const count = item.entries.length;
              const ratio = item.maxAllowed > 0 ? count / item.maxAllowed : 0;
              const pct = Math.min(100, Math.round(ratio * 100));
              const remaining = Math.max(0, item.maxAllowed - count);
              const meta = getDisciplineMeta(item.discipline);

              const barColor =
                ratio >= 0.85 ? '#f43f5e' : ratio >= 0.6 ? '#f59e0b' : meta.hex;
              const statusText =
                count >= item.maxAllowed
                  ? 'Limite atingido!'
                  : remaining === 1
                  ? 'Resta apenas 1 falta'
                  : `Pode faltar mais ${remaining}x`;

              return (
                <div key={item.discipline} className="plexo-card p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <DisciplineBadge category={item.discipline} size="sm" />
                        {editingLimitDisc === item.discipline ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveLimit(item.discipline);
                            }}
                            className="inline-flex items-center gap-1"
                          >
                            <span className="text-[11px] text-muted">Máx:</span>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              autoFocus
                              value={limitDraft}
                              onChange={(e) => setLimitDraft(e.target.value)}
                              onBlur={() => saveLimit(item.discipline)}
                              className="plexo-input !py-0.5 !px-1.5 w-12 text-xs font-mono"
                            />
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLimitDisc(item.discipline);
                              setLimitDraft(String(item.maxAllowed));
                            }}
                            className="text-[11px] text-muted hover:text-ink underline decoration-dotted"
                          >
                            Limite: {item.maxAllowed}
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-xs font-medium mt-1 ${
                          count >= item.maxAllowed
                            ? 'text-danger'
                            : remaining === 1
                            ? 'text-warm'
                            : 'text-ink2'
                        }`}
                      >
                        {statusText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => removeLastAbsence(item.discipline)}
                        aria-label={`Remover falta em ${item.discipline}`}
                        className="w-8 h-8 rounded-xl bg-surface2 border border-line flex items-center justify-center text-ink disabled:opacity-35 hover:border-lineStrong transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-mono text-base font-bold text-ink tabular-nums w-8 text-center">
                        {count}/{item.maxAllowed}
                      </span>
                      <button
                        type="button"
                        onClick={() => addAbsence(item.discipline)}
                        aria-label={`Registrar falta em ${item.discipline}`}
                        className="w-8 h-8 rounded-xl bg-surface2 border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>

                  {item.entries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {item.entries.map((entry) => (
                        <span
                          key={entry.id}
                          className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-surface2 text-muted border border-line tabular-nums"
                        >
                          {formatDateBR(entry.date)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Event BottomSheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Editar aula ou bloco' : 'Nova aula ou bloco'}
        subtitle="Salvo na sua grade semanal"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Dia da semana</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_SHORT.map((d, idx) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormDay(idx)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    formDay === idx
                      ? 'bg-accent text-accentFg border-accent'
                      : 'bg-surface2 text-ink2 border-line'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="plexo-input w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="plexo-input w-full font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">Disciplina</label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINE_LIST.map((cat) => {
                const hex = getDisciplineHex(cat);
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      active
                        ? 'border-accent bg-accentSoft text-ink'
                        : 'border-line bg-surface2 text-ink2 hover:text-ink'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {category === 'Outro' && (
            <div>
              <label className="text-xs font-semibold text-ink2 block mb-1.5">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCustomColor(c.value)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      customColor === c.value
                        ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface'
                        : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1.5">
              Título / Local (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex.: ${category} — Lab 2`}
              className="plexo-input w-full"
            />
          </div>

          {formError && <p className="text-xs text-danger font-medium">{formError}</p>}

          <div className="flex gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={async () => {
                  const target = schedule.data.find((e) => e.id === editingId);
                  if (target) await deleteEventWithUndo(target);
                  setSheetOpen(false);
                }}
                className="plexo-btn-ghost text-danger border-danger/30 hover:bg-danger/10"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="plexo-btn-primary flex-1"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar à rotina'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
