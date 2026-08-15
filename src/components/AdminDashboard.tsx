import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  DollarSign,
  FileImage,
  LayoutDashboard,
  Pencil,
  ReceiptText,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { db } from "../firebase";
import { AdventureTemplate } from "../types";

type Reservation = {
  id: string;
  userId?: string;
  activityId: string;
  status: "PENDING" | "PAID" | "REJECTED";
  paymentMethod?: "paypal" | "transfer";
  userName?: string;
  userEmail?: string;
  date?: string;
  createdAt?: { toDate?: () => Date };
  paymentOrderId?: string;
  receiptUrl?: string;
  receiptName?: string;
};
type UserRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  reservations: number;
  lastDate?: string;
};
type Tab =
  | "overview"
  | "reservations"
  | "users"
  | "activities"
  | "transactions"
  | "messages";
const money = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
});
const amount = (value?: string) =>
  Number((value || "0").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
const statusText = {
  PENDING: "Por confirmar",
  PAID: "Confirmada",
  REJECTED: "Rechazada",
};
const defaultInternalCost = (activity?: AdventureTemplate) =>
  activity?.internalCostPerPerson ??
  (activity?.sport.includes("Canopy")
    ? 8
    : activity?.sport.includes("Parapente")
      ? 25
      : 0);

export function AdminDashboard({
  activities,
}: {
  activities: AdventureTemplate[];
}) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [activityRows, setActivityRows] =
    useState<AdventureTemplate[]>(activities);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<AdventureTemplate | null>(null);
  const [notice, setNotice] = useState("");
  const activityById = useMemo(
    () => new Map(activityRows.map((a) => [a.id, a])),
    [activityRows],
  );

  useEffect(
    () =>
      onSnapshot(collection(db, "reservations"), (s) =>
        setReservations(
          s.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Reservation,
          ),
        ),
      ),
    [],
  );
  useEffect(() => setActivityRows(activities), [activities]);
  useEffect(() => {
    activities
      .filter(
        (a) =>
          a.internalCostPerPerson == null &&
          (a.sport.includes("Canopy") || a.sport.includes("Parapente")),
      )
      .forEach((a) =>
        updateDoc(doc(db, "activities", a.id), {
          internalCostPerPerson: defaultInternalCost(a),
        }),
      );
  }, [activities]);
  useEffect(
    () =>
      onSnapshot(collection(db, "messages"), (s) =>
        setMessages(s.docs.map((item) => ({ id: item.id, ...item.data() }))),
      ),
    [],
  );
  const users = useMemo<UserRow[]>(() => {
    const map = new Map<string, UserRow>();
    reservations.forEach((r) => {
      const key = r.userId || r.userEmail || r.id;
      const row: UserRow = map.get(key) || {
        id: key,
        userId: r.userId || "",
        name: r.userName || "Cliente",
        email: r.userEmail || "Sin correo",
        reservations: 0,
      };
      row.reservations += 1;
      row.lastDate = r.date;
      map.set(key, row);
    });
    return [...map.values()];
  }, [reservations]);
  const totals = useMemo(
    () =>
      reservations.reduce(
        (x, r) => {
          const v = amount(activityById.get(r.activityId)?.activityCost);
          x.potential += v;
          if (r.status === "PAID") x.confirmed += v;
          if (r.status === "PENDING") x.pending += v;
          return x;
        },
        { potential: 0, confirmed: 0, pending: 0 },
      ),
    [reservations, activityById],
  );
  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      { revenue: number; costs: number; profit: number; reservations: number }
    >();
    reservations
      .filter((r) => r.status === "PAID" && r.date)
      .forEach((r) => {
        const key = new Date(r.date as string).toISOString().slice(0, 7);
        const activity = activityById.get(r.activityId);
        const revenue = amount(activity?.activityCost);
        const costs = defaultInternalCost(activity);
        const row = map.get(key) || {
          revenue: 0,
          costs: 0,
          profit: 0,
          reservations: 0,
        };
        row.revenue += revenue;
        row.costs += costs;
        row.profit += revenue - costs;
        row.reservations += 1;
        map.set(key, row);
      });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, row]) => ({
        key,
        label: new Date(`${key}-01T12:00:00`).toLocaleDateString("es-EC", {
          month: "short",
          year: "numeric",
        }),
        ...row,
      }));
  }, [reservations, activityById]);
  const maxMonthlyValue = Math.max(
    1,
    ...monthlyStats.flatMap((m) => [m.revenue, m.costs, Math.max(0, m.profit)]),
  );
  const filteredReservations = reservations.filter((r) =>
    `${r.userName} ${r.userEmail} ${r.paymentOrderId}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const groupedReservations = useMemo(() => {
    const groups = new Map<
      string,
      { activity: string; dates: Map<string, Reservation[]> }
    >();
    filteredReservations.forEach((r) => {
      const activity =
        activityById.get(r.activityId)?.sport || "Actividad eliminada";
      const date = r.date || "Sin fecha planificada";
      const group = groups.get(activity) || {
        activity,
        dates: new Map<string, Reservation[]>(),
      };
      group.dates.set(date, [...(group.dates.get(date) || []), r]);
      groups.set(activity, group);
    });
    return [...groups.values()]
      .sort((a, b) => a.activity.localeCompare(b.activity))
      .map((group) => ({
        ...group,
        dates: [...group.dates.entries()].sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      }));
  }, [filteredReservations, activityById]);
  const updateStatus = async (
    r: Reservation,
    status: Reservation["status"],
  ) => {
    try {
      await updateDoc(doc(db, "reservations", r.id), {
        status,
        reviewedAt: new Date().toISOString(),
      });
      const activity = activityById.get(r.activityId);
      const label = status === "PAID" ? "confirmada" : "rechazada";
      const activityLink = `${window.location.origin}/?activity=${encodeURIComponent(r.activityId)}&date=${encodeURIComponent(r.date || "")}`;
      const dateLabel = r.date
        ? new Date(r.date).toLocaleDateString("es-EC", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "por confirmar";
      const attachments =
        status === "REJECTED" && r.receiptUrl
          ? [
              {
                filename: r.receiptName || "comprobante-anterior",
                path: r.receiptUrl,
              },
            ]
          : undefined;
      const detail = `<div style="font-family:Arial,sans-serif;color:#334155;line-height:1.6"><h2 style="color:${status === "PAID" ? "#047857" : "#be123c"}">${status === "PAID" ? "¡Pago confirmado y reserva confirmada!" : "Comprobante rechazado: acción requerida"}</h2><p>Hola <strong>${r.userName || "aventurero"}</strong>,</p>${status === "PAID" ? `<p>Hemos verificado correctamente tu pago por transferencia bancaria. Tu cupo para esta experiencia ya está confirmado.</p><p>Te recomendamos guardar este correo, revisar los detalles y llegar con anticipación al punto de encuentro.</p>` : `<p>El comprobante enviado no coincide con ninguna de las transferencias recibidas en nuestra cuenta bancaria, por lo que no pudimos confirmar el pago y la reserva fue rechazada.</p><p>Adjuntamos nuevamente el comprobante que recibimos para que puedas revisarlo. Si la transferencia sí fue realizada, haz una nueva transferencia con los datos siguientes y envía el nuevo comprobante desde el botón de este correo.</p><div style="background:#fff7ed;border:1px solid #fed7aa;padding:20px;border-radius:12px;margin:20px 0"><h3 style="color:#9a3412;margin-top:0">Datos para realizar la transferencia</h3><p><strong>Banco:</strong> Banco Pichincha<br><strong>Tipo de cuenta:</strong> Cuenta de ahorro<br><strong>Número:</strong> 2207864241<br><strong>Nombre:</strong> Andrés Díaz<br><strong>CI/RUC:</strong> 0101029000883</p></div><p>Después de realizar la transferencia, conserva el comprobante y adjúntalo nuevamente en la web.</p>`}<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:20px;border-radius:12px;margin:20px 0"><h3 style="color:#047857;margin-top:0">Detalles de la reserva</h3><ul style="list-style:none;padding:0;line-height:1.8"><li><strong>Actividad:</strong> ${activity?.sport || "Actividad"}</li><li><strong>Ciudad:</strong> ${activity?.city || "—"}</li><li><strong>Fecha:</strong> ${dateLabel}</li><li><strong>Hora:</strong> ${activity?.time || "—"}</li><li><strong>Punto de encuentro:</strong> ${activity?.meetingPointName || "—"} (${activity?.meetingPointAddress || "—"})</li>${activity?.duration ? `<li><strong>Duración aproximada:</strong> ${activity.duration}</li>` : ""}${activity?.activityCost ? `<li><strong>Costo total:</strong> ${activity.activityCost}</li>` : ""}</ul>${activity?.requiredGear?.length ? `<h4 style="color:#047857">Material necesario</h4><ul>${activity.requiredGear.map((gear) => `<li>${gear}</li>`).join("")}</ul>` : ""}${activity?.itinerary?.length ? `<h4 style="color:#047857">Itinerario</h4><ul>${activity.itinerary.map((step) => `<li>${step}</li>`).join("")}</ul>` : ""}${activity?.description ? `<h4 style="color:#047857">Sobre la actividad</h4><p>${activity.description}</p>` : ""}</div><p><a href="${activityLink}" style="background:#10b981;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">${status === "REJECTED" ? "Adjuntar nuevamente el comprobante de pago" : "Ver actividad en la web"}</a></p><p>¡Gracias por elegir Top Adventures!</p></div>`;
      const adminDetail = `<div style="font-family:Arial,sans-serif;color:#334155;line-height:1.6"><h2>Reserva ${label}</h2><p>La reserva de <strong>${r.userName || "cliente"}</strong> (${r.userEmail || "sin correo"}) fue ${label}.</p><ul><li><strong>Actividad:</strong> ${activity?.sport || "—"}</li><li><strong>Ciudad:</strong> ${activity?.city || "—"}</li><li><strong>Fecha:</strong> ${dateLabel}</li><li><strong>Hora:</strong> ${activity?.time || "—"}</li><li><strong>Costo:</strong> ${activity?.activityCost || "—"}</li></ul></div>`;
      await Promise.all([
        r.userEmail
          ? fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: r.userEmail,
                subject:
                  status === "PAID"
                    ? `Pago confirmado: ${activity?.sport || "tu aventura"}`
                    : `Reserva rechazada: comprobante no identificado - ${activity?.sport || "actividad"}`,
                html: detail,
                ...(attachments ? { attachments } : {}),
              }),
            })
          : Promise.resolve(),
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "andres.diaz.alvear@gmail.com",
            subject: `Reserva ${label}: ${activity?.sport || "actividad"}`,
            html: adminDetail,
          }),
        }),
      ]);
      setNotice("Reserva actualizada y notificaciones enviadas");
    } catch (error) {
      console.error(error);
      setNotice(
        "La reserva cambió, pero no se pudo enviar el correo. Revisa la configuración del proveedor de email.",
      );
    }
  };
  const remove = async (path: string, id: string) => {
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    await deleteDoc(doc(db, path, id));
    setNotice("Registro eliminado");
  };
  const saveActivity = async () => {
    if (!editing) return;
    const { id, ...data } = editing;
    await updateDoc(doc(db, "activities", id), data as Record<string, unknown>);
    setEditing(null);
    setNotice("Actividad guardada");
  };
  const nav: [Tab, string, ReactNode][] = [
    ["overview", "Resumen", <LayoutDashboard />],
    ["reservations", "Reservas", <ReceiptText />],
    ["users", "Usuarios", <Users />],
    ["activities", "Actividades", <Database />],
    ["transactions", "Transacciones", <DollarSign />],
    ["messages", "Mensajes", <FileImage />],
  ];
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">
              Top Adventures · Administración completa
            </p>
            <h1 className="mt-1 text-3xl font-black">Centro de control</h1>
            <p className="text-slate-500">
              Gestiona datos, reservas, comprobantes y operaciones.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en la administración"
              className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </header>
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          {nav.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {notice && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {notice}
          </div>
        )}
        {tab === "overview" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                icon={<DollarSign />}
                label="Ingresos confirmados"
                value={money.format(totals.confirmed)}
              />
              <Metric
                icon={<Clock3 />}
                label="Pendiente de revisión"
                value={money.format(totals.pending)}
              />
              <Metric
                icon={<ReceiptText />}
                label="Facturación potencial"
                value={money.format(totals.potential)}
              />
              <Metric
                icon={<Users />}
                label="Usuarios detectados"
                value={String(users.length)}
              />
            </section>
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Actividad reciente">
                <div className="divide-y divide-slate-100">
                  {reservations.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-bold">{r.userName || "Cliente"}</p>
                        <p className="text-xs text-slate-500">
                          {activityById.get(r.activityId)?.sport || "Actividad"}{" "}
                          ·{" "}
                          {r.paymentMethod === "transfer"
                            ? "Transferencia"
                            : "PayPal / tarjeta"}
                        </p>
                      </div>
                      <Badge status={r.status} />
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Estado del sistema">
                <div className="space-y-3 text-sm">
                  <p className="flex justify-between">
                    <span>Reservas</span>
                    <b>{reservations.length}</b>
                  </p>
                  <p className="flex justify-between">
                    <span>Actividades publicadas</span>
                    <b>{activityRows.length}</b>
                  </p>
                  <p className="flex justify-between">
                    <span>Mensajes almacenados</span>
                    <b>{messages.length}</b>
                  </p>
                </div>
              </Panel>
              <Panel title="Ingresos, costos y beneficio por mes">
                <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold">
                  <span className="text-emerald-700">● Ingresos</span>
                  <span className="text-amber-700">● Costos</span>
                  <span className="text-indigo-700">● Beneficio</span>
                </div>
                {monthlyStats.length ? (
                  <div className="flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-200 px-2 pt-4">
                    {monthlyStats.map((month) => (
                      <div
                        key={month.key}
                        className="flex min-w-20 flex-1 flex-col items-center gap-2"
                      >
                        <div className="flex h-48 w-full items-end justify-center gap-1">
                          <div
                            title={`Ingresos: ${money.format(month.revenue)}`}
                            className="w-1/4 rounded-t bg-emerald-500"
                            style={{
                              height: `${Math.max(4, (month.revenue / maxMonthlyValue) * 100)}%`,
                            }}
                          />
                          <div
                            title={`Costos: ${money.format(month.costs)}`}
                            className="w-1/4 rounded-t bg-amber-500"
                            style={{
                              height: `${Math.max(4, (month.costs / maxMonthlyValue) * 100)}%`,
                            }}
                          />
                          <div
                            title={`Beneficio: ${money.format(month.profit)}`}
                            className="w-1/4 rounded-t bg-indigo-500"
                            style={{
                              height: `${Math.max(4, (Math.max(0, month.profit) / maxMonthlyValue) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold capitalize text-slate-500">
                          {month.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {month.reservations} reserva(s)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">
                    Aún no hay reservas confirmadas para mostrar estadísticas
                    mensuales.
                  </p>
                )}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {monthlyStats.slice(-3).map((month) => (
                    <div key={month.key} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">
                        {month.label}
                      </p>
                      <p className="mt-1 font-black text-emerald-700">
                        Ingresos {money.format(month.revenue)}
                      </p>
                      <p className="text-sm text-amber-700">
                        Costos {money.format(month.costs)}
                      </p>
                      <p className="text-sm font-bold text-indigo-700">
                        Beneficio {money.format(month.profit)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          </>
        )}
        {tab === "reservations" && (
          <Panel title={`Reservas agrupadas (${filteredReservations.length})`}>
            <div className="space-y-6">
              {groupedReservations.map((group) => (
                <section
                  key={group.activity}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <details className="group">
                    <summary className="cursor-pointer list-none border-b border-slate-200 bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-black">{group.activity}</h2>
                          <p className="text-xs text-slate-300">
                            {group.dates.reduce(
                              (total, [, items]) => total + items.length,
                              0,
                            )}{" "}
                            reserva(s)
                          </p>
                        </div>
                        <span className="text-lg transition-transform group-open:rotate-180">
                          ⌄
                        </span>
                      </div>
                    </summary>
                    <div className="space-y-4 p-4">
                      {group.dates.map(([date, items]) => (
                        <details
                          key={date}
                          className="group/date overflow-hidden rounded-xl border border-slate-200"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-emerald-600" />
                              <h3 className="font-black text-slate-800">
                                {date}
                              </h3>
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                                {items.length}
                              </span>
                            </div>
                            <span className="text-slate-500 transition-transform group-open/date:rotate-180">
                              ⌄
                            </span>
                          </summary>
                          <div className="space-y-3 p-3">
                            {items.map((r) => (
                              <article
                                key={r.id}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="font-black">
                                        {r.userName || "Cliente"}
                                      </h4>
                                      <Badge status={r.status} />
                                    </div>
                                    <p className="text-sm text-slate-500">
                                      {r.userEmail} ·{" "}
                                      {money.format(
                                        amount(
                                          activityById.get(r.activityId)
                                            ?.activityCost,
                                        ),
                                      )}
                                    </p>
                                    {r.receiptUrl ? (
                                      <a
                                        href={r.receiptUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                                      >
                                        <FileImage className="h-4 w-4" />
                                        Ver comprobante{" "}
                                        {r.receiptName
                                          ? `(${r.receiptName})`
                                          : ""}
                                      </a>
                                    ) : (
                                      r.paymentMethod === "transfer" && (
                                        <p className="mt-3 text-sm font-semibold text-amber-700">
                                          No se encontró el archivo adjunto.
                                        </p>
                                      )
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {r.status === "PENDING" && (
                                      <>
                                        <button
                                          onClick={() =>
                                            updateStatus(r, "PAID")
                                          }
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                          Aprobar
                                        </button>
                                        <button
                                          onClick={() =>
                                            updateStatus(r, "REJECTED")
                                          }
                                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Rechazar
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() =>
                                        remove("reservations", r.id)
                                      }
                                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                </section>
              ))}
            </div>
          </Panel>
        )}
        {tab === "users" && (
          <Panel title={`Usuarios (${users.length})`}>
            <Table
              headers={[
                "Usuario",
                "Correo",
                "Reservas",
                "Última actividad",
                "Acciones",
              ]}
            >
              {users
                .filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-bold">{u.name}</td>
                    <td className="px-3 py-3">{u.email}</td>
                    <td className="px-3 py-3">{u.reservations}</td>
                    <td className="px-3 py-3">{u.lastDate || "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      Perfil derivado de reservas
                    </td>
                  </tr>
                ))}
            </Table>
          </Panel>
        )}
        {tab === "activities" && (
          <Panel title={`Actividades (${activityRows.length})`}>
            <Table
              headers={["Actividad", "Ciudad", "Precio", "Cupos", "Acciones"]}
            >
              {activityRows
                .filter((a) =>
                  `${a.sport} ${a.city}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-bold">{a.sport}</td>
                    <td className="px-3 py-3">{a.city}</td>
                    <td className="px-3 py-3">{a.activityCost || "—"}</td>
                    <td className="px-3 py-3">
                      {a.slotsAvailable}/{a.slotsTotal}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setEditing(a)}
                        className="mr-2 rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove("activities", a.id)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </Table>
          </Panel>
        )}
        {tab === "transactions" && (
          <Panel title="Transacciones">
            <Table
              headers={["Referencia", "Cliente", "Método", "Estado", "Importe"]}
            >
              {filteredReservations.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono text-xs">
                    {r.paymentOrderId || r.id}
                  </td>
                  <td className="px-3 py-3">{r.userEmail}</td>
                  <td className="px-3 py-3">{r.paymentMethod || "—"}</td>
                  <td className="px-3 py-3">
                    <Badge status={r.status} />
                  </td>
                  <td className="px-3 py-3 font-bold">
                    {money.format(
                      amount(activityById.get(r.activityId)?.activityCost),
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}
        {tab === "messages" && (
          <Panel title={`Mensajes (${messages.length})`}>
            <Table
              headers={["ID", "Actividad", "Remitente", "Mensaje", "Acciones"]}
            >
              {messages
                .filter((m) =>
                  JSON.stringify(m).toLowerCase().includes(query.toLowerCase()),
                )
                .map((m) => (
                  <tr key={String(m.id)} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-mono text-xs">
                      {String(m.id)}
                    </td>
                    <td className="px-3 py-3">{String(m.activityId || "—")}</td>
                    <td className="px-3 py-3">
                      {String(m.senderName || m.senderId || "—")}
                    </td>
                    <td className="max-w-xs truncate px-3 py-3">
                      {String(m.text || "—")}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => remove("messages", String(m.id))}
                        className="text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </Table>
          </Panel>
        )}
        {editing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-black">Editar actividad</h2>
              <div className="mt-4 grid gap-3">
                <label className="text-sm font-bold">
                  Descripción
                  <textarea
                    value={editing.description || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  Precio
                  <input
                    value={editing.activityCost || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, activityCost: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  Costo interno por persona (privado)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      editing.internalCostPerPerson ??
                      defaultInternalCost(editing)
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        internalCostPerPerson: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  Cupos disponibles
                  <input
                    type="number"
                    value={editing.slotsAvailable}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        slotsAvailable: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-xl px-4 py-2 font-bold text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveActivity}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-xs uppercase tracking-wide text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Badge({ status }: { status: Reservation["status"] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "PAID" ? "bg-emerald-100 text-emerald-800" : status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}
    >
      {statusText[status]}
    </span>
  );
}
