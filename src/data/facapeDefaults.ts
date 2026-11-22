import type {
  DisciplineAbsence,
  DisciplineKey,
  ExamItem,
  PblCase,
  ScheduleEventRow,
} from '@/types';

export const PLEXO_ICON_URL = 'https://i.postimg.cc/C51vVfLV/1787891800329(1).png';

// Deterministic hidden sync record inside urgent_tasks so ALL app state syncs via Supabase
export const CLOUD_SYNC_ROW_ID = '00000000-0000-4000-8000-000000000001';
export const CLOUD_SYNC_PREFIX = '__PLEXO_SYNC_V2__:';

export const POMODORO_PRESETS = [
  { label: '25 min', minutes: 25, kind: 'focus' as const },
  { label: '50 min', minutes: 50, kind: 'focus' as const },
  { label: '15 min', minutes: 15, kind: 'focus' as const },
  { label: 'Pausa 5m', minutes: 5, kind: 'break' as const },
];

export const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export const DAYS_FULL_MON_FIRST = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

export const DAYS_FULL_SUN_FIRST = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export interface DisciplineMeta {
  key: DisciplineKey;
  label: string;
  fullName: string;
  hex: string;
}

export const DISCIPLINES: Record<DisciplineKey, DisciplineMeta> = {
  UBS: {
    key: 'UBS',
    label: 'UBS',
    fullName: 'Unidade Básica de Saúde',
    hex: '#10b981',
  },
  Tutoria: {
    key: 'Tutoria',
    label: 'Tutoria',
    fullName: 'Sessão Tutorial PBL',
    hex: '#0ea5e9',
  },
  HAMA: {
    key: 'HAMA',
    label: 'HAMA',
    fullName: 'Habilidades Médicas',
    hex: '#f59e0b',
  },
  MISCO: {
    key: 'MISCO',
    label: 'MISCO',
    fullName: 'Saúde Coletiva & Comunidade',
    hex: '#f43f5e',
  },
  TBL: {
    key: 'TBL',
    label: 'TBL',
    fullName: 'Team-Based Learning',
    hex: '#8b5cf6',
  },
  EMIS: {
    key: 'EMIS',
    label: 'EMIS',
    fullName: 'Estudo Médico Integrado',
    hex: '#14b8a6',
  },
  Morfo: {
    key: 'Morfo',
    label: 'Morfo',
    fullName: 'Laboratório Morfofuncional',
    hex: '#f97316',
  },
  CIS: {
    key: 'CIS',
    label: 'CIS',
    fullName: 'Conhecimento Integrado em Saúde',
    hex: '#ec4899',
  },
  Outro: {
    key: 'Outro',
    label: 'Outro',
    fullName: 'Atividade personalizada',
    hex: '#64748b',
  },
};

export const DISCIPLINE_LIST: DisciplineKey[] = [
  'UBS',
  'Tutoria',
  'HAMA',
  'MISCO',
  'TBL',
  'EMIS',
  'Morfo',
  'CIS',
  'Outro',
];

