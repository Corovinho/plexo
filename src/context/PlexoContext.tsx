import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/lib/supabase';
import {
  CLOUD_SYNC_PREFIX,
  CLOUD_SYNC_ROW_ID,
  FALLBACK_SCHEDULE,
  INITIAL_ABSENCES,
  INITIAL_FACAPE_EXAMS,
  INITIAL_PBL_CASES,
  POMODORO_PRESETS,
  getLocalDateString,
  playGentleChime,
} from '@/data/facapeDefaults';
import type {
  DisciplineAbsence,
  DisciplineKey,
  DraftFlashcard,
  ExamItem,
  FlashcardRow,
  GoalRow,
  PblCase,
  PomodoroSession,
  ScheduleEventRow,
  ThemeMode,
  ToastItem,
  UrgentTaskRow,
} from '@/types';

interface CloudBundle {
  version: 2;
  updatedAt: number;
  studentName: string;
  currentTerm: string;
  exams: ExamItem[];
  pblCases: PblCase[];
  absences: DisciplineAbsence[];
  cardTags: Record<string, DisciplineKey>;
  pomodoroLog: PomodoroSession[];
}

interface PomodoroRuntime {
  presetIdx: number;
  discipline: DisciplineKey;
  secondsLeft: number;
  running: boolean;
  endTime: number | null;
}

interface PlexoContextValue {
  // Supabase-backed tables
  schedule: ReturnType<typeof useSupabaseTable<ScheduleEventRow>>;
  goals: ReturnType<typeof useSupabaseTable<GoalRow>>;
  urgentTasks: {
    data: UrgentTaskRow[];
    loading: boolean;
    syncStatus: 'syncing' | 'synced' | 'offline';
    insert: (row: Omit<UrgentTaskRow, 'created_at'>) => Promise<{ data: UrgentTaskRow | null; error: unknown }>;
    update: (id: string, updates: Partial<UrgentTaskRow>) => Promise<{ error: unknown }>;
    remove: (id: string) => Promise<{ error: unknown }>;
    refetch: () => Promise<void>;
  };
  flashcards: ReturnType<typeof useSupabaseTable<FlashcardRow>>;

  // Cloud-synced medical student data
  exams: ExamItem[];
  setExams: (value: ExamItem[] | ((prev: ExamItem[]) => ExamItem[])) => void;

  pblCases: PblCase[];
  setPblCases: (value: PblCase[] | ((prev: PblCase[]) => PblCase[])) => void;

  absences: DisciplineAbsence[];
  setAbsences: (
    value: DisciplineAbsence[] | ((prev: DisciplineAbsence[]) => DisciplineAbsence[])
  ) => void;

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

  studentName: string;
  setStudentName: (name: string) => void;

  currentTerm: string;
  setCurrentTerm: (term: string) => void;

