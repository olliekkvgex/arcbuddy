'use client';

import useIsMobile from '../hooks/useIsMobile';

interface SideMenuProps {
  activePanel: 'searchAdd' | 'recentActivity' | null;
  onSelect: (panel: 'searchAdd' | 'recentActivity') => void;
}

export function SideMenu({ activePanel, onSelect }: SideMenuProps) {
  const isMobile = useIsMobile();

  // Render a compact bottom bar on mobile to avoid overlap with content
  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 bg-white rounded-2xl p-2 shadow-lg border border-purple-100">
        <button
          type="button"
          onClick={() => onSelect('searchAdd')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${activePanel === 'searchAdd' ? 'bg-purple-100 text-purple-900' : 'text-purple-700 hover:bg-purple-50'}`}
        >
          <span className="text-lg">🔎</span>
          <span className="sr-only">Search & Add ARC</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect('recentActivity')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition ${activePanel === 'recentActivity' ? 'bg-purple-100 text-purple-900' : 'text-purple-700 hover:bg-purple-50'}`}
        >
          <span className="text-lg">📊</span>
          <span className="sr-only">Recent Activity</span>
        </button>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-r-3xl bg-purple-50 text-purple-900 shadow-lg border border-purple-100 transition-all duration-300 ease-out hover:w-56 w-16">
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-purple-50/0 to-purple-50/95 pointer-events-none" />
      <div className="flex h-full w-full flex-col items-start px-2 py-4">
        <div className="mb-4 flex w-full items-center justify-between px-1">
          <span className="inline-block rounded-full bg-purple-200 p-2 text-lg text-purple-800">≡</span>
          <span className="ml-2 hidden text-[11px] uppercase tracking-[0.22em] opacity-0 transition-all duration-300 group-hover:inline-block group-hover:opacity-100">Menu</span>
        </div>

        <button
          type="button"
          onClick={() => onSelect('searchAdd')}
          className={`group inline-flex items-center gap-3 w-full rounded-3xl px-3 py-3 text-left text-sm font-semibold transition ${activePanel === 'searchAdd' ? 'bg-purple-200 text-purple-900' : 'text-purple-700 hover:bg-purple-100'}`}
        >
          <span className="text-lg">🔎</span>
          <span className="opacity-0 transition-all duration-300 group-hover:opacity-100">Search & Add ARC</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('recentActivity')}
          className={`group inline-flex items-center gap-3 w-full rounded-3xl px-3 py-3 text-left text-sm font-semibold transition ${activePanel === 'recentActivity' ? 'bg-purple-200 text-purple-900' : 'text-purple-700 hover:bg-purple-100'}`}
        >
          <span className="text-lg">📊</span>
          <span className="opacity-0 transition-all duration-300 group-hover:opacity-100">Recent Activity</span>
        </button>
      </div>
    </div>
  );
}