export const CUSTOM_COLOR_OPTIONS = [
  { label: 'Ardósia', value: '#64748b' },
  { label: 'Carmesim', value: '#e11d48' },
  { label: 'Rosa', value: '#db2777' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Esmeralda', value: '#059669' },
  { label: 'Âmbar', value: '#d97706' },
  { label: 'Terracota', value: '#ea580c' },
];

export const PBL_STAGES = [
  { stage: 0 as const, label: 'Abertura', short: 'Abert.' },
  { stage: 1 as const, label: 'Objetivos', short: 'Objet.' },
  { stage: 2 as const, label: 'Estudo', short: 'Estudo' },
  { stage: 3 as const, label: 'Fechamento', short: 'Fech.' },
];

export function getDisciplineMeta(category: string): DisciplineMeta {
  const key = category as DisciplineKey;
  return DISCIPLINES[key] || DISCIPLINES.Outro;
}

export function getDisciplineHex(category: string, customColor?: string | null): string {
  if (category === 'Outro' && customColor) return customColor;
  return getDisciplineMeta(category).hex;
}

// Local date helpers (fixes the UTC-3 after-21h timezone bug!)
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysLocal(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

export function daysUntil(dateStr: string, fromDate: Date = new Date()): number {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const target = parseLocalDate(dateStr);
  const diffMs = target.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDateBR(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatDuration(start: string, end: string): string {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function getTodayMonIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7; // 0 = Seg ... 6 = Dom
}

export function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(792, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio blocked or unsupported
  }
}

// All 22 real FACAPE 2º Período exams preserved verbatim from the original Plexo
export const INITIAL_FACAPE_EXAMS: ExamItem[] = [
  // Setembro
  { id: 'facape-2p-01', date: '2026-09-09', title: 'AV1 HAMA', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-02', date: '2026-09-17', title: 'AV1 MISCO', period: 'Manhã', discipline: 'MISCO', term: '2º Período' },
  // Outubro
  { id: 'facape-2p-03', date: '2026-10-01', title: 'AF1 MISCO + Entrega de prova', period: 'Manhã', discipline: 'MISCO', term: '2º Período' },
  { id: 'facape-2p-04', date: '2026-10-02', title: 'AV1 CIS', period: 'Tarde', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-05', date: '2026-10-06', title: 'AF1 + Devolutiva Tutoria', period: 'Tarde', discipline: 'Tutoria', term: '2º Período' },
  // Novembro
  { id: 'facape-2p-06', date: '2026-11-11', title: 'AV1 HAMA', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-07', date: '2026-11-18', title: 'AV1 HAMA', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-08', date: '2026-11-24', title: 'AF2 CIS', period: 'Tarde', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-09', date: '2026-11-25', title: 'AV2 HAMA', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-10', date: '2026-11-26', title: 'AV2 MISCO', period: 'Manhã', discipline: 'MISCO', term: '2º Período' },
  // Dezembro
  { id: 'facape-2p-11', date: '2026-12-01', title: 'AV2 CIS', period: 'Tarde', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-12', date: '2026-12-02', title: 'AV2 HAMA', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-13', date: '2026-12-04', title: 'Devolutiva CIS', period: 'Tarde', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-14', date: '2026-12-08', title: 'Entrega das provas CIS', period: 'Tarde', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-15', date: '2026-12-09', title: 'AV3 HAMA (prática)', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-16', date: '2026-12-10', title: 'AV3 MISCO + Entrega de prova', period: 'Manhã', discipline: 'MISCO', term: '2º Período' },
  { id: 'facape-2p-17', date: '2026-12-14', title: 'AV3 HAMA (teórica)', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-18', date: '2026-12-15', title: 'AV3 CIS', period: 'Manhã', discipline: 'CIS', term: '2º Período' },
  { id: 'facape-2p-19', date: '2026-12-16', title: 'AV Final MISCO', period: 'Manhã', discipline: 'MISCO', term: '2º Período' },
  { id: 'facape-2p-20', date: '2026-12-16', title: 'AV Final HAMA (prática)', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-21', date: '2026-12-17', title: 'AV Final HAMA (teórica)', period: 'Noite', discipline: 'HAMA', term: '2º Período' },
  { id: 'facape-2p-22', date: '2026-12-18', title: 'AV Final CIS', period: 'Manhã', discipline: 'CIS', term: '2º Período' },
];

export const INITIAL_PBL_CASES: PblCase[] = [
  {
    id: 'pbl-tutoria-24',
    title: 'Tutoria 2.4',
    discipline: 'Tutoria',
    stage: 2,
    objectives: [
      { id: 'obj-1', text: 'Revisar objetivos de aprendizagem da abertura', done: true },
      { id: 'obj-2', text: 'Consolidar resumo para o fechamento', done: false },
    ],
    notes: '',
    term: '2º Período',
    updatedAt: '2026-11-21',
  },
  {
    id: 'pbl-tbl-24',
    title: 'TBL 2.4',
    discipline: 'TBL',
    stage: 2,
    objectives: [{ id: 'obj-3', text: 'Estudo prévio (iRAT / tRAT)', done: false }],
    notes: '',
    term: '2º Período',
    updatedAt: '2026-11-21',
  },
  {
    id: 'pbl-tbl-34-35',
    title: 'TBL 3.4 e 3.5',
    discipline: 'TBL',
    stage: 1,
    objectives: [{ id: 'obj-4', text: 'Preparar leitura para segunda-feira', done: false }],
    notes: '',
    term: '2º Período',
    updatedAt: '2026-11-18',
  },
  {
    id: 'pbl-misco-8-9',
    title: 'MISCO 8 e 9 (Revisão AV2)',
    discipline: 'MISCO',
    stage: 2,
    objectives: [
      { id: 'obj-5', text: 'Revisar MISCO 8', done: false },
      { id: 'obj-6', text: 'Revisar MISCO 9', done: false },
    ],
    notes: '',
    term: '2º Período',
    updatedAt: '2026-11-18',
  },
];

// Default Faltômetro for her FACAPE disciplines (limits easily editable)
export const INITIAL_ABSENCES: DisciplineAbsence[] = [
  { discipline: 'UBS', maxAllowed: 4, entries: [] },
  { discipline: 'Tutoria', maxAllowed: 4, entries: [] },
  { discipline: 'HAMA', maxAllowed: 4, entries: [] },
  { discipline: 'MISCO', maxAllowed: 4, entries: [] },
  { discipline: 'TBL', maxAllowed: 4, entries: [] },
  { discipline: 'EMIS', maxAllowed: 4, entries: [] },
  { discipline: 'Morfo', maxAllowed: 4, entries: [] },
];

export const FALLBACK_SCHEDULE: ScheduleEventRow[] = [
  { id: 'fa08deb5-998e-4019-9cae-3907a3ba95f6', day: 0, start_time: '08:00', end_time: '11:00', category: 'UBS', title: 'UBS', custom_color: null },
  { id: '5074036d-6179-4a2d-9cb9-1ab8383eeace', day: 1, start_time: '13:20', end_time: '17:20', category: 'Tutoria', title: 'Tutoria', custom_color: null },
  { id: 'ba423bd2-4263-436a-8bda-5f19bfd28088', day: 1, start_time: '18:20', end_time: '21:30', category: 'HAMA', title: 'HAMA', custom_color: null },
  { id: 'd823ea34-591c-46bf-acaa-ac5992f10d1c', day: 3, start_time: '08:00', end_time: '10:30', category: 'MISCO', title: 'MISCO', custom_color: null },
  { id: '4f4c2410-1c88-4fca-9d32-2a33f17c22a7', day: 3, start_time: '13:20', end_time: '16:30', category: 'TBL', title: 'TBL', custom_color: null },
  { id: '7854fc87-2763-485a-afe6-ca765950d35b', day: 3, start_time: '18:20', end_time: '20:20', category: 'EMIS', title: 'EMIS', custom_color: null },
  { id: 'a8e4e814-844a-4271-9570-ae3afe1a4a33', day: 4, start_time: '13:20', end_time: '17:20', category: 'Morfo', title: 'Morfo', custom_color: null },
];
