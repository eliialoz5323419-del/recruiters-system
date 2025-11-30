import React, { useState } from 'react';
import { Job, Candidate } from '../types';
import { ArrowRight, FileText, LayoutTemplate, Columns, Image as ImageIcon, MapPin, Calendar } from 'lucide-react';

interface DocumentComparisonModalProps {
  data: Job | Candidate;
  type: 'JOB' | 'CANDIDATE';
  onClose: () => void;
}

// Common Card Wrapper Style - Extracted to fix prop types
const CardWrapper: React.FC<{ children: React.ReactNode, label: string, icon: any }> = ({ children, label, icon: Icon }) => (
    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col relative overflow-hidden transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]">
        {/* Floating Label */}
        <div className="absolute top-6 right-6 z-20 pointer-events-none">
            <span className="bg-white/90 backdrop-blur-md text-slate-700 px-4 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 shadow-sm flex items-center gap-1.5">
                <Icon size={12}/> {label}
            </span>
        </div>
        {children}
    </div>
);

export const DocumentComparisonModal: React.FC<DocumentComparisonModalProps> = ({ data, type, onClose }) => {
  // 'BOTH' = Split, 'SOURCE' = Source, 'SYSTEM' = System
  const [viewMode, setViewMode] = useState<'BOTH' | 'SOURCE' | 'SYSTEM'>('BOTH');

  const isJob = type === 'JOB';
  const job = isJob ? (data as Job) : null;
  const candidate = !isJob ? (data as Candidate) : null;

  const sourceFile = data.sourceFile;
  const hasSource = !!(sourceFile || (candidate && candidate.cvImageUrl));
  
  // --- Content Renderers ---

  const renderSourceCard = () => {
      if (!hasSource) {
          return (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <FileText size={40} className="opacity-50" />
                  </div>
                  <p className="font-bold">לא קיים קובץ מקור</p>
              </div>
          );
      }

      const fileData = sourceFile?.data || (candidate?.cvImageUrl);
      const fileType = sourceFile?.type || 'image/jpeg'; 

      return (
        <div className="w-full h-full p-4">
            {fileType === 'application/pdf' ? (
                <iframe src={fileData} className="w-full h-full rounded-[2rem] bg-slate-50 border border-slate-100" title="Source PDF" />
            ) : (
                <img src={fileData || ''} className="w-full h-full object-contain rounded-[2rem]" alt="Source" />
            )}
        </div>
      );
  };

  const renderSystemCard = () => {
      return (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-1">
              {/* Header Image */}
              <div className="h-64 w-full rounded-t-[2.5rem] overflow-hidden relative mb-6 shrink-0">
                   {data.imageUrl ? (
                       <img src={data.imageUrl} className="w-full h-full object-cover" />
                   ) : (
                       <div className={`w-full h-full bg-gradient-to-r ${isJob ? 'from-teal-500 to-emerald-600' : 'from-indigo-500 to-purple-600'}`}>
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                       </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                       <div>
                           <div className="flex gap-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    {data.department}
                                </span>
                           </div>
                           <h2 className="text-4xl font-black text-white leading-tight">
                               {isJob ? job?.title : candidate?.name}
                           </h2>
                       </div>
                   </div>
              </div>

              {/* Body */}
              <div className="px-8 pb-12">
                  <div className="flex flex-wrap gap-3 mb-8">
                      {isJob && job?.location && (
                           <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                              <MapPin size={14}/> {job.location}
                           </span>
                      )}
                      {!isJob && candidate?.title && (
                          <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100">
                              {candidate.title}
                          </span>
                      )}
                      <span className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 mr-auto">
                          <Calendar size={14}/> {isJob ? job?.postedDate : new Date().toLocaleDateString('he-IL')}
                      </span>
                  </div>

                  <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-8 whitespace-pre-line text-justify">
                      {isJob ? (job?.fullAdText || job?.description) : candidate?.resumeText}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in h-full flex flex-col">
        
        {/* HEADER - MATCHING MATCHINGVIEW EXACTLY */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
             
             {/* RIGHT SIDE: Title (Context) */}
             <div className="flex items-center gap-4">
                 <button 
                    onClick={onClose}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-all shadow-sm group"
                 >
                     <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform"/>
                 </button>
                 <div>
                     <h2 className="text-2xl font-black text-slate-900 mb-0.5">
                        {isJob ? 'תיק משרה' : 'תיק מועמד'}
                     </h2>
                     <p className="text-slate-500 font-medium text-sm">
                        {isJob ? job?.title : candidate?.name}
                     </p>
                 </div>
             </div>

             {/* LEFT SIDE: 3-Label Switcher */}
             <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1 self-center md:self-auto">
                 <button 
                    onClick={() => setViewMode('SOURCE')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                        ${viewMode === 'SOURCE' 
                           ? 'bg-white text-teal-600 shadow-sm' 
                           : 'text-slate-400 hover:text-slate-600'
                        }
                    `}
                 >
                     <FileText size={16} />
                     <span>מקור</span>
                 </button>
                 
                 <div className="w-px bg-slate-200 my-1"></div>

                 <button 
                    onClick={() => setViewMode('BOTH')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                        ${viewMode === 'BOTH' 
                           ? 'bg-white text-teal-600 shadow-sm' 
                           : 'text-slate-400 hover:text-slate-600'
                        }
                    `}
                 >
                     <Columns size={16} />
                     <span>פיצול</span>
                 </button>

                 <div className="w-px bg-slate-200 my-1"></div>

                 <button 
                    onClick={() => setViewMode('SYSTEM')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                        ${viewMode === 'SYSTEM' 
                           ? 'bg-white text-teal-600 shadow-sm' 
                           : 'text-slate-400 hover:text-slate-600'
                        }
                    `}
                 >
                     <LayoutTemplate size={16} />
                     <span>מערכת</span>
                 </button>
             </div>
        </div>

        {/* PAGE CONTENT - Fixed height to ensure split view looks good */}
        <div className="flex-grow min-h-[70vh]">
                
            {/* MODE: BOTH (Split) */}
            {viewMode === 'BOTH' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <CardWrapper label="קובץ מקור" icon={FileText}>
                        {renderSourceCard()}
                    </CardWrapper>
                    <CardWrapper label="נתוני מערכת" icon={LayoutTemplate}>
                        {renderSystemCard()}
                    </CardWrapper>
                </div>
            )}

            {/* MODE: SOURCE */}
            {viewMode === 'SOURCE' && (
                <div className="h-full">
                    <CardWrapper label="קובץ מקור מלא" icon={FileText}>
                        {renderSourceCard()}
                    </CardWrapper>
                </div>
            )}

            {/* MODE: SYSTEM */}
            {viewMode === 'SYSTEM' && (
                <div className="h-full">
                    <CardWrapper label="נתוני מערכת מלאים" icon={LayoutTemplate}>
                        {renderSystemCard()}
                    </CardWrapper>
                </div>
            )}
        </div>
    </div>
  );
};