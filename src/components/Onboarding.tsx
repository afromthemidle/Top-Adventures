import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, AdventureTemplate } from '../types';
import { ArrowRight, User, Mail, MessageCircle, CheckCircle2, Loader2, Calendar, CalendarPlus } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { localCurrentUser, loginLocal, registerLocal } from '../localAuth';

const initialOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture",
};

interface Props {
  selectedAdventure: AdventureTemplate;
  existingProfile?: UserProfile | null;
  onComplete: (profile: UserProfile, activityId?: string) => void;
  onCancel: () => void;
}

export function Onboarding({ selectedAdventure, existingProfile, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(existingProfile ? 1 : 0);
  const [isSimulatingSending, setIsSimulatingSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !auth.currentUser?.isAnonymous) {
        setProfile((current) => ({ ...current, name: user.displayName || current.name || 'Aventurero', contactValue: user.email || current.contactValue || '', contactMethod: 'email' }));
        setStep((current) => current === 0 ? 1 : current);
      }
    });
    return () => unsubscribe();
  }, []);

  const [profile, setProfile] = useState<Partial<UserProfile>>(existingProfile || {
    name: '',
    contactMethod: 'email',
    contactValue: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'transfer'>('paypal');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const isEcuador = ['Cuenca', 'Quito', 'Guayaquil', 'Baños'].includes(selectedAdventure.city);

  const handlePayPalSuccess = async (paymentId: string) => {
    setHasPaid(true);
    const usedProfile = profile.name ? profile : (JSON.parse(localStorage.getItem('pendingProfile') || '{}'));
    if (auth.currentUser) {
      try {
        const reservationData = {
          userId: auth.currentUser.uid,
          activityId: selectedAdventure.id,
          date: selectedAdventure.date.toISOString(),
          status: 'PENDING',
          paymentMethod: paymentId.startsWith('bank_transfer') ? 'transfer' : 'paypal',
          paymentOrderId: paymentId,
          createdAt: serverTimestamp(),
          userName: usedProfile.name || 'Anonymous',
          userEmail: usedProfile.contactValue || 'no-email@example.com'
        };
        const docRef = await addDoc(collection(db, 'reservations'), reservationData);
        setReservationId(docRef.id);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'reservations');
      }
    }
    completeRegistration(usedProfile);
  };

  const steps = [
    {
      id: 'auth',
      title: 'Regístrate para reservar',
      subtitle: 'Conéctate con Google para guardar tu reserva y acceder al chat de grupo de forma segura.',
      icon: <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-8"><User className="w-10 h-10 text-emerald-600" /></div>,
      content: (
        <div className="space-y-4 w-full">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => { setAuthMode('register'); setAuthError(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg ${authMode === 'register' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Crear cuenta</button>
            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg ${authMode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Iniciar sesión</button>
          </div>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setAuthError(null);
            setIsAuthenticating(true);
            try {
              const result = authMode === 'register' ? await registerLocal(authEmail, authPassword) : await loginLocal(authEmail, authPassword);
              setProfile({ name: result.user.displayName || 'Aventurero', contactValue: result.user.email || authEmail.trim(), contactMethod: 'email' });
              setStep(1);
            } catch (err: any) {
              const code = err?.code || '';
              setAuthError(code === 'auth/email-already-in-use' ? 'Este correo ya tiene una cuenta. Inicia sesión.' : code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'El correo o la contraseña no son correctos.' : code === 'auth/weak-password' ? 'La contraseña debe tener al menos 6 caracteres.' : code === 'auth/invalid-email' ? 'Escribe un correo válido.' : 'No se pudo completar la autenticación. Verifica Firebase e inténtalo nuevamente.');
            } finally { setIsAuthenticating(false); }
          }} className="space-y-3">
            <input aria-label="Correo electrónico" type="email" required autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Correo electrónico" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
            <input aria-label="Contraseña" type="password" required minLength={6} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Contraseña (mínimo 6 caracteres)" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
            {authError && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{authError}</p>}
            <button type="submit" disabled={isAuthenticating} className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">{isAuthenticating ? 'Procesando...' : authMode === 'register' ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
          </form>
          <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1" />o<span className="h-px bg-slate-200 flex-1" /></div>
          <button 
            onClick={async () => {
               try {
                 const { signInWithGoogle } = await import('../firebase');
                 localStorage.setItem('pendingAdventure', selectedAdventure.id);
                 await signInWithGoogle();
               } catch(err) {
                 console.error("Sign in failed", err);
                 alert("Hubo un error al iniciar sesión.");
               }
            }}
            className="w-full py-4 rounded-xl flex items-center justify-center font-bold text-lg text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <span className="text-xl mr-2">G</span> Continuar con Google
          </button>
        </div>
      ),
      isValid: !!localCurrentUser() || !!auth.currentUser,
    },
    {
      id: 'payment',
      title: 'Reserva tu cupo',
      subtitle: 'Realiza el pago para confirmar tu lugar. Este pago cubre tanto la organización como la actividad en sí.',
      icon: <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-8"><span className="text-4xl">💳</span></div>,
      content: (
        <div className="space-y-6 w-full text-center">
          <div className="bg-slate-50 p-6 rounded-2xl border border-emerald-200">
            <h4 className="font-bold text-slate-800 mb-4">Total a Pagar</h4>
            <div className="flex justify-between items-center py-2 border-b border-emerald-100">
              <span className="text-slate-600">Actividad Completa</span>
              <span className="font-bold text-emerald-700 text-xl">{selectedAdventure.activityCost} USD</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-left">
              * Incluye material para la actividad y guía. No incluye comida, transporte ni seguro de accidentes. Un solo pago, sin sorpresas.
            </p>
          </div>
          {!hasPaid ? (
            <div className="w-full flex justify-center text-center">
              <div className="w-full">
                
                {isEcuador && (
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'paypal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Tarjeta / PayPal
                    </button>
                    <button
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${paymentMethod === 'transfer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Transferencia
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-4 pb-4">
                  {isCapturing && (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                      <p className="text-sm font-medium text-slate-600">Procesando pago...</p>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-left">
                      <p className="font-bold mb-1">Hubo un problema:</p>
                      <p>{paymentError}</p>
                    </div>
                  )}

                  {paymentMethod === 'paypal' || !isEcuador ? (
                    <div className={isCapturing ? "opacity-50 pointer-events-none" : ""}>
                      <PayPalScriptProvider options={initialOptions}>
                        <PayPalButtons
                            style={{ layout: "vertical" }}
                            createOrder={async () => {
                               setIsCreatingOrder(true);
                               setPaymentError(null);
                               try {
                                 const amountRaw = selectedAdventure.activityCost ? selectedAdventure.activityCost.replace(/[^0-9.]/g, '') : "25.00";
                                 const amount = amountRaw || "25.00";
                                 const response = await fetch('/api/paypal/create-order', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ amount }),
                                 });
                                 const data = await response.json();
                                 if (data.success && data.id) {
                                   return data.id;
                                 } else {
                                   throw new Error(data.error || "No se pudo iniciar el pago");
                                 }
                               } catch(err: any) {
                                  setPaymentError(err.message);
                                  throw err;
                               } finally {
                                  setIsCreatingOrder(false);
                               }
                            }}
                            onApprove={async (data, actions) => {
                               setIsCapturing(true);
                               setPaymentError(null);
                               try {
                                 const response = await fetch('/api/paypal/capture-order', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ orderID: data.orderID })
                                 });
                                 const captureData = await response.json();
                                 if (captureData.success) {
                                   await handlePayPalSuccess(data.orderID);
                                 } else {
                                   throw new Error(captureData.error || "Error capturando la orden");
                                 }
                               } catch(err: any) {
                                  setPaymentError(err.message);
                               } finally {
                                  setIsCapturing(false);
                               }
                            }}
                            onError={(err) => {
                               console.error(err);
                               setPaymentError("Hubo un problema al procesar PayPal.");
                            }}
                        />
                      </PayPalScriptProvider>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 text-left shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-3 text-center border-b border-slate-100 pb-2">Datos para Transferencia</h4>
                      <div className="space-y-2 text-sm text-slate-700">
                        <p><span className="font-semibold text-slate-900">Banco:</span> Banco Pichincha</p>
                        <p><span className="font-semibold text-slate-900">Tipo de cuenta:</span> Cuenta de ahorro</p>
                        <p><span className="font-semibold text-slate-900">Número:</span> 2207864241</p>
                        <p><span className="font-semibold text-slate-900">Nombre:</span> Andrés Díaz</p>
                        <p><span className="font-semibold text-slate-900">CI/RUC:</span> 0101029000883</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Comprobante de transferencia</label>
                        <input
                           type="file"
                           accept="image/*,.pdf"
                           onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                           className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                      </div>
                      <button
                        onClick={() => handlePayPalSuccess('bank_transfer_' + Date.now())}
                        disabled={!receiptFile}
                        className={`w-full mt-5 rounded-lg py-3 font-bold transition-colors shadow-sm ${receiptFile ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        Confirmar Pago por Transferencia
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          ) : (


            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold p-4 rounded-xl flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              {paymentMethod === 'transfer' ? '¡Comprobante enviado!' : '¡Pago procesado exitosamente!'}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4">
            {hasPaid 
              ? (paymentMethod === 'transfer' ? 'Comprobante recibido. Guardando información...' : 'Pago confirmado. Finalizando tu reserva...')
              : 'Verificación segura. Debes completar el pago aquí para activar tu reserva.'}
          </p>
        </div>
      ),
      isValid: hasPaid,
    }
  ];

  const completeRegistration = (currentProfile = profile) => {
    if (isSimulatingSending) return;
    setIsSimulatingSending(true);

    const finishSetup = () => {
      setIsSimulatingSending(false);
      setIsSuccess(true);
    };

    const appLink = `${window.location.origin}/?view=dashboard&activity=${selectedAdventure.id}`;
    
    const userEmailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentProfile.contactValue,
          subject: paymentMethod === 'transfer' ? `Recibimos tu comprobante para ${selectedAdventure.sport}` : `Tu aventura de ${selectedAdventure.sport} confirmada 🚀`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>${paymentMethod === 'transfer' ? '¡Comprobante recibido!' : '¡Reserva confirmada!'}</h2>
              <p>Hola <strong>${currentProfile.name}</strong>,</p>
              ${paymentMethod === 'transfer' 
                ? `<p>Hemos recibido el comprobante de tu pago por transferencia para la aventura de <strong>${selectedAdventure.sport}</strong> en <strong>${selectedAdventure.city}</strong>.</p><p>Lo verificaremos en las próximas 3 horas (horario laborable) y confirmaremos tu cupo.</p>` 
                : `<p>Has reservado exitosamente tu aventura de <strong>${selectedAdventure.sport}</strong> en <strong>${selectedAdventure.city}</strong>.</p>`}
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #047857;">Detalles de la actividad:</h3>
                <ul style="list-style: none; padding: 0; line-height: 1.6;">
                  <li>📅 <strong>Fecha:</strong> ${selectedAdventure.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</li>
                  <li>⏰ <strong>Hora:</strong> ${selectedAdventure.time}</li>
                  <li>📍 <strong>Punto de encuentro:</strong> ${selectedAdventure.meetingPointName} (${selectedAdventure.meetingPointAddress})</li>
                  ${selectedAdventure.duration ? `<li>⏳ <strong>Duración aproximada:</strong> ${selectedAdventure.duration}</li>` : ''}
                  ${selectedAdventure.activityCost ? `<li>💰 <strong>Costo total:</strong> ${selectedAdventure.activityCost}<br/><span style="font-size: 12px; color: #047857;">(Incluye material para la actividad y guía. No incluye comida, transporte ni seguro de accidentes)</span></li>` : ''}
                </ul>
                <h4 style="margin-bottom: 8px; color: #047857;">Material necesario (deberás llevarlo el día de la actividad):</h4>
                <ul style="margin-top: 0; line-height: 1.5;">
                  ${selectedAdventure.requiredGear.map(gear => `<li>${gear}</li>`).join('')}
                </ul>
                ${selectedAdventure.itinerary && selectedAdventure.itinerary.length > 0 ? `
                <h4 style="margin-bottom: 8px; color: #047857; margin-top: 16px;">Itinerario:</h4>
                <ul style="margin-top: 0; line-height: 1.5; padding-left: 20px;">
                  ${selectedAdventure.itinerary.map(step => `<li>${step}</li>`).join('')}
                </ul>
                ` : ''}
                ${selectedAdventure.description ? `
                <h4 style="margin-bottom: 8px; color: #047857; margin-top: 16px;">Sobre la actividad:</h4>
                <p style="margin-top: 0; line-height: 1.5; font-style: italic; color: #475569;">
                  ${selectedAdventure.description}
                </p>
                ` : ''}
              </div>
              <p>Para ver los detalles de tu ${paymentMethod === 'transfer' ? 'reserva' : 'confirmación'} en la app y prepararte, ingresa al siguiente enlace:</p>
              <p style="margin: 30px 0;">
                <a href="${appLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Ver mi reserva en la web</a>
              </p>
              
              <p>¡Prepárate para la acción! 🏔️🏄‍♂️🚴‍♂️</p>
            </div>
          `
        })
      });

    const adminEmailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'andres.diaz.alvear@gmail.com',
          subject: `NUEVA RESERVA (${paymentMethod === 'transfer' ? 'PENDIENTE' : 'CONFIRMADA'}): ${selectedAdventure.sport} - ${currentProfile.name}`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>¡Nueva reserva ${paymentMethod === 'transfer' ? 'pendiente de verificación de pago' : 'confirmada'}! ${paymentMethod === 'transfer' ? '👀' : '🎉'}</h2>
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #0f172a;">👤 Datos del Usuario</h3>
                <ul style="list-style: none; padding: 0; line-height: 1.6;">
                  <li><strong>Nombre:</strong> ${currentProfile.name}</li>
                  <li><strong>Email/Contacto:</strong> ${currentProfile.contactValue}</li>
                </ul>
              </div>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px;">
                <h3 style="margin-top: 0; color: #047857;">🏕️ Datos de la Reserva</h3>
                <ul style="list-style: none; padding: 0; line-height: 1.6;">
                  <li><strong>Actividad:</strong> ${selectedAdventure.sport}</li>
                  <li><strong>Ciudad:</strong> ${selectedAdventure.city}</li>
                  <li>📅 <strong>Fecha:</strong> ${selectedAdventure.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</li>
                  <li>⏰ <strong>Hora:</strong> ${selectedAdventure.time}</li>
                  <li>📍 <strong>Punto de encuentro:</strong> ${selectedAdventure.meetingPointName} (${selectedAdventure.meetingPointAddress})</li>
                  ${selectedAdventure.activityCost ? `<li>💰 <strong>Costo Total:</strong> ${selectedAdventure.activityCost} (${paymentMethod === 'transfer' ? 'Pendiente de verificación de pago' : 'Pagado completo'})</li>` : ''}
                </ul>
              </div>
              <p style="margin-top:20px; color:#666; font-size:12px;">Mensaje automático enviado desde TopAdventures.</p>
            </div>
          `
        })
    });

    Promise.all([userEmailPromise, adminEmailPromise])
      .then(responses => Promise.all(responses.map(res => res.json())))
      .then((dataArray) => {
        dataArray.forEach((data, index) => {
          if (!data.success) {
            console.error(`Error desde API de correo (${index === 0 ? 'Usuario' : 'Admin'}):`, data.error);
          }
        });
        finishSetup();
      })
      .catch(err => {
        console.error("Error enviando correos:", err);
        finishSetup();
      });
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      completeRegistration();
    }
  };

  const generateGoogleCalendarLink = () => {
    const startDate = new Date(selectedAdventure.date);
    const timeMatch = selectedAdventure.time.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[3]?.toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      startDate.setHours(hours, mins, 0);
    }
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const text = encodeURIComponent(`${selectedAdventure.sport} en ${selectedAdventure.city}`);
    const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
    const details = encodeURIComponent(selectedAdventure.description || '');
    const location = encodeURIComponent(`${selectedAdventure.meetingPointName}, ${selectedAdventure.meetingPointAddress}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden bg-slate-50 h-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center max-w-sm text-center w-full"
        >
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          
          {paymentMethod === 'transfer' ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">¡Comprobante Recibido, {profile.name}!</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-amber-800 text-sm font-medium">
                Tu reserva está pendiente de verificación de pago. Lo verificaremos en las próximas 3 horas (horario laborable) y confirmaremos tu cupo.
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">¡Todo listo, {profile.name}!</h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                Te acabamos de enviar un súper mensaje a <br />
                <span className="font-semibold text-slate-800">{profile.contactValue}</span> <br />
                con toda la info de la actividad.
              </p>
            </>
          )}

          <div className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm mt-4 text-left mb-6">
            <div className="flex items-center">
               <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mr-3 shrink-0">
                 <Calendar className="w-5 h-5 text-indigo-600" />
               </div>
               <div>
                 <p className="text-slate-900 font-bold text-sm capitalize">
                   {selectedAdventure.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                 </p>
                 <p className="text-slate-500 text-xs font-medium">{selectedAdventure.time}</p>
               </div>
            </div>
            <a 
              href={generateGoogleCalendarLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              Agregar a mi calendario
            </a>
          </div>
          
          <button 
            onClick={() => {
              onComplete({
                name: profile.name!,
                city: selectedAdventure.city,
                interests: [selectedAdventure.sport],
                contactMethod: 'email',
                contactValue: profile.contactValue
              }, reservationId || selectedAdventure.id);
            }}
            className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-bold hover:bg-emerald-700 transition-colors"
          >
            Continuar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 sm:p-10 relative overflow-y-auto bg-slate-50 h-full">
      
      {/* Header actions */}
      <div className="w-full flex justify-between items-center mb-4 mt-2 z-10 shrink-0">
        <button onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50" disabled={isSimulatingSending}>Cancelar</button>
        <div className="flex gap-1.5 w-32">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden`}>
              {step >= i && (
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: '100%' }} 
                  transition={{ duration: 0.3 }}
                  className="h-full bg-emerald-500 rounded-full" 
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full flex flex-col items-center max-w-sm mx-auto"
          >
            {typeof steps[step].icon === 'string' ? null : steps[step].icon}
            <h1 className="text-3xl font-bold text-slate-900 text-center mb-3 leading-tight">
              {steps[step].title}
            </h1>
            <p className="text-slate-500 text-center mb-10 w-[90%] leading-relaxed">
              {steps[step].subtitle}
            </p>
            
            {steps[step].content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full shrink-0 z-10 pt-6">
        <button
          onClick={nextStep}
          disabled={!steps[step].isValid || isSimulatingSending}
          className={`w-full py-4 rounded-full flex items-center justify-center font-semibold text-lg transition-all shadow-md active:scale-95 ${
            steps[step].isValid && !isSimulatingSending
              ? 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-4 focus:ring-slate-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isSimulatingSending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span>Agendando...</span>
            </>
          ) : (
            <>
              <span className="mr-2">{step === steps.length - 1 ? 'Confirmar Reserva' : 'Continuar'}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
