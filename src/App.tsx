import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Explore } from './components/Explore';
import { Dashboard } from './components/Dashboard';
import { BottomNav } from './components/BottomNav';
import { AccountMenu } from './components/AccountMenu';
import { AccountAccessModal } from './components/AccountAccessModal';
import { AdminDashboard } from './components/AdminDashboard';
import { mockParticipants } from './data/mocks';
import { Adventure,UserProfile, AdventureTemplate } from './types';
import { AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, finishGoogleSignIn, handleFirestoreError, OperationType } from './firebase';
import { localCurrentUser, logoutLocal } from './localAuth';
import { signOut } from 'firebase/auth';

const ADMIN_EMAIL = 'andres.diaz.alvear@gmail.com';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'dashboard' && params.get('activity')) {
      return { id: 'u1', name: 'Aventurero', contactValue: 'user@example.com', city: 'Cuenca', interests: [] };
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<'explore' | 'dashboard' | 'admin'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'dashboard' ? 'dashboard' : 'explore';
  });
  
  const [activities, setActivities] = useState<AdventureTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdventureTemplate | null>(null);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [newlyBookedActivityId, setNewlyBookedActivityId] = useState<string | null>(null);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(() => auth.currentUser?.email || null);

  useEffect(() => {
    finishGoogleSignIn().catch((error) => {
      console.error('Google sign-in redirect failed:', error);
    });
  }, []);
  
  useEffect(() => {
    const unsubActivities = onSnapshot(collection(db, 'activities'), (snapshot) => {
      const acts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date ? new Date(data.date) : new Date(),
          availableDates: data.availableDates ? data.availableDates.map((d: string) => new Date(d)) : []
        } as AdventureTemplate;
      });
      setActivities(acts);

      const linkedActivity = new URLSearchParams(window.location.search).get('activity');
      if (linkedActivity) {
        const found = acts.find(a => a.id === linkedActivity);
        if (found) setSelectedTemplate(found);
      }
      
      const pendingAdv = localStorage.getItem('pendingAdventure');
      if (pendingAdv) {
        const found = acts.find(a => a.id === pendingAdv);
        if (found) setSelectedTemplate(found);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activities'));
    
    return () => unsubActivities();
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setFirebaseEmail(user?.email || null);
      if (!user) { setProfile(null); setAdventures([]); setCurrentView('explore'); }
      if (user) {
        setProfile(prev => {
          if (!prev) {
            return {
              id: user.uid,
              name: user.displayName || 'Aventurero',
              contactMethod: 'email',
              contactValue: user.email || '',
              city: 'Cuenca',
              interests: []
            };
          }
          return prev;
        });

        const q = query(collection(db, 'reservations'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty && activities.length > 0) {
            const docs = snapshot.docs.sort((a, b) => {
              const aTime = a.data().createdAt?.toMillis?.() || 0;
              const bTime = b.data().createdAt?.toMillis?.() || 0;
              return bTime - aTime;
            });
            
            const loadedAdventures: Adventure[] = [];
            
            docs.forEach(doc => {
              const data = doc.data();
              const template = activities.find(a => a.id === data.activityId);
              
              if (template) {
                loadedAdventures.push({
                  id: doc.id,
                  activityId: data.activityId,
                  city: template.city,
                  date: data.date ? new Date(data.date) : (data.createdAt?.toDate?.() || template.date),
                  time: template.time || '12:00',
                  sport: template.sport || 'Aventura',
                  meetingPoint: {
                    name: template.meetingPointName || 'Punto de encuentro',
                    address: template.meetingPointAddress || '',
                  },
                  requiredGear: template.requiredGear || [],
                  duration: template.duration,
                  itinerary: template.itinerary,
                  description: template.description,
                  activityCost: template.activityCost,
                  image: template.image,
                  status: data.status,
                  paymentMethod: data.paymentMethod,
                  participants: [],
                  messages: []
                });
              }
            });
            setAdventures(loadedAdventures);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'reservations');
        });
        return () => unsubscribe();
      }
    });
    return () => unsubAuth();
  }, [activities]);

  const handleOnboardingComplete = (data: UserProfile, activityId?: string) => {
    setProfile(data);
    setSelectedTemplate(null);
    setCurrentView('dashboard');
    if (activityId) {
      setNewlyBookedActivityId(activityId);
    }
  };

  const handleLogout = async () => {
    logoutLocal();
    await signOut(auth).catch(() => undefined);
    setProfile(null);
    setAdventures([]);
    setSelectedTemplate(null);
    setCurrentView('explore');
  };

  const accountUser = profile || (() => {
    const localUser = localCurrentUser();
    return localUser ? { name: localUser.displayName, contactValue: localUser.email } : null;
  })();
  const isAdministrator = firebaseEmail?.toLowerCase() === ADMIN_EMAIL;

  let activeContent;
  if (currentView === 'admin') {
    activeContent = isAdministrator ? <AdminDashboard activities={activities} /> : <Explore onAuthComplete={(user) => { setProfile(user); setCurrentView('dashboard'); }} onSelectAdventure={(adventure) => { localStorage.setItem('pendingAdventure', adventure.id); setSelectedTemplate(adventure); }} activities={activities} />;
  } else if (selectedTemplate) {
    activeContent = (
      <Onboarding
        selectedAdventure={selectedTemplate}
        onComplete={handleOnboardingComplete}
        onCancel={() => {
          setSelectedTemplate(null);
          localStorage.removeItem('pendingAdventure');
        }}
        existingProfile={profile}
      />
    );
  } else if (currentView === 'explore') {
    activeContent = (
      <Explore onAuthComplete={(user) => {
        setProfile(user);
        setCurrentView('dashboard');
      }} onSelectAdventure={(adventure) => {
        localStorage.setItem('pendingAdventure', adventure.id);
        setSelectedTemplate(adventure);
      }} activities={activities} />
    );
  } else {
    activeContent = (
      <Dashboard
        adventures={adventures}
        user={profile!}
        initialAdventureId={newlyBookedActivityId}
        onClearInitial={() => setNewlyBookedActivityId(null)}
      />
    );
  }

  if (currentView === 'admin' && isAdministrator) return (
    <div className="relative min-h-screen bg-slate-50">
      <AccountMenu
        user={accountUser}
        onLogout={handleLogout}
        onOpenAccount={() => setAccountModalOpen(true)}
        isAdmin
        onOpenAdmin={() => setCurrentView('admin')}
      />
      {activeContent}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans sm:px-4 sm:py-8 flex justify-center items-center">
      
      {/* Mobile Device Frame styling for Desktop displays */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-white sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden relative flex flex-col items-stretch border-slate-800 sm:border-[8px]">
        <AccountMenu
          user={accountUser}
          onLogout={handleLogout}
          onOpenAccount={() => { setCurrentView('explore'); setAccountModalOpen(true); }}
          isAdmin={isAdministrator}
          onOpenAdmin={() => setCurrentView('admin')}
        />
        {activeContent}
        {isAccountModalOpen && <AccountAccessModal onClose={() => setAccountModalOpen(false)} onComplete={(user) => { setProfile(user); setAccountModalOpen(false); setCurrentView('dashboard'); }} />}
        
        {/* Only show bottom navigation if we are not booking */}
        {!selectedTemplate && (
          <BottomNav currentView={currentView} onChangeView={setCurrentView} hasAdventure={adventures.length > 0} />
        )}
        
        {/* WhatsApp Floating Button */}
        <a 
          href="https://wa.me/593963518871"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-24 right-4 z-50 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
