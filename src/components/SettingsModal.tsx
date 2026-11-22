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
    currentTerm,
    setCurrentTerm,
    overallSync,
    refetchAll,
    exportBackup,
    importBackup,
    schedule,
    goals,
    flashcards,
    exams,
  } = usePlexo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
    setFeedback('Dados atualizados da nuvem.');
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
        {/* Appearance */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
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
        </div>

        {/* Active Period */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-2">
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
          <p className="text-[11px] text-muted mt-2">
            Quando começar o 3º Período, basta trocar aqui e cadastrar novas provas/aulas sem perder o histórico do 2º Período.
          </p>
        </div>

        {/* Sync Status */}
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
                  ? 'Sincronizado na nuvem'
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
            Backup local (Provas, Notas & PBL)
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

        {/* Sweet personal sign-off */}
        <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-muted">
          <span>Plexo • v2</span>
          <span className="inline-flex items-center gap-1 opacity-75">
            <Heart size={11} className="text-rose-400 fill-rose-400" />
            Te amo meu amor
          </span>
        </div>
      </div>
    </BottomSheet>
  );
}
