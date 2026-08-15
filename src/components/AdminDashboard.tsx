import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Clock3, DollarSign, ReceiptText, Users, XCircle } from 'lucide-react';
import { db } from '../firebase';
import { AdventureTemplate } from '../types';

type Reservation = { id: string; activityId: string; status: 'PENDING' | 'PAID' | 'REJECTED'; paymentMethod?: 'paypal' | 'transfer'; userName?: string; userEmail?: string; date?: string; createdAt?: { toDate?: () => Date }; paymentOrderId?: string };
const money = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const amount = (value?: string) => Number((value || '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
const prettyDate = (value?: string) => value ? new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function AdminDashboard({ activities }: { activities: AdventureTemplate[] }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'REJECTED'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const activityById = useMemo(() => new Map(activities.map(a => [a.id, a])), [activities]);

  useEffect(() => onSnapshot(collection(db, 'reservations'), snapshot => {
    setReservations(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Reservation)).sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0)));
  }), []);

  const totals = useMemo(() => reservations.reduce((state, reservation) => {
    const value = amount(activityById.get(reservation.activityId)?.activityCost);
    state.total += value;
    if (reservation.status === 'PAID') state.confirmed += value;
    if (reservation.status === 'PENDING') { state.pending += value; state.pendingCount += 1; }
    if (reservation.status === 'PAID') state.paidCount += 1;
    return state;
  }, { total: 0, confirmed: 0, pending: 0, pendingCount: 0, paidCount: 0 }), [reservations, activityById]);

  const changeStatus = async (reservation: Reservation, status: Reservation['status']) => {
    setUpdating(reservation.id);
    try { await updateDoc(doc(db, 'reservations', reservation.id), { status, reviewedAt: new Date().toISOString() }); }
    finally { setUpdating(null); }
  };
  const visible = reservations.filter(item => filter === 'all' || item.status === filter);
  const statusStyle = { PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-rose-100 text-rose-800' };
  const statusText = { PENDING: 'Por confirmar', PAID: 'Confirmada', REJECTED: 'Rechazada' };

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Top Adventures · Administración</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Operación y reservas</h1><p className="mt-1 text-slate-500">Actualización en tiempo real de cobros y cupos.</p></div><div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">{reservations.length} reservas registradas</div></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<DollarSign />} label="Ingresos confirmados" value={money.format(totals.confirmed)} tone="emerald" />
        <Metric icon={<Clock3 />} label="Por cobrar" value={money.format(totals.pending)} detail={`${totals.pendingCount} transferencias pendientes`} tone="amber" />
        <Metric icon={<ReceiptText />} label="Facturación potencial" value={money.format(totals.total)} tone="indigo" />
        <Metric icon={<Users />} label="Cupos confirmados" value={String(totals.paidCount)} detail={`${reservations.length ? Math.round(totals.paidCount / reservations.length * 100) : 0}% de conversión`} tone="slate" />
      </section>
      <section className="mt-7 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Reservas</h2><p className="text-sm text-slate-500">Confirma transferencias una vez verificadas.</p></div><div className="flex gap-2 overflow-x-auto">{(['all', 'PENDING', 'PAID', 'REJECTED'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-2 text-xs font-extrabold ${filter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{value === 'all' ? 'Todas' : statusText[value]}</button>)}</div></div>
          <div className="divide-y divide-slate-100">{visible.length ? visible.map(reservation => { const activity = activityById.get(reservation.activityId); return <article key={reservation.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{reservation.userName || 'Cliente'}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[reservation.status]}`}>{statusText[reservation.status]}</span></div><p className="mt-1 text-sm text-slate-500">{reservation.userEmail || 'Sin correo'} · {activity?.sport || 'Actividad eliminada'}</p><p className="mt-1 text-xs text-slate-400">{prettyDate(reservation.date)} · {reservation.paymentMethod === 'transfer' ? 'Transferencia bancaria' : 'Tarjeta / PayPal'} · {money.format(amount(activity?.activityCost))}</p></div><div className="flex gap-2">{reservation.status === 'PENDING' && <><button disabled={updating === reservation.id} onClick={() => changeStatus(reservation, 'PAID')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Confirmar</button><button disabled={updating === reservation.id} onClick={() => changeStatus(reservation, 'REJECTED')} className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"><XCircle className="h-4 w-4" />Rechazar</button></>}</div></article>; }) : <p className="p-10 text-center text-sm text-slate-500">No hay reservas en este estado.</p>}</div>
        </div>
        <aside className="rounded-3xl bg-slate-950 p-6 text-white"><h2 className="text-xl font-black">Rendimiento por actividad</h2><p className="mt-1 text-sm text-slate-400">Ingresos confirmados y reservas.</p><div className="mt-6 space-y-5">{activities.map(activity => { const rows = reservations.filter(row => row.activityId === activity.id); const paid = rows.filter(row => row.status === 'PAID'); return <div key={activity.id}><div className="flex justify-between gap-3 text-sm"><span className="font-bold">{activity.sport}</span><span className="text-emerald-300">{money.format(paid.length * amount(activity.activityCost))}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, (paid.length / Math.max(activity.slotsTotal || 1, rows.length || 1)) * 100)}%` }} /></div><p className="mt-1 text-xs text-slate-400">{paid.length} confirmadas · {rows.length} reservas · {activity.slotsTotal} cupos</p></div> })}</div></aside>
      </section>
    </div>
  </main>;
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail?: string; tone: 'emerald' | 'amber' | 'indigo' | 'slate' }) {
  const styles = { emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', indigo: 'bg-indigo-50 text-indigo-700', slate: 'bg-slate-100 text-slate-700' };
  return <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</div><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div>;
}
