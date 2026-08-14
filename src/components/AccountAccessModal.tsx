import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { loginLocal, registerLocal } from '../localAuth';

type Profile = { id: string; name: string; contactValue: string; contactMethod: 'email' };

export function AccountAccessModal({ onClose, onComplete }: { onClose: () => void; onComplete: (profile: Profile) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const result = mode === 'login' ? await loginLocal(email, password) : await registerLocal(email, password);
      onComplete({ id: result.user.uid, name: result.user.displayName, contactValue: result.user.email, contactMethod: 'email' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible completar la operación.');
    } finally { setBusy(false); }
  };
  return <div className="absolute inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-5 pt-20 backdrop-blur-sm">
    <section className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Acceso a tu cuenta">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">Top Adventures</p><h2 className="mt-1 text-2xl font-black">Tu cuenta</h2><p className="mt-1 text-sm text-slate-300">Inicia sesión o crea una cuenta para reservar.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 text-slate-300 hover:bg-white/10" aria-label="Cerrar acceso"><X className="h-5 w-5" /></button></div>
      <div className="mt-6 flex rounded-xl bg-white/10 p-1"><button type="button" onClick={() => { setMode('login'); setMessage(''); }} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-white text-slate-900' : 'text-slate-300'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('register'); setMessage(''); }} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'register' ? 'bg-white text-slate-900' : 'text-slate-300'}`}>Crear cuenta</button></div>
      <form onSubmit={submit} className="mt-5 space-y-3"><input autoFocus aria-label="Correo" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu correo" required className="w-full rounded-xl px-4 py-3 text-slate-900 outline-none" /><input aria-label="Contraseña" type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} placeholder="contraseña (mínimo 6 caracteres)" required className="w-full rounded-xl px-4 py-3 text-slate-900 outline-none" />{message && <p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-100">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-emerald-500 py-3 font-extrabold text-white hover:bg-emerald-400 disabled:opacity-50">{busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta'}</button></form>
    </section>
  </div>;
}
