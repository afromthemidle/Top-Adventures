import { getAdventureImage } from '../utils/imageUtils';
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Clock, Map, Users, ChevronDown, ChevronUp, Timer, Navigation, CheckCircle2, Mountain } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdventureTemplate } from '../types';
import { loginLocal, registerLocal } from '../localAuth';

interface Props {
  onSelectAdventure: (adv: AdventureTemplate) => void;
  activities: AdventureTemplate[];
  onAuthComplete: (profile: { id: string; name: string; contactValue: string; contactMethod: 'email' }) => void;
}

const getNextSaturdays = (count: number) => {
  const dates = [];
  const today = new Date();
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
  let nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  
  for (let i = 0; i < count; i++) {
    const d = new Date(nextSaturday);
    d.setDate(nextSaturday.getDate() + i * 7);
    dates.push(d);
  }
  return dates;
};



const LOCATIONS: Record<string, string[]> = {
  'Ecuador': ['Cuenca']
};

const CITY_COORDS: Record<string, { lat: number, lon: number, country: string }> = {
  'Cuenca': { lat: -2.9001, lon: -79.0059, country: 'Ecuador' }
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function findClosestCity(lat: number, lon: number) {
  let closest = 'Cuenca';
  let minDistance = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const dist = getDistance(lat, lon, coords.lat, coords.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }
  return { city: closest, country: CITY_COORDS[closest].country };
}

export function Explore({ onSelectAdventure, activities, onAuthComplete }: Props) {
  const [country, setCountry] = useState('Ecuador');
  const [city, setCity] = useState('Cuenca');
  const [isCityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participantsData, setParticipantsData] = useState<Record<string, any[]>>({});
  const [selectedDates, setSelectedDates] = useState<Record<string, number>>({});
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const accountEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.location.hash !== '#cuenta') return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    window.setTimeout(() => accountEmailRef.current?.focus(), 80);
  }, []);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage('');
    setAuthBusy(true);
    try {
      const result = authMode === 'register' ? await registerLocal(authEmail, authPassword) : await loginLocal(authEmail, authPassword);
      onAuthComplete({ id: result.user.uid, name: result.user.displayName, contactValue: result.user.email, contactMethod: 'email' });
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const closest = findClosestCity(latitude, longitude);
        setCountry(closest.country);
        setCity(closest.city);
      }, (error) => {
        console.warn('Geolocation error:', error);
      });
    }
  }, []);

  useEffect(() => {
    const actIds = activities.filter(a => a.city === city).map(a => a.id);
    if (actIds.length === 0) return;

    const unsubs = actIds.map(id => {
      const q = query(collection(db, 'reservations'), where('activityId', '==', id));
      return onSnapshot(q, (snapshot) => {
        // Count valid reservations
        const paidDocs = snapshot.docs.filter(doc => doc.data().status !== 'REJECTED');
        setParticipantsData(prev => ({
          ...prev,
          [id]: paidDocs.map(d => d.data())
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reservations');
      });
    });

    return () => unsubs.forEach(u => u());
  }, [city]);

  const filteredAdventures = activities.filter(a => a.city === city);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-24">
      {/* Header with Location Selector */}
      <div className="bg-white px-6 pt-8 pb-6 border-b border-slate-100">
        {/* Top bar: Logo + Location */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-200/50">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-[1.1rem] tracking-[0.2em] text-slate-800 uppercase">
              TOP<span className="text-emerald-600 font-bold ml-1.5">ADVENTURES</span>
            </span>
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-2">
             {/* Country Dropdown */}
             <div className="relative">
               <button 
                 onClick={() => { setCountryDropdownOpen(!isCountryDropdownOpen); setCityDropdownOpen(false); }}
                 className="flex items-center text-sm font-bold text-slate-500 focus:outline-none bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
               >
                 {country}
                 <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
               </button>
               
               {isCountryDropdownOpen && (
                 <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40">
                   {Object.keys(LOCATIONS).map(c => (
                      <button 
                        key={c}
                        onClick={() => { 
                          setCountry(c); 
                          setCity(LOCATIONS[c][0]); 
                          setCountryDropdownOpen(false); 
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${c === country ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c}
                      </button>
                   ))}
                 </div>
               )}
             </div>

             {/* City Dropdown */}
             <div className="relative">
               <button 
                 onClick={() => { setCityDropdownOpen(!isCityDropdownOpen); setCountryDropdownOpen(false); }}
                 className="flex items-center text-sm font-bold text-slate-900 focus:outline-none bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100"
               >
                 {city}
                 <ChevronDown className="w-4 h-4 ml-1 text-emerald-600/60" />
               </button>
               
               {isCityDropdownOpen && (
                 <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40">
                   {LOCATIONS[country].map(c => (
                      <button 
                        key={c}
                        onClick={() => { setCity(c); setCityDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${c === city ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {c}
                      </button>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Headline section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-4 leading-tight tracking-tight">
            Actividades que convierten a <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 italic">desconocidos</span> en <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">amigos.</span>
          </h1>
          <div className="max-w-2xl">
            <p className="text-slate-500 text-lg md:text-xl font-light leading-relaxed tracking-wide">
              Cada semana, juntamos a grupos de <strong className="font-semibold text-slate-800">6 personas</strong> que comparten los mismos intereses.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium text-sm border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sin perfiles
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium text-sm border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sin swipes
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium text-sm border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sin planes
              </span>
            </div>
            <p className="mt-5 text-slate-600 text-[1.05rem] md:text-lg border-l-4 border-emerald-400/60 pl-4 py-1">
              Nosotros nos encargamos de todos los detalles.<br/>
              <span className="text-slate-800 font-bold">Tú solo tienes que llegar.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-6 mt-5 rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-lg">Tu cuenta</h2>
          <button type="button" className="text-xs text-emerald-300 font-bold" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthMessage(''); }}>
            {authMode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-300">Inicia sesión o crea una cuenta para reservar y gestionar tus aventuras.</p>
        <form onSubmit={submitAuth} className="space-y-3">
          <input ref={accountEmailRef} aria-label="Correo" type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="tu correo" className="w-full rounded-xl px-3 py-2 text-slate-900" />
          <input aria-label="Contraseña" type="password" required minLength={6} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="contraseña (mínimo 6 caracteres)" className="w-full rounded-xl px-3 py-2 text-slate-900" />
          <button disabled={authBusy} className="w-full rounded-xl bg-emerald-500 py-2.5 font-extrabold disabled:opacity-50">{authBusy ? 'Procesando...' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
          {authMessage && <p className="text-sm text-amber-200" role="alert">{authMessage}</p>}
        </form>
      </div>

      <div className="p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight mb-3">
             ¡La vida es corta para aventuras en <span className="text-emerald-600">solitario!</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium tracking-tight">
             Deja de hacer planes solo en tu cabeza. ¡Únete a un grupo y vive una experiencia emocionante!
          </p>
        </div>
        {filteredAdventures.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Aún no tenemos aventuras disponibles por aquí.</p>
            <p className="text-sm text-slate-400 mt-1">¡Vuelve pronto que seguro armamos algo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAdventures.map(adv => {
              const hasDateSelected = adv.id in selectedDates || (!adv.availableDates || adv.availableDates.length === 0);
              const selectedDateIndex = selectedDates[adv.id] !== undefined ? selectedDates[adv.id] : 0;
              const selectedDate = adv.availableDates && adv.availableDates.length > 0 ? adv.availableDates[selectedDateIndex] : adv.date;
              const selectedDateISO = selectedDate.toISOString();
              
              const actualParticipantsData = (participantsData[adv.id] || []).filter(p => p.date === selectedDateISO);
              const actualCount = actualParticipantsData.length;
              // Removed baseParticipants
              const displayParticipants = actualCount;
              const computedSlotsAvailable = Math.max(0, adv.slotsTotal - displayParticipants);

              return (
              <div key={adv.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100/60 active:scale-[0.98] transition-transform flex flex-col">
               <div className="relative">
                 <div className="h-56 relative w-full">
                   <img src={getAdventureImage(adv.sport, adv.image)} alt={adv.sport} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAdventureImage(adv.sport); }} />
                 </div>
               </div>
               <div className="p-5 flex flex-col flex-1">
                 <h3 className="font-bold text-xl text-slate-900 mb-2 leading-tight">{adv.sport}</h3>
                 
                 <div className="flex justify-between items-center mb-5">
                   <div className="flex items-center gap-4 text-sm text-slate-500">
                     <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-emerald-600" />{adv.time}</span>
                   </div>
                   <button 
                     onClick={() => setExpandedId(expandedId === adv.id ? null : adv.id)}
                     className="text-emerald-700 text-sm font-semibold flex items-center hover:text-emerald-800 transition-colors bg-emerald-50 px-3 py-1.5 rounded-lg"
                   >
                     {expandedId === adv.id ? 'Menos info' : 'Más info'}
                     {expandedId === adv.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                   </button>
                 </div>

                 
                 <div className="mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                    {adv.availableDates && adv.availableDates.length > 0 ? (
                      <div>
                         <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            Selecciona la fecha:
                         </div>
                         <select
                            className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                           value={adv.id in selectedDates ? selectedDates[adv.id] : ''}
                           onChange={(e) => setSelectedDates(prev => ({ ...prev, [adv.id]: parseInt(e.target.value) }))}
                         >
                           <option value="" disabled>Elige un día para ver disponibilidad...</option>
                           {adv.availableDates.map((date, idx) => (
                              <option key={idx} value={idx}>
                                {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                              </option>
                           ))}
                         </select>
                      </div>
                    ) : (
                      <div>
                         <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            Fecha única:
                         </div>
                         <div className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm font-medium">
                            {adv.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                         </div>
                      </div>
                    )}
                    
                    {adv.id in selectedDates || (!adv.availableDates || adv.availableDates.length === 0) ? (
                      <div className="mt-1 flex flex-col gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex justify-between items-center">
                          {displayParticipants > 0 ? (
                            <>
                              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-600" /> Ya somos {displayParticipants}</span>
                              <span className="text-xs font-black text-white bg-emerald-600 px-2.5 py-1 rounded-md uppercase tracking-wide shadow-sm">
                                Quedan {computedSlotsAvailable} cupos
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-600" /> ¡Sé el primero en unirte!</span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-700/80 font-medium flex items-center">
                          Disponibilidad actualizada para la fecha seleccionada
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                        <span className="text-xs font-medium text-slate-500 text-center">
                          Selecciona una fecha para ver los cupos disponibles
                        </span>
                      </div>
                    )}
                 </div>
                 {/* Expanded Details Section */}
                 {expandedId === adv.id && (
                   <div className="animate-in slide-in-from-top-2 fade-in duration-200 mb-5 text-sm">
                     <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100/80">
                       {adv.description && (
                         <div className="text-slate-600 leading-relaxed italic">
                           "{adv.description}"
                         </div>
                       )}
                       
                       <div className="flex items-center gap-2 text-slate-700">
                         <Timer className="w-4 h-4 text-emerald-600" />
                         <span className="font-semibold">Duración estimada:</span> {adv.duration || 'Por definir'}
                       </div>

                       {adv.activityCost && (
                         <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                           <span className="font-semibold whitespace-nowrap">💰 Costo total:</span>
                           <span className="text-sm">
                             <div>
                               <span className="font-bold">{adv.activityCost} USD</span>
                             </div>
                             <div className="text-xs mt-1 text-emerald-600 font-medium">
                               Incluye material para la actividad y guía. No incluye comida, transporte ni seguro de accidentes.
                             </div>
                           </span>
                         </div>
                       )}

                       {adv.itinerary && adv.itinerary.length > 0 && (
                         <div>
                           <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                             <Navigation className="w-4 h-4 text-emerald-600" />
                             Itinerario:
                           </div>
                           <ul className="space-y-2">
                             {adv.itinerary.map((item, idx) => (
                               <li key={idx} className="flex items-start text-slate-600">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 mr-2 shrink-0"></span>
                                 <span className="flex-1">{item}</span>
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}

                       {adv.requiredGear && adv.requiredGear.length > 0 && (
                         <div>
                           <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                             ¿Qué necesitas llevar?
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {adv.requiredGear.map((item, idx) => (
                               <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-md text-slate-600">
                                 {item}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 <div className="flex flex-col gap-2 text-sm text-slate-500 mb-5">
                   <div className="flex items-start mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <MapPin className="w-4 h-4 mr-1.5 text-emerald-600 mt-0.5 shrink-0" />
                     <div className="flex-1">
                        <p className="font-medium text-slate-800">{adv.meetingPointName}</p>
                        <p className="text-xs text-slate-500">{adv.meetingPointAddress}</p>
                     </div>
                     <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adv.meetingPointAddress + ' ' + adv.city)}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors" title="Ver en el mapa">
                       <Map className="w-4 h-4" />
                     </a>
                   </div>
                 </div>
                 
                 <button 
                   onClick={() => onSelectAdventure({ 
                     ...adv, 
                     date: selectedDate 
                   })}
                   disabled={!hasDateSelected} className={`mt-auto w-full rounded-xl py-3.5 font-bold transition-colors ${hasDateSelected ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                 >{hasDateSelected ? "Reserva tu cupo" : "Elige una fecha"}</button>
               </div>
             </div>
             );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
