import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { loginLocal, registerLocal } from '../localAuth';
import { signInWithGoogle } from '../firebase';

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
  const continueWithGoogle = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await signInWithGoogle();
      onComplete({ id: result.user.uid, name: result.user.displayName || 'Aventurero', contactValue: result.user.email || '', contactMethod: 'email' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesión con Google.');
    } finally { setBusy(false); }
  };
  return <div className="absolute inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-5 pt-20 backdrop-blur-sm">
    <section className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl ring-1 ring-slate-200" role="dialog" aria-modal="true" aria-label="Acceso a tu cuenta">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Top Adventures</p><h2 className="mt-1 text-2xl font-black text-slate-950">Tu cuenta</h2><p className="mt-1 text-sm text-slate-600">Inicia sesión o crea una cuenta para reservar.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar acceso"><X className="h-5 w-5" /></button></div>
      <div className="mt-6 flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => { setMode('login'); setMessage(''); }} className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-950'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('register'); setMessage(''); }} className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${mode === 'register' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-950'}`}>Crear cuenta</button></div>
      <form onSubmit={submit} className="mt-5 space-y-3"><label className="block text-sm font-bold text-slate-700">Correo<input autoFocus aria-label="Correo" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu correo" required className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label><label className="block text-sm font-bold text-slate-700">Contraseña<input aria-label="Contraseña" type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} placeholder="mínimo 6 caracteres" required className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></label>{message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-emerald-600 py-3 font-extrabold text-white shadow-sm transition hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200 disabled:opacity-50">{busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta'}</button></form><div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" />o continúa con<span className="h-px flex-1 bg-slate-200" /></div><button type="button" disabled={busy} onClick={continueWithGoogle} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white py-3 font-extrabold text-slate-700 transition hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 disabled:opacity-50"><span className="text-lg font-black text-[#4285F4]">G</span>Continuar con Google</button>
    </section>
  </div>;
}
