import { getAdventureImage } from '../utils/imageUtils';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, MapPin, Users, Map, CheckCircle2, MessageSquare, Calendar, ChevronLeft, ChevronRight, Clock, CalendarPlus, LogOut } from 'lucide-react';
import { Adventure, UserProfile, Participant } from '../types';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface Props {
  adventures: Adventure[];
  user: UserProfile;
  initialAdventureId?: string | null;
  onClearInitial?: () => void;
}

export function Dashboard({ adventures, user, initialAdventureId, onClearInitial }: Props) {
  const [selectedAdventureId, setSelectedAdventureId] = useState<string | null>(null);

  useEffect(() => {
    if (initialAdventureId && adventures.length > 0) {
      const adv = adventures.find(a => a.id === initialAdventureId) || adventures.find(a => a.activityId === initialAdventureId);
      if (adv) {
        setSelectedAdventureId(adv.id);
        if (onClearInitial) onClearInitial();
      }
    }
  }, [initialAdventureId, adventures, onClearInitial]);

  const selectedAdventure = adventures.find(a => a.id === selectedAdventureId);
const [groupParticipants, setGroupParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!selectedAdventure || !selectedAdventure.activityId) {
      setGroupParticipants([]);
      return;
    }
    
    // Group only participants for the SAME activity AND the SAME date
    const selectedDateISO = selectedAdventure.date instanceof Date && !isNaN(selectedAdventure.date.getTime()) ? selectedAdventure.date.toISOString() : '';
    
    const q = query(
      collection(db, 'reservations'),
      where('activityId', '==', selectedAdventure.activityId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const participants: Participant[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'REJECTED' && data.date === selectedDateISO) {
          participants.push({
            id: doc.id,
            name: data.userName || 'Usuario',
            avatarUrl: '',
            bio: ''
          });
        }
      });
      setGroupParticipants(participants);
    }, (error) => {
      console.error('Error fetching group participants:', error);
    });
    
    return () => unsubscribe();
  }, [selectedAdventure]);
  
  

  if (!selectedAdventure) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 h-full bg-slate-50 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mis Actividades</h1>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          {adventures.map(adv => (
            <div 
              key={adv.id}
              onClick={() => setSelectedAdventureId(adv.id)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-between hover:border-emerald-200"
            >
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">{adv.sport}</h3>
                <div className="flex items-center text-slate-500 text-sm font-medium">
                  <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                  {adv.date instanceof Date && !isNaN(adv.date.getTime()) ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(adv.date) : 'Fecha pendiente'} &bull; {adv.city}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const adventure = selectedAdventure;
  
  const generateGoogleCalendarLink = (adv: Adventure) => {
    const startDate = adv.date instanceof Date && !isNaN(adv.date.getTime()) ? new Date(adv.date) : new Date();
    const timeMatch = (adv.time || '').match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
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
    
    const text = encodeURIComponent(`${adv.sport} en ${adv.city}`);
    const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
    const details = encodeURIComponent(adv.description || '');
    const location = encodeURIComponent(`${adv.meetingPoint?.name}, ${adv.meetingPoint?.address}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  };

  const bannerImage = getAdventureImage(adventure.sport, adventure.image);
  
  const getAvatarEmoji = (name: string, sport: string) => {
    const isFemale = name.endsWith('a');
    if ((sport || '').includes('Canopy') || (sport || '').includes('Zipline')) {
      return isFemale ? '🧗‍♀️' : '🧗‍♂️';
    }
    if ((sport || '').includes('Parapente')) {
      return '🪂';
    }
    return isFemale ? '👩' : '👨';
  };

  const colors = ['bg-blue-100 text-blue-600', 'bg-pink-100 text-pink-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600', 'bg-indigo-100 text-indigo-600'];

  return (
    <div className="flex-1 overflow-y-auto pb-24 h-full bg-slate-50 relative">
      <div className="absolute top-0 left-0 right-0 h-64 bg-slate-900 z-0 overflow-hidden">
        <img src={bannerImage} alt={adventure.sport} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAdventureImage(adventure.sport); }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </div>
      
      <div className="relative z-10 px-6 pt-16">
        <button 
          onClick={() => setSelectedAdventureId(null)}
          className="bg-white/80 backdrop-blur border border-white/50 text-slate-800 p-2 rounded-full shadow-sm mb-4 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 mb-6 border border-slate-100"
        >
           <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200 uppercase tracking-wide">
             {adventure.status === 'PAID' ? 'Reserva Confirmada' : (adventure.status === 'PENDING' ? 'Pendiente de verificación de pago' : 'Pendiente de Pago')}
           </div>
           
           <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight tracking-tight">{adventure.sport}</h1>
           <p className="text-slate-500 font-medium mb-6">{adventure.city}</p>
           
           <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
               <Calendar className="w-5 h-5 text-emerald-600 mb-2" />
               <p className="text-xs text-slate-400 font-medium mb-0.5">Fecha</p>
               <p className="font-bold text-slate-900 text-sm">
                 {adventure.date instanceof Date && !isNaN(adventure.date.getTime()) ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(adventure.date) : 'Fecha pendiente'}
               </p>
             </div>
             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
               <Clock className="w-5 h-5 text-emerald-600 mb-2" />
               <p className="text-xs text-slate-400 font-medium mb-0.5">Hora</p>
               <p className="font-bold text-slate-900 text-sm">{adventure.time}</p>
             </div>
           </div>

           <div className="bg-emerald-50/50 rounded-2xl p-4 mb-6 border border-emerald-100">
             <div className="flex items-start mb-3">
               <MapPin className="w-5 h-5 text-emerald-600 mr-3 mt-0.5" />
               <div>
                 <p className="font-bold text-slate-900 text-sm">{adventure.meetingPoint?.name}</p>
                 <p className="text-xs text-slate-500 mt-1">{adventure.meetingPoint?.address}</p>
               </div>
             </div>
             <a 
               href={`https://maps.google.com/?q=${encodeURIComponent(adventure.meetingPoint?.address || '')}`}
               target="_blank"
               rel="noopener noreferrer"
               className="w-full bg-white text-emerald-700 text-sm py-2 rounded-xl font-bold border border-emerald-200 flex items-center justify-center hover:bg-emerald-50 transition-colors"
             >
               <Map className="w-4 h-4 mr-2" />
               Ver en Google Maps
             </a>
           </div>

           <a 
             href={generateGoogleCalendarLink(adventure)}
             target="_blank"
             rel="noopener noreferrer"
             className="w-full bg-blue-50 text-blue-700 text-sm py-3 rounded-xl font-bold border border-blue-200 flex items-center justify-center hover:bg-blue-100 transition-colors mb-6"
           >
             <CalendarPlus className="w-4 h-4 mr-2" />
             Agregar a mi calendario
           </a>

           <div className="pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-900 flex items-center">
                 <Users className="w-5 h-5 mr-2 text-slate-400" />
                 Tu grupo
               </h3>
             </div>
             
             <div className="flex flex-wrap gap-4">
                {groupParticipants.map((p, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-xl shadow-sm mb-1 ${colors[i % colors.length]}`}>
                      {getAvatarEmoji(p.name, adventure.sport)}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{p.name.split(' ')[0]}</span>
                  </div>
                ))}
             </div>
           </div>
           
           <div className="mt-6 pt-6 border-t border-slate-100">
             <a 
                href="https://chat.whatsapp.com/EkQBuevzOyLGvfGBqY5Sja?s=cl&p=a&ilr=2&amv=1"
               target="_blank"
               rel="noopener noreferrer"
               className="w-full bg-[#25D366] text-white rounded-xl py-3.5 font-bold flex items-center justify-center shadow-sm hover:bg-[#20b858] active:scale-95 transition-all"
             >
               <MessageSquare className="w-5 h-5 mr-2" />
               Unirme al grupo de WhatsApp
             </a>
           </div>
        </motion.div>

        {/* Info Cards */}
        {adventure.description && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
             <h3 className="font-bold text-slate-900 text-lg mb-3">Sobre la actividad</h3>
             <p className="text-sm text-slate-700 leading-relaxed">{adventure.description}</p>
          </div>
        )}

        {adventure.itinerary && adventure.itinerary.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
             <h3 className="font-bold text-slate-900 text-lg mb-4">Itinerario</h3>
             <div className="space-y-4">
               {adventure.itinerary.map((step, index) => (
                 <div key={index} className="flex flex-col relative pl-6 border-l-2 border-emerald-100 last:border-transparent pb-4 last:pb-0">
                   <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1 border-2 border-white shadow-sm"></div>
                   <span className="text-sm text-slate-700 leading-tight">{step}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
           <h3 className="font-bold text-slate-900 text-lg mb-1">Material Necesario</h3>
           <p className="text-slate-500 text-xs mb-4">(deberás llevarlo el día de la actividad)</p>
           <ul className="space-y-2">
             {(adventure.requiredGear || []).map((item, index) => (
                <li key={index} className="flex items-center text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0"></span>
                  {item}
                </li>
             ))}
           </ul>
        </div>
        
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
          <ShieldAlert className="w-5 h-5 text-orange-500 mb-2" />
          <h4 className="font-bold text-orange-900 text-sm mb-1">Consejo de Seguridad</h4>
          <p className="text-orange-700/80 text-xs">Asegúrate de ir con calzado adecuado y mantente siempre cerca del guía y del resto del equipo.</p>
        </div>

      </div>
    </div>
  );
}
