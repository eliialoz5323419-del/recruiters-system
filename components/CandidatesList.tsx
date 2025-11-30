
import React, { useState } from 'react';
import { Candidate } from '../types';
import { ArrowRight, Users, FileText, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DocumentComparisonModal } from './DocumentComparisonModal';
import { QuestionnaireHub } from './QuestionnaireHub';
import { updateDoc, doc } from 'firebase/firestore';
import { getDb } from '../services/firebaseClient';

interface CandidatesListProps {
  candidates: Candidate[];
  onDeleteCandidate: (id: string) => void;
}

export const CandidatesList: React.FC<CandidatesListProps> = ({ candidates, onDeleteCandidate }) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateForQuestionnaire, setCandidateForQuestionnaire] = useState<Candidate | null>(null);
  
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm("האם למחוק מועמד זה?")) {
          onDeleteCandidate(id);
          if (selectedCandidate?.id === id) {
             setSelectedCandidate(null);
          }
      }
  };

  const handleUpdateCandidate = async (id: string, data: Partial<Candidate>) => {
      const db = getDb();
      if (db) {
          try {
              await updateDoc(doc(db, 'candidates', id), data);
          } catch (e) {
              console.error("Failed to update candidate", e);
          }
      }
  };

  // --- 1. QUESTIONNAIRE PAGE VIEW ---
  if (candidateForQuestionnaire) {
      return (
          <QuestionnaireHub 
              candidate={candidateForQuestionnaire}
              isRecruiterView={true}
              onBack={() => setCandidateForQuestionnaire(null)}
              onUpdateCandidate={handleUpdateCandidate}
          />
      );
  }

  // --- 2. DOCUMENT COMPARISON VIEW (Full Page) ---
  if (selectedCandidate) {
      return (
          <DocumentComparisonModal 
             data={selectedCandidate}
             type="CANDIDATE"
             onClose={() => setSelectedCandidate(null)}
          />
      );
  }

  // --- 3. MAIN CANDIDATE LIST VIEW ---
  return (
    <div className="space-y-8 pb-20">
      
      <div className="flex items-end justify-between mb-6">
         <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">מסמכים</h1>
            <p className="text-slate-500 font-medium">ניהול מסמכים ומועמדים</p>
         </div>
         <div className="hidden md:block text-sm font-bold text-teal-600 bg-white px-6 py-2.5 rounded-2xl border border-teal-100 shadow-sm">
             {safeCandidates.length} מסמכים
         </div>
      </div>

      {safeCandidates.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-[50vh] text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/30">
            <div className="w-24 h-24 bg-teal-50 rounded-3xl flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-teal-100">
                <Users size={40} className="text-teal-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">אין מועמדים במאגר</h3>
            <p className="text-slate-500">הוסף מועמדים חדשים ידנית או באמצעות ניתוח קורות חיים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {safeCandidates.map((candidate) => (
            <CandidateCardItem 
                key={candidate.id}
                candidate={candidate} 
                onDelete={handleDelete}
                onViewDetails={() => setSelectedCandidate(candidate)}
                onViewSource={(e) => {
                    e.stopPropagation();
                    setSelectedCandidate(candidate);
                }}
                onOpenQuestionnaire={() => setCandidateForQuestionnaire(candidate)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const getGradientByDept = (dept: string = "") => {
    const d = dept.toLowerCase();
    if (d.includes("marketing") || d.includes("sales")) return "bg-gradient-to-r from-teal-400 to-emerald-400";
    if (d.includes("dev") || d.includes("tech") || d.includes("r&d")) return "bg-gradient-to-r from-teal-500 to-teal-700";
    return "bg-gradient-to-r from-emerald-500 to-teal-600";
}

interface CandidateCardItemProps {
    candidate: Candidate;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onViewDetails: () => void;
    onViewSource: (e: React.MouseEvent) => void;
    onOpenQuestionnaire: () => void;
}

const CandidateCardItem: React.FC<CandidateCardItemProps> = ({ candidate, onDelete, onViewDetails, onViewSource, onOpenQuestionnaire }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const bgGradient = getGradientByDept(candidate.department);
    
    // Format date
    const displayDate = (candidate as any).createdAt 
        ? new Date((candidate as any).createdAt).toLocaleDateString('he-IL') 
        : new Date().toLocaleDateString('he-IL');

    const buttonStyle = candidate.imageUrl ? {
        backgroundImage: `url('${candidate.imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {};

    return (
        <div className="bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative flex flex-col h-full transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] cursor-default group hover:-translate-y-1 duration-500">
            {/* 1. HEADER IMAGE SECTION */}
            <div className="h-24 relative w-full overflow-hidden bg-slate-100 flex-shrink-0">
                {candidate.imageUrl ? (
                    <img src={candidate.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                     <div className={`w-full h-full ${bgGradient} relative`}>
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                     </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent"></div>
                
                {/* DATE BADGE (Top Right) */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                     <span className="bg-black/40 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                         <Calendar size={10} className="text-teal-300" />
                         {displayDate}
                     </span>
                </div>
            </div>

            {/* 2. CONTENT */}
            <div className="px-6 pt-6 pb-4 flex-grow relative flex flex-col">
                 <div className="absolute -top-10 right-6">
                     <img 
                         src={candidate.avatarUrl} 
                         className="w-16 h-16 rounded-2xl object-cover border-[4px] border-white shadow-md bg-white"
                         alt={candidate.name}
                     />
                 </div>

                <div className="mt-2 mb-4">
                    <h3 className="text-xl font-black text-slate-900 leading-tight truncate">{candidate.name}</h3>
                    <p className="text-slate-500 text-sm font-medium">{candidate.title}</p>
                </div>
                
                <div className="mb-6 relative bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed border border-slate-100 flex-grow flex flex-col">
                    <div className={`transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                        {candidate.resumeText}
                    </div>

                    {candidate.resumeText.length > 100 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="text-teal-600 font-bold text-xs mt-2 flex items-center gap-1 hover:text-teal-800 self-start"
                        >
                            {isExpanded ? (
                                <>פחות <ChevronUp size={12} /></>
                            ) : (
                                <>עוד <ChevronDown size={12} /></>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* 3. ACTIONS */}
            <div className="p-3 border-t border-slate-50 bg-slate-50/50 flex gap-2 items-center flex-shrink-0">
                 {/* Delete Button */}
                 <button 
                    onClick={(e) => onDelete(e, candidate.id)} 
                    className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:border-red-200 hover:text-red-500 transition-all shadow-sm"
                    title="מחק מועמד"
                 >
                     <Trash2 size={18} />
                 </button>
                 
                 {/* Split/Document View Button */}
                 <button 
                    onClick={onViewSource} 
                    className="p-3 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl hover:bg-teal-100 hover:shadow-md transition-all shadow-sm"
                    title="מסמך (פיצול)"
                >
                    <FileText size={18} />
                </button>

                 <button 
                    onClick={onOpenQuestionnaire}
                    style={buttonStyle}
                    className={`flex-grow py-3 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all group/btn relative overflow-hidden
                        ${!candidate.imageUrl ? 'bg-gradient-to-r from-teal-500 to-emerald-600' : ''}
                    `}
                 >
                    {candidate.imageUrl && <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/50"></div>}
                    <span className="relative z-10 flex items-center gap-2">
                       שאלונים <ArrowRight size={14} className="group-hover/btn:-translate-x-1 transition-transform"/>
                    </span>
                 </button>
            </div>
        </div>
    );
};
