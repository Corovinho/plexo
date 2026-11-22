import { useState } from 'react';
import { Sun, Moon, SlidersHorizontal, Heart } from 'lucide-react';
import { usePlexo } from '@/context/PlexoContext';
import { PLEXO_ICON_URL } from '@/data/facapeDefaults';

interface HeaderBarProps {
  onOpenSettings: () => void;
}

export function HeaderBar({ onOpenSettings }: HeaderBarProps) {
  const { theme, setTheme, currentTerm, overallSync } = usePlexo();
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

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-line">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <img
            src={PLEXO_ICON_URL}
            alt="Plexo"
            className="w-8 h-8 rounded-xl object-cover ring-1 ring-lineStrong"
          />
          <div className="leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-[22px] tracking-tight text-ink">Plexo</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted px-1.5 py-0.5 rounded-md bg-surface2 border border-line">
                FACAPE • {currentTerm}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <span
            title={
              overallSync === 'synced'
                ? 'Sincronizado na nuvem'
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
