import { useMemo, useState } from 'react';
import {
  Clock,
  Target,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  Brain,
  Timer,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { DisciplineBadge } from '@/components/ui/DisciplineBadge';
import {
  DAYS_FULL_MON_FIRST,
  DAYS_FULL_SUN_FIRST,
  MONTH_NAMES,
  daysUntil,
  formatDateBR,
  formatDuration,
  getDisciplineHex,
  getLocalDateString,
  getTodayMonIndex,
  timeToMinutes,
} from '@/data/facapeDefaults';
import type { TabId } from '@/types';

interface HojeTabProps {
  onNavigate: (tab: TabId, subview?: string) => void;
}

export default function HojeTab({ onNavigate }: HojeTabProps) {
  const { schedule, goals, urgentTasks, flashcards, exams, pomodoroLog } = usePlexo();
  const [newGoal, setNewGoal] = useState('');
  const [newUrgent, setNewUrgent] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingUrgent, setSavingUrgent] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = `${DAYS_FULL_SUN_FIRST[now.getDay()]}, ${now.getDate()} de ${MONTH_NAMES[now.getMonth()]}`;

  const todayStr = getLocalDateString(now);
  const todayIdx = getTodayMonIndex(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEvents = useMemo(
    () =>
      schedule.data
        .filter((e) => e.day === todayIdx)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    [schedule.data, todayIdx]
  );

  // Determine current or next class across the week
  const liveOrNextClass = useMemo(() => {
    const ongoing = todayEvents.find(
      (e) => timeToMinutes(e.start_time) <= nowMinutes && nowMinutes < timeToMinutes(e.end_time)
    );
    if (ongoing) {
      const total = Math.max(1, timeToMinutes(ongoing.end_time) - timeToMinutes(ongoing.start_time));
      const elapsed = nowMinutes - timeToMinutes(ongoing.start_time);
      return {
        status: 'now' as const,
        event: ongoing,
        dayLabel: 'Agora',
        progress: Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))),
      };
    }

    const laterToday = todayEvents.find((e) => timeToMinutes(e.start_time) > nowMinutes);
    if (laterToday) {
      return {
        status: 'today' as const,
        event: laterToday,
        dayLabel: 'Hoje',
        progress: 0,
      };
    }

    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = (todayIdx + offset) % 7;
      const dayList = schedule.data
        .filter((e) => e.day === checkDay)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      if (dayList.length > 0) {
        return {
          status: 'upcoming' as const,
          event: dayList[0],
          dayLabel: offset === 1 ? 'Amanhã' : DAYS_FULL_MON_FIRST[checkDay].split('-')[0],
          progress: 0,
        };
      }
    }
    return null;
  }, [todayEvents, nowMinutes, todayIdx, schedule.data]);

  const upcomingExams = useMemo(() => {
    const ref = new Date(`${todayStr}T12:00:00`);
    return exams
      .filter((ex) => daysUntil(ex.date, ref) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams, todayStr]);

  const nextExam = upcomingExams[0] || null;
  const followingExams = upcomingExams.slice(1, 3);

  const dailyGoals = useMemo(
    () => goals.data.filter((g) => g.category === 'daily'),
    [goals.data]
  );
  const completedDailyCount = dailyGoals.filter((g) => g.completed).length;

  const dueFlashcardsCount = useMemo(
    () => flashcards.data.filter((c) => c.next_review <= todayStr).length,
    [flashcards.data, todayStr]
  );

  const todayFocusMinutes = useMemo(
    () =>
      pomodoroLog
        .filter((s) => s.date === todayStr)
        .reduce((acc, s) => acc + s.minutes, 0),
    [pomodoroLog, todayStr]
  );

  const addDailyGoal = async () => {
    const trimmed = newGoal.trim();
    if (!trimmed || savingGoal) return;
    setSavingGoal(true);
    setNewGoal('');
    await goals.insert({
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      category: 'daily',
    });
    setSavingGoal(false);
  };

  const addUrgent = async () => {
    const trimmed = newUrgent.trim();
    if (!trimmed || savingUrgent) return;
    setSavingUrgent(true);
    setNewUrgent('');
    await urgentTasks.insert({
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
    });
    setSavingUrgent(false);
  };

  const formatCountdown = (days: number) => {
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `Em ${days} dias`;
  };

  return (
    <div className="space-y-5 animate-in">
      {/* Editorial Greeting */}
      <div className="pt-1">
        <p className="text-xs font-medium text-muted tracking-wide">{dateLabel}</p>
        <h1 className="font-serif text-3xl text-ink tracking-tight mt-0.5 leading-tight">
          {greeting}, doutora.
        </h1>
      </div>

      {/* Next Exam Priority Banner */}
      {nextExam && (
        <button
          type="button"
          onClick={() => onNavigate('provas')}
          className="w-full text-left plexo-card p-4 transition-all hover:border-lineStrong group relative overflow-hidden"
        >
          <div
            className="absolute inset-y-0 left-0 w-1"
            style={{ backgroundColor: getDisciplineHex(nextExam.discipline) }}
          />
          <div className="pl-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock size={14} className="text-warm shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-warm">
                  Próxima prova • {formatCountdown(daysUntil(nextExam.date, now))}
                </span>
              </div>
              <ArrowRight
                size={15}
                className="text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all"
              />
            </div>

            <div className="flex items-baseline justify-between gap-3 mt-1.5">
              <h2 className="text-base font-bold text-ink">{nextExam.title}</h2>
              <span className="font-mono text-xs text-ink2 tabular-nums shrink-0">
                {formatDateBR(nextExam.date)} • {nextExam.period}
              </span>
            </div>

            {followingExams.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-line flex flex-wrap gap-x-4 gap-y-1">
                {followingExams.map((ex) => (
                  <span key={ex.id} className="text-[11px] text-ink2 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getDisciplineHex(ex.discipline) }}
                    />
                    <span className="font-medium text-ink">{ex.title}</span>
                    <span className="font-mono text-muted tabular-nums">
                      {formatDateBR(ex.date)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
      )}

      {/* Quick Action Metrics Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate('anki')}
          className="plexo-card p-3 text-left hover:border-lineStrong transition-colors"
        >
          <div className="flex items-center justify-between text-muted mb-1.5">
            <Brain size={15} className={dueFlashcardsCount > 0 ? 'text-accent' : 'text-muted'} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Anki</span>
          </div>
          <div className="font-mono text-lg font-semibold text-ink tabular-nums leading-none">
            {dueFlashcardsCount}
          </div>
          <p className="text-[11px] text-muted mt-1 truncate">
            {dueFlashcardsCount === 0 ? 'Tudo em dia' : 'para revisar'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('estudos', 'metas')}
          className="plexo-card p-3 text-left hover:border-lineStrong transition-colors"
        >
          <div className="flex items-center justify-between text-muted mb-1.5">
            <Target size={15} className="text-sky-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Metas</span>
          </div>
          <div className="font-mono text-lg font-semibold text-ink tabular-nums leading-none">
            {completedDailyCount}/{dailyGoals.length}
          </div>
          <p className="text-[11px] text-muted mt-1 truncate">metas de hoje</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('estudos', 'foco')}
          className="plexo-card p-3 text-left hover:border-lineStrong transition-colors"
        >
          <div className="flex items-center justify-between text-muted mb-1.5">
            <Timer size={15} className="text-warm" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Foco</span>
          </div>
          <div className="font-mono text-lg font-semibold text-ink tabular-nums leading-none">
            {todayFocusMinutes}m
          </div>
          <p className="text-[11px] text-muted mt-1 truncate">Pomodoro hoje</p>
        </button>
      </div>

      {/* Live / Today's Schedule */}
      <section className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Clock size={15} className="text-accent" />
            Cronograma de Hoje
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('rotina')}
            className="text-xs font-medium text-accent hover:underline"
          >
            Ver semana
          </button>
        </div>

        {todayEvents.length === 0 ? (
          <div className="rounded-xl bg-surface2/70 border border-line p-3.5">
            <p className="text-sm font-medium text-ink flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent" />
              Sem aulas presenciais hoje
            </p>
            {liveOrNextClass && (
              <p className="text-xs text-ink2 mt-1">
                Próxima aula:{' '}
                <span className="font-semibold text-ink">{liveOrNextClass.event.title}</span> —{' '}
                {liveOrNextClass.dayLabel},{' '}
                <span className="font-mono tabular-nums">
                  {liveOrNextClass.event.start_time}–{liveOrNextClass.event.end_time}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayEvents.map((ev) => {
              const hex = getDisciplineHex(ev.category, ev.custom_color);
              const isNow =
                timeToMinutes(ev.start_time) <= nowMinutes &&
                nowMinutes < timeToMinutes(ev.end_time);
              const isDone = nowMinutes >= timeToMinutes(ev.end_time);
              const duration = formatDuration(ev.start_time, ev.end_time);

              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isNow
                      ? 'bg-accentSoft/60 border-accent/40'
                      : 'bg-surface2/60 border-line'
                  } ${isDone ? 'opacity-55' : ''}`}
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">{ev.title}</span>
                      {isNow && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent text-accentFg">
                          Agora
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-ink2 tabular-nums">
                        {ev.start_time} — {ev.end_time}
                      </span>
                      {duration && (
                        <span className="text-[11px] text-muted">• {duration}</span>
                      )}
                    </div>
                  </div>
                  <DisciplineBadge category={ev.category} customColor={ev.custom_color} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily Goals */}
      <section className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Target size={15} className="text-accent" />
            Metas de Hoje
          </h2>
          {dailyGoals.length > 0 && (
            <span className="font-mono text-xs text-muted tabular-nums">
              {completedDailyCount}/{dailyGoals.length}
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addDailyGoal();
          }}
          className="flex gap-2 mb-3"
        >
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Adicionar meta para hoje..."
            className="plexo-input flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={!newGoal.trim() || savingGoal}
            aria-label="Adicionar meta"
            className="plexo-btn-primary !px-3.5 shrink-0"
          >
            <Plus size={16} />
          </button>
        </form>

        {dailyGoals.length === 0 ? (
          <p className="text-xs text-muted py-2 text-center">
            Nenhuma meta diária ainda. Defina o foco do dia acima.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {dailyGoals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0">
                <button
                  type="button"
                  onClick={() => goals.update(goal.id, { completed: !goal.completed })}
                  aria-label={goal.completed ? 'Desmarcar meta' : 'Concluir meta'}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    goal.completed
                      ? 'bg-accent border-accent text-accentFg'
                      : 'border-lineStrong bg-surface2 hover:border-accent'
                  }`}
                >
                  {goal.completed && <Check size={13} strokeWidth={3} />}
                </button>
                <span
                  onClick={() => goals.update(goal.id, { completed: !goal.completed })}
                  className={`text-sm flex-1 cursor-pointer select-none leading-snug ${
                    goal.completed ? 'line-through text-muted' : 'text-ink'
                  }`}
                >
                  {goal.text}
                </span>
                <button
                  type="button"
                  onClick={() => goals.remove(goal.id)}
                  aria-label="Excluir meta"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Urgent Tasks */}
      <section className="plexo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <AlertCircle size={15} className="text-warm" />
            Pendências Urgentes
          </h2>
          {urgentTasks.data.filter((t) => !t.completed).length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warm/15 text-warm tabular-nums">
              {urgentTasks.data.filter((t) => !t.completed).length} abertas
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addUrgent();
          }}
          className="flex gap-2 mb-3"
        >
          <input
            type="text"
            value={newUrgent}
            onChange={(e) => setNewUrgent(e.target.value)}
            placeholder="Adicionar pendência urgente..."
            className="plexo-input flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={!newUrgent.trim() || savingUrgent}
            aria-label="Adicionar pendência"
            className="plexo-btn-primary !px-3.5 shrink-0"
          >
            <Plus size={16} />
          </button>
        </form>

        {urgentTasks.data.length === 0 ? (
          <p className="text-xs text-muted py-2 text-center">Nenhuma pendência urgente.</p>
        ) : (
          <div className="divide-y divide-line">
            {[...urgentTasks.data]
              .sort((a, b) => Number(a.completed) - Number(b.completed))
              .map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0">
                  <button
                    type="button"
                    onClick={() => urgentTasks.update(task.id, { completed: !task.completed })}
                    aria-label={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      task.completed
                        ? 'bg-warm border-warm text-black'
                        : 'border-lineStrong bg-surface2 hover:border-warm'
                    }`}
                  >
                    {task.completed && <Check size={13} strokeWidth={3} />}
                  </button>
                  <span
                    onClick={() => urgentTasks.update(task.id, { completed: !task.completed })}
                    className={`text-sm flex-1 cursor-pointer select-none leading-snug ${
                      task.completed ? 'line-through text-muted' : 'text-ink'
                    }`}
                  >
                    {task.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => urgentTasks.remove(task.id)}
                    aria-label="Excluir tarefa"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
