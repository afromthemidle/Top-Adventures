import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChatMessage, Participant, UserProfile } from '../types';
import { ChevronLeft, Send, MapPin } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  participants: Participant[];
  user: UserProfile;
  onBack: () => void;
  onSendMessage: (text: string) => void;
}

export function Chat({ messages, participants, user, onBack, onSendMessage }: Props) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const getParticipant = (id: string) => participants.find(p => p.id === id);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-slate-50 z-50 flex flex-col h-full"
    >
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-slate-900 leading-tight">Equipo Expedición</h2>
          <p className="text-xs text-emerald-600 font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            {participants.length + 1} en línea
          </p>
        </div>
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map(p => (
            <img key={p.id} src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100" referrerPolicy="no-referrer" />
          ))}
          {participants.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{participants.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Meetup Pin */}
      <div className="bg-emerald-50 px-4 py-3 flex items-start border-b border-emerald-100">
         <MapPin className="w-5 h-5 text-emerald-600 mr-3 shrink-0 mt-0.5" />
         <div>
            <p className="text-sm font-semibold text-emerald-900">Punto de encuentro</p>
            <p className="text-xs text-emerald-700/80">Entrada principal del Parque Natural (10:00 AM).</p>
         </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === 'me';
          const sender = isMe ? null : getParticipant(msg.senderId);
          const showAvatar = !isMe && (idx === 0 || messages[idx-1].senderId !== msg.senderId);

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="flex max-w-[80%] items-end">
                {!isMe && (
                  <div className="w-8 h-8 mr-2 flex-shrink-0">
                    {showAvatar && sender && (
                      <img src={sender.avatarUrl} alt={sender.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                )}
                
                <div className={`
                  flex flex-col
                  ${isMe ? 'items-end' : 'items-start'}
                `}>
                  {!isMe && showAvatar && sender && (
                    <span className="text-[10px] font-medium text-slate-400 ml-1 mb-1">{sender.name}</span>
                  )}
                  <div className={`
                    px-4 py-2.5 rounded-2xl text-sm shadow-sm
                    ${isMe 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }
                  `}>
                    {msg.text}
                  </div>
                  <span className={`text-[9px] text-slate-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-100 p-4 pb-6 sm:pb-4">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white transition-colors text-sm"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white shrink-0 disabled:bg-slate-200 disabled:text-slate-400 transition-colors active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
