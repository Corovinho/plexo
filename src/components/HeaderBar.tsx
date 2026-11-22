import { useState } from 'react';
import { Sun, Moon, SlidersHorizontal, Heart, Pause, Play, Timer } from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { PLEXO_ICON_URL, getDisciplineHex } from '@/data/facapeDefaults';

interface HeaderBarProps {
  onOpenSettings: () => void;
  onOpenPomodoro: () => void;
  isOnPomodoroView: boolean;
}

export function HeaderBar({
  onOpenSettings,
  onOpenPomodoro,
  isOnPomodoroView,
}: HeaderBarProps) {
  const { theme, setTheme, currentTerm, overallSync, pomodoro } = usePlexo();
  const [tapCount, setTapCount] = useState(0);
  const [showLoveToast, setShowLoveToast] = useState(false);

  const handleLogoTap = () => {
    const next = tapCount + 1;
    if (next >= 3) {
      setTapCount(0);
      setShowLoveToast(true);
      window.setTimeout(() => setShowLoveToast(false), 3500);
    } else {
      setTapCount(next);
    }
  };

  const mins = String(Math.floor(pomodoro.secondsLeft / 60)).padStart(2, '0');
  const secs = String(pomodoro.secondsLeft % 60).padStart(2, '0');
  const showMiniPomo = pomodoro.isActiveSession && !isOnPomodoroView;

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-line">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
        >
          <img
            src={PLEXO_ICON_URL}
            alt="Plexo"
            className="w-8 h-8 rounded-xl object-cover ring-1 ring-lineStrong shrink-0"
          />
          <div className="leading-none min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-[22px] tracking-tight text-ink">Plexo</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted px-1.5 py-0.5 rounded-md bg-surface2 border border-line truncate">
                FACAPE • {currentTerm}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            title={
              overallSync === 'synced'
                ? 'Tudo sincronizado na nuvem'
                : overallSync === 'syncing'
                ? 'Sincronizando...'
                : 'Modo offline (salvo localmente)'
            }
            className="w-2 h-2 rounded-full mr-1"
            style={{
              backgroundColor:
                overallSync === 'synced'
                  ? '#10b981'
                  : overallSync === 'syncing'
                  ? '#f59e0b'
                  : '#64748b',
            }}
          />

          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Configurações e backup"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink2 hover:text-ink hover:bg-surface2 transition-colors"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </div>

      {/* Persistent Global Pomodoro Mini-Bar */}
      {showMiniPomo && (
        <div className="max-w-xl mx-auto px-4 pb-2 animate-in">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-surface border border-lineStrong">
            <button
              type="button"
              onClick={onOpenPomodoro}
              className="flex items-center gap-2 min-w-0 flex-1 text-left"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${pomodoro.running ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: getDisciplineHex(pomodoro.discipline) }}
              />
              <Timer size={13} className="text-muted shrink-0" />
              <span className="font-mono text-xs font-bold text-ink tabular-nums">
                {mins}:{secs}
              </span>
              <span className="text-xs text-ink2 truncate">• {pomodoro.discipline}</span>
            </button>
            <button
              type="button"
              onClick={pomodoro.toggleRun}
              aria-label={pomodoro.running ? 'Pausar foco' : 'Retomar foco'}
              className="w-7 h-7 rounded-lg bg-surface2 border border-line flex items-center justify-center text-ink hover:border-accent transition-colors shrink-0"
            >
              {pomodoro.running ? <Pause size={12} /> : <Play size={12} />}
            </button>
          </div>
        </div>
      )}

      {showLoveToast && (
        <div className="max-w-xl mx-auto px-4 pb-2.5 animate-in">
          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accentSoft border border-accent/25 text-xs text-accent font-medium">
            <Heart size={13} className="fill-current" />
            <span>Te amo meu amor — vai dar tudo certo nas provas!</span>
          </div>
        </div>
      )}
    </header>
  );
}
