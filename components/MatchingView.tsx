
import React, { useState, useEffect, useRef } from 'react';
import { Job, Candidate, MatchResult, User } from '../types';
import { analyzeCandidateMatch } from '../services/geminiService';
import { ArrowRight, Phone, Mail, FileText, Volume2, CheckCircle, Loader2, Bot, AlertCircle, UserX, RefreshCw, Sparkles, XCircle, Filter, Globe, MessageCircle, Briefcase, ImageIcon, X } from 'lucide-react';
import { QuestionnaireHub } from './QuestionnaireHub';
import { AIModelSelector } from './AIModelSelector';
import { DocumentComparisonModal } from './DocumentComparisonModal';

interface MatchingViewProps {
  job: Job;
  candidates: Candidate[];
  existingMatches: MatchResult[];
  onSaveMatches: (jobId: string, results: MatchResult[]) => void;
  onBack: () => void;
  recruiters?: User[];
}

export const MatchingView: React.FC<MatchingViewProps> = ({ job, candidates, existingMatches, onSaveMatches, onBack, recruiters = [] }) => {
  const [results, setResults] = useState<MatchResult[]>(existingMatches);
  const [loading, setLoading] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedCV, setSelectedCV] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'rejected'>('matches');
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-preview');
  const audioContextRef = useRef<AudioContext | null>(null);

  // NEW: Questionnaire State
  const [candidateForQuestionnaire, setCandidateForQuestionnaire] = useState<Candidate | null>(null);

  const DISPLAY_THRESHOLD = 60;
  const SAVE_THRESHOLD = 50;

  useEffect(() => {
    const hasCandidates = candidates && candidates.length > 0;
    if (existingMatches.length > 0) {
      setResults(existingMatches);
      setLoading(false);
    } else if (hasCandidates) {
      runAnalysis(selectedModel);
    } else {
      setLoading(false);
    }
  }, [job.id]); 

  const runAnalysis = async (model: string) => {
    if (!candidates || candidates.length === 0) return;
    setLoading(true);
    const newResults: MatchResult[] = [];
    
    for (const candidate of candidates) {
      const analysis = await analyzeCandidateMatch(job.description, candidate.resumeText, model);
      if (analysis.score >= SAVE_THRESHOLD) {
        newResults.push({
          jobId: job.id,
          candidateId: candidate.id,
          jobRecruiterId: job.recruiterId,
          candidateRecruiterId: candidate.recruiterId,
          score: analysis.score,
          reasoning: analysis.reasoning,
          isActive: true,
          updatedAt: new Date().toISOString()
        });
      }
    }
    newResults.sort((a, b) => b.score - a.score);
    setResults(newResults);
    onSaveMatches(job.id, newResults);
    setLoading(false);
  };

  const handleRefresh = () => {
    runAnalysis(selectedModel);
  };

  const validResults = results.filter(r => candidates.some(c => c.id === r.candidateId));
  const highMatches = validResults.filter(r => r.score >= DISPLAY_THRESHOLD);
  const lowMatches = validResults.filter(r => r.score < DISPLAY_THRESHOLD);
  const displayedResults = activeTab === 'matches' ? highMatches : lowMatches;
  const newCandidatesCount = candidates.length - validResults.length;
  const hasCandidates = candidates.length > 0;

  const getGradientByDept = (dept: string = "") => {
      const d = dept.toLowerCase();
      if (d.includes("marketing") || d.includes("sales")) return "bg-gradient-to-r from-teal-400 to-emerald-400";
      if (d.includes("dev") || d.includes("tech") || d.includes("r&d")) return "bg-gradient-to-r from-teal-500 to-teal-700";
      return "bg-gradient-to-r from-emerald-500 to-teal-600";
  }

  // --- IF QUESTIONNAIRE IS ACTIVE, SHOW FULL PAGE ---
  if (candidateForQuestionnaire) {
      return (
          <QuestionnaireHub
              candidate={candidateForQuestionnaire}
              job={job} // Pass the Job for context-aware generation
              isRecruiterView={true}
              onBack={() => setCandidateForQuestionnaire(null)}
          />
      );
  }

  // --- IF DOCUMENT IS SELECTED, SHOW FULL PAGE ---
  if (selectedCV) {
      return (
          <DocumentComparisonModal 
             data={selectedCV}
             type="CANDIDATE"
             onClose={() => setSelectedCV(null)}
          />
      );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-3 hover:bg-slate-100 rounded-full transition-colors bg-slate-50">
             <ArrowRight size={20} className="text-slate-600" />
           </button>
           <div>
             <h2 className="text-2xl font-black text-slate-900">{job.title}</h2>
             <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
               תוצאות התאמה למשרה זו
               {results.length > 0 && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">מעודכן</span>}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
             {/* AI Model Selector Integration */}
             <AIModelSelector currentModel={selectedModel} onSelect={setSelectedModel} />
             
            {loading ? (
              <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-700 animate-pulse">
                 <Bot size={20} />
                 <span className="font-bold text-sm">Gemini מנתח...</span>
              </div>
            ) : (
              <button 
                onClick={handleRefresh}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all shadow-sm
                  ${newCandidatesCount > 0 
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 animate-pulse' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}
                `}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="font-bold text-sm">
                  {newCandidatesCount > 0 ? `רענן (${newCandidatesCount} חדשים)` : 'ניתוח מחדש'}
                </span>
              </button>
            )}
        </div>
      </div>

      {/* Tabs */}
      {validResults.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
           <button 
             onClick={() => setActiveTab('matches')}
             className={`px-6 py-3 text-sm font-bold rounded-2xl transition-colors flex items-center gap-2 whitespace-nowrap
                ${activeTab === 'matches' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}
             `}
           >
             <CheckCircle size={16} />
             התאמה גבוהה ({highMatches.length})
           </button>
           <button 
             onClick={() => setActiveTab('rejected')}
             className={`px-6 py-3 text-sm font-bold rounded-2xl transition-colors flex items-center gap-2 whitespace-nowrap
                ${activeTab === 'rejected' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}
             `}
           >
             <XCircle size={16} />
             גבולי / נדחו ({lowMatches.length})
           </button>
        </div>
      )}

      {/* Content Area */}
      {!hasCandidates ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center px-4">
          <UserX size={64} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">המאגר ריק ממועמדים</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            לא ניתן לבצע התאמה כי אין מועמדים במערכת.
          </p>
        </div>
      ) : loading && validResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 size={48} className="text-emerald-500 animate-spin" />
          <p className="text-slate-500 animate-pulse font-bold">מנתח קורות חיים ומצליב נתונים...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {displayedResults.length === 0 ? (
              <div className="col-span-full bg-slate-50 border border-slate-200 rounded-[2rem] p-16 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                     {activeTab === 'matches' ? <CheckCircle size={32} className="text-slate-400" /> : <Filter size={32} className="text-slate-400" />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">
                     {activeTab === 'matches' ? 'לא נמצאו התאמות גבוהות' : 'לא נמצאו מועמדים בטווח הגבולי'}
                  </h3>
                  <p className="text-slate-500 text-sm">
                     נסה לשנות קריטריונים או המתן למועמדים חדשים.
                  </p>
              </div>
          ) : (
             displayedResults.map((result, index) => {
              const candidate = candidates.find(c => c.id === result.candidateId);
              if (!candidate) return null;
              
              const isRejected = activeTab === 'rejected';

              // Candidate Image Background Style
              const buttonStyle = candidate.imageUrl ? {
                backgroundImage: `url('${candidate.imageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
               } : {};
              const bgGradient = getGradientByDept(candidate.department);

              return (
                <div 
                    key={candidate.id} 
                    className={`bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col relative transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 duration-500
                        ${isRejected ? 'opacity-80 grayscale-[0.5]' : ''}
                    `}
                >
                    {/* 1. TOP IMAGE - Compact */}
                    <div className="h-32 relative w-full overflow-hidden bg-slate-100">
                        {/* GREEN MATCH FRAME (Header) */}
                        <div className="absolute top-0 left-0 right-0 h-8 bg-emerald-600 flex items-center justify-between px-4 z-10">
                             <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest">התאמה</span>
                             <span className="text-white font-bold text-sm">{result.score}%</span>
                        </div>

                        {candidate.imageUrl ? (
                            <img src={candidate.imageUrl} className="w-full h-full object-cover mt-8" />
                        ) : (
                             <div className={`w-full h-full ${bgGradient} relative mt-8`}>
                                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                             </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent pointer-events-none"></div>
                    </div>

                    {/* 2. BODY */}
                    <div className="px-6 relative flex-grow flex flex-col pt-10 pb-4">
                         
                         {/* FLOATING BADGE (Between Image and Body) */}
                         <div className="absolute -top-5 left-6 z-20">
                             <div className="h-8 px-3 rounded-lg bg-white text-slate-800 flex items-center justify-center gap-2 shadow-md border border-slate-100 font-bold text-[10px] uppercase tracking-wide">
                                 <Briefcase size={12} className="text-teal-500"/>
                                 {candidate.field || candidate.department}
                             </div>
                         </div>

                         {/* Avatar */}
                         <div className="absolute -top-10 right-6">
                             <img 
                                 src={candidate.avatarUrl} 
                                 className="w-16 h-16 rounded-2xl object-cover border-[4px] border-white shadow-md bg-white"
                                 alt={candidate.name}
                             />
                         </div>
                         
                         <div className="mb-4">
                             <h3 className="text-xl font-black text-slate-900 leading-tight">{candidate.name}</h3>
                             <p className="text-slate-500 text-sm font-medium mt-0.5">{candidate.title}</p>
                         </div>

                         {/* AI Insight Box */}
                         <div className={`bg-slate-50 rounded-xl p-4 text-xs leading-relaxed border border-slate-100 flex-grow flex gap-3 items-start mb-4
                            ${isRejected ? 'bg-red-50/50 border-red-50 text-slate-600' : 'bg-indigo-50/30 border-indigo-50/50 text-slate-600'}
                         `}>
                             <div className="mt-0.5 flex-shrink-0">
                                 {isRejected ? <XCircle size={14} className="text-red-400" /> : <SparkleIcon className="w-4 h-4 text-indigo-500" />}
                             </div>
                             <div>
                                 <span className={`font-bold block mb-1 ${isRejected ? 'text-red-700' : 'text-indigo-700'}`}>
                                     {isRejected ? 'למה לא מתאים?' : 'למה מתאים?'}
                                 </span>
                                 {result.reasoning}
                             </div>
                         </div>
                    </div>

                    {/* 3. FOOTER ACTIONS */}
                    <div className="p-3 border-t border-slate-50 bg-slate-50/50 flex gap-2 items-center">
                        {candidate.phone && (
                            <button 
                                onClick={() => window.open(`https://wa.me/${candidate.phone}?text=Hi ${candidate.name}`, '_blank')}
                                className="p-3 bg-white border border-slate-200 text-emerald-600 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                                title="WhatsApp"
                            >
                                <MessageCircle size={18} />
                            </button>
                        )}
                        
                        {/* PAGE ICON (Green) - View CV with Comparison Modal */}
                        <button 
                           onClick={() => setSelectedCV(candidate)}
                           className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-100 hover:shadow-md transition-all shadow-sm"
                           title="צפה בקו''ח"
                        >
                            <FileText size={18} />
                        </button>

                        {/* "Continue with Candidate" Button -> Opens Questionnaire */}
                        <button 
                           onClick={() => setCandidateForQuestionnaire(candidate)}
                           style={buttonStyle}
                           className={`flex-grow py-3 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all group/btn relative overflow-hidden
                               ${!candidate.imageUrl ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : ''}
                           `}
                        >
                            {candidate.imageUrl && <div className="absolute inset-0 bg-black/40 transition-colors group-hover/btn:bg-black/50"></div>}
                            <span className="relative z-10 flex items-center gap-2">
                               להמשיך עם המועמד
                               <ArrowRight size={14} className="group-hover/btn:-translate-x-1 transition-transform"/>
                            </span>
                        </button>
                    </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);
