import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

export const MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', emoji: '🧠', desc: 'חשיבה עמוקה (מומלץ)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', emoji: '⚡', desc: 'מהיר וחסכוני' },
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', emoji: '🍌', desc: 'מודל תמונה מהיר' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', emoji: '🦍', desc: 'תמונה באיכות גבוהה' },
];

interface AIModelSelectorProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  className?: string;
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({ currentModel, onSelect, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const selected = MODELS.find(m => m.id === currentModel) || MODELS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={wrapperRef}>
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-100 rounded-full hover:bg-indigo-50 transition-colors shadow-sm text-xs font-bold text-slate-700"
         title="בחר מודל AI"
       >
          <Sparkles size={12} className="text-indigo-500" />
          <span>{selected.emoji}</span>
          <span className="hidden md:inline">{selected.name}</span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
       </button>
       
       {isOpen && (
         <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-scale-up origin-bottom-left">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                בחר מודל Gemini
            </div>
            <div className="p-1">
               {MODELS.map(m => (
                 <button
                   key={m.id}
                   onClick={() => { onSelect(m.id); setIsOpen(false); }}
                   className={`w-full text-right flex items-center gap-3 p-2 rounded-lg transition-colors ${currentModel === m.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                 >
                    <span className="text-xl">{m.emoji}</span>
                    <div className="flex flex-col">
                       <span className="text-xs font-bold">{m.name}</span>
                       <span className="text-[10px] text-slate-400">{m.desc}</span>
                    </div>
                    {currentModel === m.id && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                 </button>
               ))}
            </div>
         </div>
       )}
    </div>
  );
};