import { useRef, useState } from 'react';
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  GraduationCap,
  Heart,
  Sparkles,
  User,
  KeyRound,
  ArrowRightCircle,
  Minimize2,
} from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { usePlexo } from '@/context/PlexoContext';
import { getLocalDateString } from '@/data/facapeDefaults';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TERM_OPTIONS = ['2º Período', '3º Período', '4º Período', '5º Período', '6º Período'];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    theme,
    setTheme,
    compactMode,
    setCompactMode,
    studentName,
    setStudentName,
    currentTerm,
    setCurrentTerm,
    geminiApiKey,
    setGeminiApiKey,
    overallSync,
    refetchAll,
    exportBackup,
    importBackup,
    startNewTerm,
    schedule,
    goals,
    flashcards,
    exams,
  } = usePlexo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmNextTerm, setConfirmNextTerm] = useState(false);

  const nextTermSuggestion = (() => {
    const idx = TERM_OPTIONS.indexOf(currentTerm);
    if (idx >= 0 && idx < TERM_OPTIONS.length - 1) return TERM_OPTIONS[idx + 1];
    return '3º Período';
  })();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
    setFeedback('Tudo atualizado da nuvem.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plexo-backup-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Backup salvo nos seus downloads.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importBackup(text);
    setFeedback(res.message);
    e.target.value = '';
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Configurações do Plexo"
      subtitle="Medicina PBL • FACAPE"
    >
      <div className="space-y-5">
        {/* Personalization */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-2">
            <User size={13} />
            Seu nome na tela inicial
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Deixe vazio para 'doutora'"
            className="plexo-input w-full"
          />
        </div>

        {/* Appearance & Compact Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted block">
            Aparência
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-accent bg-accentSoft text-accent'
                  : 'border-line bg-surface2 text-ink2 hover:text-ink'
              }`}
            >
              <Moon size={16} />
              Escuro Clínico
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-accent bg-accentSoft text-accent'
                  : 'border-line bg-surface2 text-ink2 hover:text-ink'
              }`}
            >
              <Sun size={16} />
              Papel Claro
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCompactMode((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface2 border border-line text-xs font-medium text-ink"
          >
            <span className="flex items-center gap-2">
              <Minimize2 size={14} className="text-muted" />
              Modo compacto (ver mais sem rolar)
            </span>
            <span
              className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                compactMode ? 'bg-accent justify-end' : 'bg-surface border border-lineStrong justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </span>
          </button>
        </div>

        {/* Period & Semester Transition */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <GraduationCap size={13} />
            Período atual
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TERM_OPTIONS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setCurrentTerm(term)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  currentTerm === term
                    ? 'border-accent bg-accentSoft text-accent'
                    : 'border-line bg-surface2 text-ink2 hover:text-ink'
                }`}
              >
                {term}
              </button>
            ))}
          </div>

          {!confirmNextTerm ? (
            <button
              type="button"
              onClick={() => setConfirmNextTerm(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface2 border border-line hover:border-accent/50 text-xs font-semibold text-ink transition-colors"
            >
              <span className="flex items-center gap-2">
                <ArrowRightCircle size={15} className="text-accent" />
                Iniciar {nextTermSuggestion} (arquivar atual)
              </span>
              <span className="text-[11px] text-muted">Seguro</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-accentSoft border border-accent/30 space-y-2.5">
              <p className="text-xs text-ink leading-relaxed">
                Isso muda para <strong>{nextTermSuggestion}</strong>, arquiva os casos PBL antigos e zera o Faltômetro para o novo semestre.{' '}
                <strong>Todas as provas e notas do {currentTerm} continuam salvas no histórico.</strong>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmNextTerm(false)}
                  className="plexo-btn-ghost text-xs flex-1 !py-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startNewTerm(nextTermSuggestion, { archivePbl: true, resetAbsences: true });
                    setConfirmNextTerm(false);
                    onClose();
                  }}
                  className="plexo-btn-primary text-xs flex-1 !py-2"
                >
                  Confirmar {nextTermSuggestion}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Free Gemini AI Key (device-local only) */}
        <div className="p-3.5 rounded-2xl bg-surface2 border border-line space-y-2">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Sparkles size={14} className="text-accent" />
            IA Gratuita para Flashcards (Google Gemini)
          </label>
          <div className="relative">
            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza... (opcional — grátis no AI Studio)"
              className="plexo-input w-full !pl-9 !bg-surface text-xs font-mono"
            />
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Salva <strong>somente neste aparelho</strong>. Crie grátis (sem cartão) em{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              aistudio.google.com/apikey
            </a>
            . Também funciona sem chave usando o modo Prompt + Colar no Anki.
          </p>
        </div>

        {/* Cloud Sync Status */}
        <div className="p-3.5 rounded-2xl bg-surface2 border border-line space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {overallSync === 'offline' ? (
                <CloudOff size={16} className="text-muted" />
              ) : (
                <Cloud size={16} className="text-accent" />
              )}
              <span className="text-sm font-semibold text-ink">
                {overallSync === 'synced'
                  ? 'Tudo sincronizado na nuvem'
                  : overallSync === 'syncing'
                  ? 'Sincronizando...'
                  : 'Modo offline'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Rotina, Provas, Notas, Faltômetro, Ciclo PBL, Metas e Anki sincronizam entre celular e notebook.
          </p>
          <div className="grid grid-cols-4 gap-2 text-center pt-1">
            <div className="rounded-xl bg-surface py-1.5 border border-line">
              <div className="text-sm font-bold text-ink tabular-nums">{schedule.data.length}</div>
              <div className="text-[10px] text-muted">Aulas</div>
            </div>
            <div className="rounded-xl bg-surface py-1.5 border border-line">
              <div className="text-sm font-bold text-ink tabular-nums">{exams.length}</div>
              <div className="text-[10px] text-muted">Provas</div>
            </div>
            <div className="rounded-xl bg-surface py-1.5 border border-line">
              <div className="text-sm font-bold text-ink tabular-nums">{goals.data.length}</div>
              <div className="text-[10px] text-muted">Metas</div>
            </div>
            <div className="rounded-xl bg-surface py-1.5 border border-line">
              <div className="text-sm font-bold text-ink tabular-nums">{flashcards.data.length}</div>
              <div className="text-[10px] text-muted">Cards</div>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
            Backup em arquivo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleExport} className="plexo-btn-ghost text-xs">
              <Download size={14} />
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="plexo-btn-ghost text-xs"
            >
              <Upload size={14} />
              Importar JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {feedback && (
            <p className="text-xs text-accent font-medium mt-2 text-center">{feedback}</p>
          )}
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-muted">
          <span>Plexo • v2.1</span>
          <span className="inline-flex items-center gap-1 opacity-75">
            <Heart size={11} className="text-rose-400 fill-rose-400" />
            Te amo meu amor
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
