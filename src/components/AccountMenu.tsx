import { useState } from 'react';
import { CircleUserRound, LogIn, LogOut } from 'lucide-react';

type AccountUser = {
  name?: string;
  contactValue?: string;
};

type Props = {
  user: AccountUser | null;
  onLogout: () => void;
  onOpenAccount: () => void;
};

export function AccountMenu({ user, onLogout, onOpenAccount }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenAccount}
        className="absolute top-4 right-4 z-[70] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur transition hover:bg-white"
        aria-label="Acceder a mi cuenta"
      >
        <LogIn className="h-4 w-4 text-emerald-600" />
        Cuenta
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-[70]">
      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
        aria-label="Abrir menú de cuenta"
        aria-expanded={isOpen}
      >
        <CircleUserRound className="h-5 w-5 text-emerald-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-bold text-slate-900">{user.name || 'Aventurero'}</p>
            <p className="truncate text-xs text-slate-500">{user.contactValue || 'Cuenta activa'}</p>
          </div>
          <button
            type="button"
            onClick={() => { setIsOpen(false); onLogout(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
