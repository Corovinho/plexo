export type TabId = 'hoje' | 'rotina' | 'provas' | 'estudos' | 'anki';

export type ThemeMode = 'dark' | 'light';

export type GoalCategory = 'daily' | 'weekly' | 'tasks';

export type ExamPeriod = 'Manhã' | 'Tarde' | 'Noite';

export type DisciplineKey =
  | 'UBS'
  | 'Tutoria'
  | 'HAMA'
  | 'MISCO'
  | 'TBL'
  | 'EMIS'
  | 'Morfo'
  | 'CIS'
  | 'Outro';

// Exact Supabase schema matches (preserving 100% compatibility with live DB)
export interface ScheduleEventRow {
  id: string;
  day: number; // 0 = Seg ... 6 = Dom
  start_time: string;
  end_time: string;
  category: string;
  title: string;
  custom_color: string | null;
  created_at?: string;
}

export interface GoalRow {
  id: string;
  text: string;
  completed: boolean;
  category: GoalCategory;
  created_at?: string;
}

export interface UrgentTaskRow {
  id: string;
  text: string;
  completed: boolean;
  created_at?: string;
}

export interface FlashcardRow {
  id: string;
  front: string;
  back: string;
  next_review: string; // YYYY-MM-DD
  interval: number;
  created_at?: string;
}

export interface ExamChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ExamItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  period: ExamPeriod;
  discipline: DisciplineKey;
  term: string;
  grade?: number | null;
  notes?: string;
  checklist?: ExamChecklistItem[];
}

export type PblStage = 0 | 1 | 2 | 3; // 0: Abertura, 1: Objetivos, 2: Estudo, 3: Fechamento

export interface PblObjective {
  id: string;
  text: string;
  done: boolean;
}

export interface PblCase {
  id: string;
  title: string;
  discipline: DisciplineKey;
  stage: PblStage;
  objectives: PblObjective[];
  notes: string;
  term: string;
  updatedAt: string;
}

export interface PomodoroSession {
  id: string;
  date: string; // YYYY-MM-DD local
  minutes: number;
  discipline: DisciplineKey;
  completedAt: string;
}
