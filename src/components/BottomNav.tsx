import React from 'react';
import { Compass, Search } from 'lucide-react';

interface Props {
  currentView: 'explore' | 'dashboard';
  onChangeView: (v: 'explore' | 'dashboard') => void;
  hasAdventure: boolean;
}

export function BottomNav({ currentView, onChangeView, hasAdventure }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around z-40 pb-8 sm:pb-4 pt-2">
      <button 
        onClick={() => onChangeView('explore')}
        className={`flex flex-col items-center p-2 transition-colors ${currentView === 'explore' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}
      >
        <Search className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-semibold">Inicio</span>
      </button>
      {hasAdventure && (
        <button 
          onClick={() => onChangeView('dashboard')}
          className={`flex flex-col items-center p-2 transition-colors ${currentView === 'dashboard' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}
        >
          <Compass className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-semibold">Mi Reserva</span>
        </button>
      )}
    </div>
  );
}
