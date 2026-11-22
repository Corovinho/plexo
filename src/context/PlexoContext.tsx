import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  FALLBACK_SCHEDULE,
  INITIAL_FACAPE_EXAMS,
  INITIAL_PBL_CASES,
} from '@/data/facapeDefaults';
import type {
  DisciplineKey,
  ExamItem,
  FlashcardRow,
  GoalRow,
  PblCase,
  PomodoroSession,
  ScheduleEventRow,
  ThemeMode,
  UrgentTaskRow,
} from '@/types';

interface PlexoContextValue {
  // Supabase-backed tables (100% synced with live DB)
  schedule: ReturnType<typeof useSupabaseTable<ScheduleEventRow>>;
  goals: ReturnType<typeof useSupabaseTable<GoalRow>>;
  urgentTasks: ReturnType<typeof useSupabaseTable<UrgentTaskRow>>;
  flashcards: ReturnType<typeof useSupabaseTable<FlashcardRow>>;

  // Local-enhanced medical student data
  exams: ExamItem[];
  setExams: (value: ExamItem[] | ((prev: ExamItem[]) => ExamItem[])) => void;

  pblCases: PblCase[];
  setPblCases: (value: PblCase[] | ((prev: PblCase[]) => PblCase[])) => void;

  cardTags: Record<string, DisciplineKey>;
  setCardTags: (
    value:
      | Record<string, DisciplineKey>
      | ((prev: Record<string, DisciplineKey>) => Record<string, DisciplineKey>)
  ) => void;

  pomodoroLog: PomodoroSession[];
  setPomodoroLog: (
    value: PomodoroSession[] | ((prev: PomodoroSession[]) => PomodoroSession[])
  ) => void;

  theme: ThemeMode;
  setTheme: (theme: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => void;

  currentTerm: string;
  setCurrentTerm: (term: string) => void;

  overallSync: 'synced' | 'syncing' | 'offline';
  refetchAll: () => Promise<void>;
  exportBackup: () => string;
  importBackup: (json: string) => { ok: boolean; message: string };
}

const PlexoContext = createContext<PlexoContextValue | null>(null);

export function PlexoProvider({ children }: { children: ReactNode }) {
  const schedule = useSupabaseTable<ScheduleEventRow>('schedule_events', FALLBACK_SCHEDULE);
  const goals = useSupabaseTable<GoalRow>('goals');
  const urgentTasks = useSupabaseTable<UrgentTaskRow>('urgent_tasks');
  const flashcards = useSupabaseTable<FlashcardRow>('flashcards');

  const [exams, setExams] = useLocalStorage<ExamItem[]>('plexo_v2_exams', INITIAL_FACAPE_EXAMS);
  const [pblCases, setPblCases] = useLocalStorage<PblCase[]>('plexo_v2_pbl_cases', INITIAL_PBL_CASES);
  const [cardTags, setCardTags] = useLocalStorage<Record<string, DisciplineKey>>('plexo_v2_card_tags', {});
  const [pomodoroLog, setPomodoroLog] = useLocalStorage<PomodoroSession[]>('plexo_v2_pomodoro', []);
  const [theme, setTheme] = useLocalStorage<ThemeMode>('plexo_v2_theme', 'dark');
  const [currentTerm, setCurrentTerm] = useLocalStorage<string>('plexo_v2_term', '2º Período');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0D1117' : '#F6F4EE');
    }
  }, [theme]);

  const statuses = [
    schedule.syncStatus,
    goals.syncStatus,
    urgentTasks.syncStatus,
    flashcards.syncStatus,
  ];
  const overallSync: 'synced' | 'syncing' | 'offline' = statuses.includes('offline')
    ? 'offline'
    : statuses.includes('syncing')
    ? 'syncing'
    : 'synced';

  const refetchAll = async () => {
    await Promise.all([
      schedule.refetch(),
      goals.refetch(),
      urgentTasks.refetch(),
      flashcards.refetch(),
    ]);
  };

  const exportBackup = () => {
    const payload = {
      app: 'Plexo',
      version: 2,
      exportedAt: new Date().toISOString(),
      currentTerm,
      exams,
      pblCases,
      cardTags,
      pomodoroLog,
      supabaseSnapshot: {
        schedule_events: schedule.data,
        goals: goals.data,
        urgent_tasks: urgentTasks.data,
        flashcards: flashcards.data,
      },
    };
    return JSON.stringify(payload, null, 2);
  };

  const importBackup = (json: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || parsed.app !== 'Plexo') {
        return { ok: false, message: 'Arquivo de backup inválido.' };
      }
      if (Array.isArray(parsed.exams)) setExams(parsed.exams);
      if (Array.isArray(parsed.pblCases)) setPblCases(parsed.pblCases);
      if (parsed.cardTags && typeof parsed.cardTags === 'object') setCardTags(parsed.cardTags);
      if (Array.isArray(parsed.pomodoroLog)) setPomodoroLog(parsed.pomodoroLog);
      if (typeof parsed.currentTerm === 'string') setCurrentTerm(parsed.currentTerm);
      return { ok: true, message: 'Backup restaurado com sucesso!' };
    } catch {
      return { ok: false, message: 'Não foi possível ler o arquivo JSON.' };
    }
  };

  return (
    <PlexoContext.Provider
      value={{
        schedule,
        goals,
        urgentTasks,
        flashcards,
        exams,
        setExams,
        pblCases,
        setPblCases,
        cardTags,
        setCardTags,
        pomodoroLog,
        setPomodoroLog,
        theme,
        setTheme,
        currentTerm,
        setCurrentTerm,
        overallSync,
        refetchAll,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </PlexoContext.Provider>
  );
}

export function usePlexo() {
  const ctx = useContext(PlexoContext);
  if (!ctx) throw new Error('usePlexo must be used within PlexoProvider');
  return ctx;
}