  // Device-only preferences & secrets (NEVER synced publicly)
  theme: ThemeMode;
  setTheme: (theme: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => void;

  compactMode: boolean;
  setCompactMode: (value: boolean | ((prev: boolean) => boolean)) => void;

  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;

  // Global Persistent Pomodoro Timer
  pomodoro: {
    presetIdx: number;
    discipline: DisciplineKey;
    secondsLeft: number;
    totalSeconds: number;
    running: boolean;
    isActiveSession: boolean;
    selectPreset: (idx: number) => void;
    setDiscipline: (d: DisciplineKey) => void;
    toggleRun: () => void;
    reset: () => void;
  };

  // Global Undo Toast
  toast: ToastItem | null;
  showToast: (message: string, onUndo?: () => void, undoLabel?: string) => void;
  dismissToast: () => void;

  // Cross-tab PBL -> Anki bridge
  pendingCardDraft: DraftFlashcard | null;
  setPendingCardDraft: (draft: DraftFlashcard | null) => void;

  // Sync, Backup & Term transition
  overallSync: 'synced' | 'syncing' | 'offline';
  refetchAll: () => Promise<void>;
  exportBackup: () => string;
  importBackup: (json: string) => { ok: boolean; message: string };
  startNewTerm: (nextTerm: string, options: { archivePbl: boolean; resetAbsences: boolean }) => void;
}

const PlexoContext = createContext<PlexoContextValue | null>(null);

export function PlexoProvider({ children }: { children: ReactNode }) {
  const schedule = useSupabaseTable<ScheduleEventRow>('schedule_events', FALLBACK_SCHEDULE);
  const goals = useSupabaseTable<GoalRow>('goals');
  const rawUrgent = useSupabaseTable<UrgentTaskRow>('urgent_tasks');
  const flashcards = useSupabaseTable<FlashcardRow>('flashcards');

  // Filter out the hidden cloud-sync record so it never appears in visible urgent tasks
  const visibleUrgentData = useMemo(
    () =>
      rawUrgent.data.filter(
        (t) => t.id !== CLOUD_SYNC_ROW_ID && !t.text.startsWith(CLOUD_SYNC_PREFIX)
      ),
    [rawUrgent.data]
  );

  const urgentTasks = useMemo(
    () => ({
      data: visibleUrgentData,
      loading: rawUrgent.loading,
      syncStatus: rawUrgent.syncStatus,
      insert: rawUrgent.insert,
      update: rawUrgent.update,
      remove: rawUrgent.remove,
      refetch: rawUrgent.refetch,
    }),
    [visibleUrgentData, rawUrgent]
  );

  // Synced state stored locally first for 0ms startup, then bidirectionally synced to Supabase
  const [exams, setExamsRaw] = useLocalStorage<ExamItem[]>('plexo_v2_exams', INITIAL_FACAPE_EXAMS);
  const [pblCases, setPblCasesRaw] = useLocalStorage<PblCase[]>(
    'plexo_v2_pbl_cases',
    INITIAL_PBL_CASES
  );
  const [absences, setAbsencesRaw] = useLocalStorage<DisciplineAbsence[]>(
    'plexo_v2_absences',
    INITIAL_ABSENCES
  );
  const [cardTags, setCardTagsRaw] = useLocalStorage<Record<string, DisciplineKey>>(
    'plexo_v2_card_tags',
    {}
  );
  const [pomodoroLog, setPomodoroLogRaw] = useLocalStorage<PomodoroSession[]>(
    'plexo_v2_pomodoro',
    []
  );
  const [studentName, setStudentNameRaw] = useLocalStorage<string>('plexo_v2_name', '');
  const [currentTerm, setCurrentTermRaw] = useLocalStorage<string>('plexo_v2_term', '2º Período');
  const [localUpdatedAt, setLocalUpdatedAt] = useLocalStorage<number>('plexo_v2_updated_at', 0);

  // Strictly device-local settings (never pushed to shared DB)
  const [theme, setTheme] = useLocalStorage<ThemeMode>('plexo_v2_theme', 'dark');
  const [compactMode, setCompactMode] = useLocalStorage<boolean>('plexo_v2_compact', false);
  const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('plexo_v2_gemini_key', '');

  // Cross-tab draft card
  const [pendingCardDraft, setPendingCardDraft] = useState<DraftFlashcard | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastItem | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, onUndo?: () => void, undoLabel?: string) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({
        id: crypto.randomUUID(),
        message,
        onUndo,
        undoLabel,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 5200);
    },
    []
  );

  // Track whether local mutations need cloud push
  const dirtyRef = useRef(false);
  const hydratedCloudRef = useRef(false);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setLocalUpdatedAt(Date.now());
  }, [setLocalUpdatedAt]);

  const setExams = useCallback(
    (v: ExamItem[] | ((prev: ExamItem[]) => ExamItem[])) => {
      setExamsRaw(v);
      markDirty();
    },
    [setExamsRaw, markDirty]
  );

  const setPblCases = useCallback(
    (v: PblCase[] | ((prev: PblCase[]) => PblCase[])) => {
      setPblCasesRaw(v);
      markDirty();
    },
    [setPblCasesRaw, markDirty]
  );

  const setAbsences = useCallback(
    (v: DisciplineAbsence[] | ((prev: DisciplineAbsence[]) => DisciplineAbsence[])) => {
      setAbsencesRaw(v);
      markDirty();
    },
    [setAbsencesRaw, markDirty]
  );

  const setCardTags = useCallback(
    (
      v:
        | Record<string, DisciplineKey>
        | ((prev: Record<string, DisciplineKey>) => Record<string, DisciplineKey>)
    ) => {
      setCardTagsRaw(v);
      markDirty();
    },
    [setCardTagsRaw, markDirty]
  );

  const setPomodoroLog = useCallback(
    (v: PomodoroSession[] | ((prev: PomodoroSession[]) => PomodoroSession[])) => {
      setPomodoroLogRaw(v);
      markDirty();
    },
    [setPomodoroLogRaw, markDirty]
  );

  const setStudentName = useCallback(
    (name: string) => {
      setStudentNameRaw(name);
      markDirty();
    },
    [setStudentNameRaw, markDirty]
  );

  const setCurrentTerm = useCallback(
    (term: string) => {
      setCurrentTermRaw(term);
      markDirty();
    },
    [setCurrentTermRaw, markDirty]
  );

  // Hydrate cloud state when urgent_tasks finishes loading from Supabase
  useEffect(() => {
    if (rawUrgent.loading || rawUrgent.syncStatus === 'syncing') return;
    const syncRow = rawUrgent.data.find(
      (r) => r.id === CLOUD_SYNC_ROW_ID || r.text.startsWith(CLOUD_SYNC_PREFIX)
    );
    if (syncRow && syncRow.text.startsWith(CLOUD_SYNC_PREFIX)) {
      try {
        const parsed = JSON.parse(syncRow.text.slice(CLOUD_SYNC_PREFIX.length)) as CloudBundle;
        if (parsed && parsed.version === 2 && parsed.updatedAt > localUpdatedAt && !dirtyRef.current) {
          if (Array.isArray(parsed.exams)) setExamsRaw(parsed.exams);
          if (Array.isArray(parsed.pblCases)) setPblCasesRaw(parsed.pblCases);
          if (Array.isArray(parsed.absences)) setAbsencesRaw(parsed.absences);
          if (parsed.cardTags && typeof parsed.cardTags === 'object') setCardTagsRaw(parsed.cardTags);
          if (Array.isArray(parsed.pomodoroLog)) setPomodoroLogRaw(parsed.pomodoroLog);
          if (typeof parsed.studentName === 'string') setStudentNameRaw(parsed.studentName);
          if (typeof parsed.currentTerm === 'string') setCurrentTermRaw(parsed.currentTerm);
          setLocalUpdatedAt(parsed.updatedAt);
        }
      } catch {
        // Ignore malformed sync payload
      }
    }
    hydratedCloudRef.current = true;
  }, [
    rawUrgent.data,
    rawUrgent.loading,
    rawUrgent.syncStatus,
    localUpdatedAt,
    setExamsRaw,
    setPblCasesRaw,
    setAbsencesRaw,
    setCardTagsRaw,
    setPomodoroLogRaw,
    setStudentNameRaw,
    setCurrentTermRaw,
    setLocalUpdatedAt,
  ]);

  // Debounced push of cloud bundle to Supabase whenever local edits happen
  useEffect(() => {
    if (!supabase || !dirtyRef.current || !hydratedCloudRef.current) return;
    const timeout = window.setTimeout(async () => {
      if (!supabase) return;
      const bundle: CloudBundle = {
        version: 2,
        updatedAt: localUpdatedAt || Date.now(),
        studentName,
        currentTerm,
        exams,
        pblCases,
        absences,
        cardTags,
        pomodoroLog,
      };
      try {
        await supabase.from('urgent_tasks').upsert({
          id: CLOUD_SYNC_ROW_ID,
          text: `${CLOUD_SYNC_PREFIX}${JSON.stringify(bundle)}`,
          completed: true,
        });
        dirtyRef.current = false;
      } catch {
        // Will retry next mutation
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [
    localUpdatedAt,
    studentName,
    currentTerm,
    exams,
    pblCases,
    absences,
    cardTags,
    pomodoroLog,
  ]);

  // Theme & compact mode DOM attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0D1117' : '#F6F4EE');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-compact', compactMode ? 'true' : 'false');
  }, [compactMode]);

  // === GLOBAL PERSISTENT POMODORO TIMER (wall-clock accurate even when phone locks!) ===
  const [pomoState, setPomoState] = useLocalStorage<PomodoroRuntime>('plexo_v2_pomo_runtime', {
    presetIdx: 0,
    discipline: 'Tutoria',
    secondsLeft: POMODORO_PRESETS[0].minutes * 60,
    running: false,
    endTime: null,
  });

  const completePomoSession = useCallback(
    (presetIdx: number, discipline: DisciplineKey) => {
      playGentleChime();
      const preset = POMODORO_PRESETS[presetIdx] || POMODORO_PRESETS[0];
      if (preset.kind === 'focus') {
        setPomodoroLog((log) => [
          ...log,
          {
            id: crypto.randomUUID(),
            date: getLocalDateString(),
            minutes: preset.minutes,
            discipline,
            completedAt: new Date().toISOString(),
          },
        ]);
        showToast(`Bloco de ${preset.minutes} min em ${discipline} concluído!`);
      } else {
        showToast('Pausa concluída! Hora de voltar ao foco.');
      }
    },
    [setPomodoroLog, showToast]
  );

  useEffect(() => {
    if (!pomoState.running || !pomoState.endTime) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pomoState.endTime! - Date.now()) / 1000));
      if (remaining <= 0) {
        setPomoState((prev) => ({
          ...prev,
          running: false,
          endTime: null,
          secondsLeft: 0,
        }));
        completePomoSession(pomoState.presetIdx, pomoState.discipline);
      } else {
        setPomoState((prev) =>
          prev.secondsLeft === remaining ? prev : { ...prev, secondsLeft: remaining }
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [pomoState.running, pomoState.endTime, pomoState.presetIdx, pomoState.discipline, setPomoState, completePomoSession]);

  const activePreset = POMODORO_PRESETS[pomoState.presetIdx] || POMODORO_PRESETS[0];
  const totalSeconds = activePreset.minutes * 60;

  const pomodoro = useMemo(
    () => ({
      presetIdx: pomoState.presetIdx,
      discipline: pomoState.discipline,
      secondsLeft: pomoState.secondsLeft,
      totalSeconds,
      running: pomoState.running,
      isActiveSession:
        pomoState.running || (pomoState.secondsLeft > 0 && pomoState.secondsLeft < totalSeconds),
      selectPreset: (idx: number) => {
        const nextTotal = (POMODORO_PRESETS[idx] || POMODORO_PRESETS[0]).minutes * 60;
        setPomoState((prev) => ({
          ...prev,
          presetIdx: idx,
          running: false,
          endTime: null,
          secondsLeft: nextTotal,
        }));
      },
      setDiscipline: (discipline: DisciplineKey) => {
        setPomoState((prev) => ({ ...prev, discipline }));
      },
      toggleRun: () => {
        setPomoState((prev) => {
          if (prev.running) {
            const left = prev.endTime
              ? Math.max(0, Math.ceil((prev.endTime - Date.now()) / 1000))
              : prev.secondsLeft;
            return { ...prev, running: false, endTime: null, secondsLeft: left };
          }
          const baseSeconds =
            prev.secondsLeft <= 0
              ? (POMODORO_PRESETS[prev.presetIdx] || POMODORO_PRESETS[0]).minutes * 60
              : prev.secondsLeft;
          return {
            ...prev,
            running: true,
            secondsLeft: baseSeconds,
            endTime: Date.now() + baseSeconds * 1000,
          };
        });
      },
      reset: () => {
        setPomoState((prev) => ({
          ...prev,
          running: false,
          endTime: null,
          secondsLeft: (POMODORO_PRESETS[prev.presetIdx] || POMODORO_PRESETS[0]).minutes * 60,
        }));
      },
    }),
    [pomoState, totalSeconds, setPomoState]
  );

  // Sync status
  const statuses = [
    schedule.syncStatus,
    goals.syncStatus,
    rawUrgent.syncStatus,
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
      rawUrgent.refetch(),
      flashcards.refetch(),
    ]);
  };

  const exportBackup = () => {
    const payload = {
      app: 'Plexo',
      version: 2,
      exportedAt: new Date().toISOString(),
      studentName,
      currentTerm,
      exams,
      pblCases,
      absences,
      cardTags,
      pomodoroLog,
      supabaseSnapshot: {
        schedule_events: schedule.data,
        goals: goals.data,
        urgent_tasks: visibleUrgentData,
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
      if (Array.isArray(parsed.absences)) setAbsences(parsed.absences);
      if (parsed.cardTags && typeof parsed.cardTags === 'object') setCardTags(parsed.cardTags);
      if (Array.isArray(parsed.pomodoroLog)) setPomodoroLog(parsed.pomodoroLog);
      if (typeof parsed.studentName === 'string') setStudentName(parsed.studentName);
      if (typeof parsed.currentTerm === 'string') setCurrentTerm(parsed.currentTerm);
      return { ok: true, message: 'Backup restaurado e sincronizado!' };
    } catch {
      return { ok: false, message: 'Não foi possível ler o arquivo JSON.' };
    }
  };

  const startNewTerm = (
    nextTerm: string,
    options: { archivePbl: boolean; resetAbsences: boolean }
  ) => {
    setCurrentTerm(nextTerm);
    if (options.archivePbl) {
      setPblCases((prev) => prev.map((c) => ({ ...c, archived: true })));
    }
    if (options.resetAbsences) {
      setAbsences((prev) => prev.map((a) => ({ ...a, entries: [] })));
    }
    showToast(`Bem-vinda ao ${nextTerm}! Histórico do período anterior preservado.`);
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
        absences,
        setAbsences,
        cardTags,
        setCardTags,
        pomodoroLog,
        setPomodoroLog,
        studentName,
        setStudentName,
        currentTerm,
        setCurrentTerm,
        theme,
        setTheme,
        compactMode,
        setCompactMode,
        geminiApiKey,
        setGeminiApiKey,
        pomodoro,
        toast,
        showToast,
        dismissToast,
        pendingCardDraft,
        setPendingCardDraft,
        overallSync,
        refetchAll,
        exportBackup,
        importBackup,
        startNewTerm,
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
