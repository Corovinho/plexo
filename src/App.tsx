import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  BookOpenCheck,
  Brain,
} from 'lucide-react';
import { PlexoProvider, usePlexo } from '@/context/PlexoContext';
import { HeaderBar } from '@/components/HeaderBar';
import { SettingsModal } from '@/components/SettingsModal';
import { ToastBar } from '@/components/ui/ToastBar';
import HojeTab from '@/components/HojeTab';
import RotinaTab from '@/components/RotinaTab';
import ProvasTab from '@/components/ProvasTab';
import EstudosTab from '@/components/EstudosTab';
import AnkiTab from '@/components/AnkiTab';
import { getLocalDateString } from '@/data/facapeDefaults';
import type { DraftFlashcard, TabId } from '@/types';

const TABS = [
  { id: 'hoje' as const, label: 'Hoje', icon: LayoutDashboard },
  { id: 'rotina' as const, label: 'Rotina', icon: CalendarDays },
  { id: 'provas' as const, label: 'Provas', icon: CalendarClock },
  { id: 'estudos' as const, label: 'Estudos', icon: BookOpenCheck },
  { id: 'anki' as const, label: 'Anki', icon: Brain },
];

function PlexoShell() {
  const { flashcards, toast, dismissToast, setPendingCardDraft } = usePlexo();
  const [activeTab, setActiveTab] = useState<TabId>('hoje');
  const [estudosSubview, setEstudosSubview] = useState<string>('pbl');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const todayStr = getLocalDateString();
  const dueAnkiCount = useMemo(
    () => flashcards.data.filter((c) => c.next_review <= todayStr).length,
    [flashcards.data, todayStr]
  );

  const handleNavigate = (tab: TabId, subview?: string) => {
    setActiveTab(tab);
    if (tab === 'estudos' && subview) {
      setEstudosSubview(subview);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendToAnki = (draft: DraftFlashcard) => {
    setPendingCardDraft(draft);
    handleNavigate('anki');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <HeaderBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPomodoro={() => handleNavigate('estudos', 'foco')}
        isOnPomodoroView={activeTab === 'estudos' && estudosSubview === 'foco'}
      />

      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-4 pb-28">
        {activeTab === 'hoje' && <HojeTab onNavigate={handleNavigate} />}
        {activeTab === 'rotina' && <RotinaTab />}
        {activeTab === 'provas' && <ProvasTab />}
        {activeTab === 'estudos' && (
          <EstudosTab
            initialSubview={estudosSubview}
            onSubviewChange={(sub) => setEstudosSubview(sub)}
            onSendToAnki={handleSendToAnki}
          />
        )}
        {activeTab === 'anki' && <AnkiTab />}
      </main>

      <ToastBar toast={toast} onDismiss={dismissToast} />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-canvas/90 backdrop-blur-lg border-t border-line pb-safe">
        <div className="max-w-xl mx-auto px-2 pt-1.5 pb-1 grid grid-cols-5 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showAnkiBadge = tab.id === 'anki' && dueAnkiCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavigate(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-accent' : 'text-muted hover:text-ink2'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.3 : 1.75} />
                  {showAnkiBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accentFg text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {dueAnkiCount > 99 ? '99+' : dueAnkiCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <PlexoProvider>
      <PlexoShell />
    </PlexoProvider>
  );
}
