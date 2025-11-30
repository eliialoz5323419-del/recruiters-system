import React, { useState } from 'react';
import { Job } from '../types';
import { MapPin, Calendar, FileText, Trash2, Sparkles, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { DocumentComparisonModal } from './DocumentComparisonModal';

interface DashboardProps {
  jobs: Job[];
  candidates: any[];
  onSelectJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
}

interface JobCardProps {
    job: Job;
    onMatch: (job: Job) => void;
    onDeleteJob: (e: React.MouseEvent, id: string) => void;
    onViewDetails: (e: React.MouseEvent, job: Job) => void;
}

// Extracted JobCard Component
const JobCard: React.FC<JobCardProps> = ({ job, onMatch, onDeleteJob, onViewDetails }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getGradient = (id: string) => 'from-teal-500 to-emerald-600';

    const buttonStyle = job.imageUrl ? {
        backgroundImage: `url('${job.imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {};

    return (
        <div 
            onClick={(e) => onViewDetails(e, job)}
            className={`group relative bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-auto min-h-[420px] transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 duration-500 cursor-pointer ${job.status === 'FILLED' ? 'grayscale-[0.8] opacity-80' : ''}`}
        >
            {/* 1. TOP IMAGE AREA */}
            <div className="h-24 relative overflow-hidden bg-slate-100 flex-shrink-0">
                {job.imageUrl ? (
                    <img src={job.imageUrl} className="w-full h-full object-cover" />
                ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradient(job.id)} relative`}>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                        </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent"></div>

                {/* DATE BADGE */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                        <span className="bg-black/40 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <Calendar size={10} className="text-teal-300" />
                            {job.postedDate}
                        </span>
                </div>
            </div>

            {/* 2. CONTENT AREA */}
            <div className="px-8 relative flex-grow flex flex-col">
                
                {/* FLOATING BOX - Department */}
                <div className="absolute -top-5 left-8 z-20">
                        <div className="h-10 px-4 rounded-xl bg-white text-slate-800 flex items-center justify-center gap-2 shadow-md border-2 border-white font-bold text-xs uppercase tracking-wide">
                            <Briefcase size={14} className="text-indigo-500"/>
                            {job.department}
                        </div>
                </div>

                <div className="mt-8 mb-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <MapPin size={12} className="text-teal-500" /> {job.location}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight line-clamp-2" title={job.title}>{job.title}</h3>
                </div>

                <div className="mb-6 relative bg-slate-50 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed border border-slate-100 flex-grow flex flex-col">
                    <div className={`transition-all duration-300 ${isExpanded ? '' : 'line-clamp-4'}`}>
                        {job.description}
                    </div>
                    
                    {/* Show More / Less Toggle */}
                    {job.description.length > 100 && (
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

            {/* 3. FOOTER ACTIONS */}
            <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex gap-3 items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Delete Button - Visible */}
                <button 
                    onClick={(e) => onDeleteJob(e, job.id)} 
                    className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:border-red-200 hover:text-red-500 hover:shadow-md transition-all"
                    title="מחק משרה"
                >
                    <Trash2 size={20} />
                </button>
                
                {/* Document / View Details Button */}
                <button 
                    onClick={(e) => onViewDetails(e, job)} 
                    className="p-3.5 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl hover:bg-teal-100 hover:shadow-md transition-all"
                    title="צפה במודעה / קובץ"
                >
                    <FileText size={20} />
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); onMatch(job); }} 
                    style={buttonStyle}
                    className={`flex-grow py-3.5 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all group/btn relative overflow-hidden
                        ${!job.imageUrl ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700' : ''}
                    `}
                >
                    {job.imageUrl && <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/50"></div>}
                    
                    {/* Visual AI Indicator */}
                    <div className="absolute top-1 right-1 bg-white/20 backdrop-blur-sm rounded-full p-1 opacity-80">
                        <Sparkles size={8} className="text-white"/>
                    </div>

                    <span className="relative z-10 flex items-center gap-2">
                        <Sparkles size={18} className="group-hover/btn:scale-110 transition-transform text-teal-200" /> 
                        מצא התאמות
                    </span>
                </button>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ jobs, candidates, onSelectJob, onDeleteJob }) => {
  const [selectedJobDetails, setSelectedJobDetails] = useState<Job | null>(null);
  
  // OPEN MODAL (The new Full Page one)
  const handleViewDetails = (e: React.MouseEvent, job: Job) => {
      e.stopPropagation();
      setSelectedJobDetails(job);
  };

  // HANDLERS
  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm("האם למחוק משרה זו?")) {
          onDeleteJob(id);
          if (selectedJobDetails?.id === id) {
              setSelectedJobDetails(null);
          }
      }
  };

  // --- RENDER VIEW SWITCH ---
  
  // 1. Comparison View (Full Page Replacement)
  if (selectedJobDetails) {
      return (
          <DocumentComparisonModal 
             data={selectedJobDetails}
             type="JOB"
             onClose={() => setSelectedJobDetails(null)}
          />
      );
  }

  const safeJobs = Array.isArray(jobs) ? jobs : [];

  // 2. Dashboard Grid View
  return (
    <div className="space-y-8 pb-20">
      
      <div className="flex items-end justify-between mb-6">
         <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">סידור עבודה</h1>
            <p className="text-slate-500 font-medium">הסידור עבודה שלי</p>
         </div>
         <div className="hidden md:block text-sm font-bold text-teal-600 bg-white px-6 py-2.5 rounded-2xl border border-teal-100 shadow-sm">
             סה"כ {safeJobs.length} משרות פעילות
         </div>
      </div>

      {safeJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/30">
           <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-teal-100 animate-float">
             <Briefcase size={40} className="text-teal-400" />
           </div>
           <h3 className="text-2xl font-bold text-slate-800 mb-2">הלוח שלך ריק</h3>
           <p className="text-slate-500">התחל ביצירת משרה חדשה באמצעות כלי ה-AI</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {safeJobs.map((job) => (
             <JobCard 
                key={job.id} 
                job={job} 
                onMatch={onSelectJob} 
                onDeleteJob={handleDelete}
                onViewDetails={handleViewDetails}
             />
          ))}
        </div>
      )}
    </div>
  );
};