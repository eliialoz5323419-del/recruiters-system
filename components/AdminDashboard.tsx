
import React from 'react';
import { User, Job, Candidate, MatchResult } from '../types';
import { Users, Briefcase, TrendingUp, Shield, Globe, Search, Trash2, AlertTriangle, UserCheck, ExternalLink } from 'lucide-react';

interface AdminDashboardProps {
  allJobs: Job[];
  allCandidates: Candidate[];
  recruiters: User[];
  jobMatches: Record<string, MatchResult[]>;
  onViewGlobalJobs: () => void;
  onViewGlobalCandidates: () => void;
  onDeleteRecruiter: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  allJobs, 
  allCandidates,
  recruiters,
  jobMatches,
  onViewGlobalJobs,
  onViewGlobalCandidates,
  onDeleteRecruiter
}) => {
  
  const onlyRecruiters = recruiters.filter(r => r.role !== 'ADMIN');

  // Flatten Matches for Global Table logic
  const allSystemMatches: {
      job: Job,
      candidate: Candidate,
      match: MatchResult,
      jobRecruiter?: User,
      candidateRecruiter?: User,
      isExternal: boolean
  }[] = [];

  // Logic: Iterate all jobs, get their matches, check candidate ownership
  allJobs.forEach(job => {
      const matches = jobMatches[job.id] || [];
      matches.forEach(match => {
          // Show matches > 60 for visibility
          if (match.score > 60) {
              const candidate = allCandidates.find(c => c.id === match.candidateId);
              if (candidate) {
                  const jobRecruiter = recruiters.find(r => r.id === job.recruiterId);
                  const candidateRecruiter = recruiters.find(r => r.id === candidate.recruiterId);
                  
                  // Crucial logic: Is the candidate owned by a different recruiter?
                  const isExternal = job.recruiterId !== candidate.recruiterId;
                  
                  allSystemMatches.push({
                      job,
                      candidate,
                      match,
                      jobRecruiter,
                      candidateRecruiter,
                      isExternal
                  });
              }
          }
      });
  });

  allSystemMatches.sort((a, b) => b.match.score - a.match.score);

  const confirmDelete = (id: string, name: string) => {
      if (window.confirm(`האם אתה בטוח שברצונך למחוק את המגייס ${name}?\nפעולה זו תמחק לצמיתות את המשתמש, המשרות שלו והמועמדים שלו מהדאטה בייס.`)) {
          onDeleteRecruiter(id);
      }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
             <Shield size={28} className="text-indigo-600"/>
             דשבורד ניהול ראשי
           </h1>
           <p className="text-slate-500">סקירה כללית על כלל המגייסים והנתונים בארגון</p>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard 
            icon={Briefcase} 
            label='סה"כ משרות בארגון' 
            value={allJobs.length} 
            color="bg-blue-600" 
         />
         <StatCard 
            icon={Users} 
            label='סה"כ מועמדים במאגר' 
            value={allCandidates.length} 
            color="bg-emerald-600" 
         />
         <StatCard 
            icon={TrendingUp} 
            label='מגייסים פעילים' 
            value={onlyRecruiters.length} 
            color="bg-purple-600" 
         />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <button 
           onClick={onViewGlobalJobs}
           className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
         >
            <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
               <Globe size={32} />
            </div>
            <div className="text-center">
               <h3 className="font-bold text-lg text-slate-800">מאגר משרות גלובלי</h3>
               <p className="text-slate-500 text-sm">צפה ומחק משרות של כל המגייסים</p>
            </div>
         </button>

         <button 
           onClick={onViewGlobalCandidates}
           className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
         >
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 group-hover:scale-110 transition-transform">
               <Search size={32} />
            </div>
            <div className="text-center">
               <h3 className="font-bold text-lg text-slate-800">מאגר מועמדים גלובלי</h3>
               <p className="text-slate-500 text-sm">צפה ומחק מועמדים מכל המגייסים</p>
            </div>
         </button>
      </div>

      {/* THE REQUESTED TABLE: Global Matches with Labels */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
            <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <UserCheck size={20} className="text-indigo-600"/>
                    התאמות מובילות בארגון
                </h3>
                <p className="text-xs text-slate-500 mt-1">טבלה המרכזת את כל החיבורים בין מועמדים למשרות (כולל Cross-Recruiting)</p>
            </div>
         </div>
         <div className="max-h-96 overflow-y-auto">
           <table className="w-full text-right">
             <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
               <tr>
                 <th className="px-6 py-3 bg-slate-50">ציון</th>
                 <th className="px-6 py-3 bg-slate-50">משרה (ומגייס)</th>
                 <th className="px-6 py-3 bg-slate-50">מועמד (ומקור)</th>
                 <th className="px-6 py-3 bg-slate-50">תובנת AI</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {allSystemMatches.length === 0 ? (
                   <tr>
                       <td colSpan={4} className="p-8 text-center text-slate-400">לא נמצאו התאמות חזקות במערכת עדיין</td>
                   </tr>
               ) : (
                 allSystemMatches.map((item, idx) => (
                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4">
                             <span className={`font-black text-lg ${item.match.score >= 85 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                 {item.match.score}%
                             </span>
                         </td>
                         <td className="px-6 py-4">
                             <div className="font-bold text-slate-800">{item.job.title}</div>
                             <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                 <Briefcase size={10}/> {item.jobRecruiter?.name || 'מגייס לא ידוע'}
                             </div>
                         </td>
                         <td className="px-6 py-4">
                             <div className="font-bold text-slate-800">{item.candidate.name}</div>
                             <div className="mt-1">
                                 {/* LABELS LOGIC */}
                                 {item.isExternal ? (
                                     <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border border-purple-200">
                                         <Globe size={12} />
                                         חיצוני: {item.candidateRecruiter?.name || 'מאגר חיצוני'}
                                     </span>
                                 ) : (
                                     <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-100">
                                         <UserCheck size={12} />
                                         פנימי
                                     </span>
                                 )}
                             </div>
                         </td>
                         <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={item.match.reasoning}>
                             {item.match.reasoning}
                         </td>
                     </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Recruiters Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">ניהול מגייסים</h3>
            <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle size={12} />
                זהירות: מחיקה היא סופית
            </span>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-right">
             <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
               <tr>
                 <th className="px-6 py-4">שם המגייס</th>
                 <th className="px-6 py-4">אימייל</th>
                 <th className="px-6 py-4">משרות פעילות</th>
                 <th className="px-6 py-4">מועמדים</th>
                 <th className="px-6 py-4">פעולות</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {onlyRecruiters.length === 0 ? (
                   <tr>
                       <td colSpan={5} className="p-8 text-center text-slate-400">לא נמצאו מגייסים במערכת</td>
                   </tr>
               ) : (
                 onlyRecruiters.map((r) => {
                   const activeJobs = allJobs.filter(j => j.recruiterId === r.id).length;
                   const candidatesCount = allCandidates.filter(c => c.recruiterId === r.id).length;
                   
                   return (
                     <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                           <img src={r.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt={r.name}/>
                           {r.name}
                       </td>
                       <td className="px-6 py-4 text-slate-500 text-sm">{r.email}</td>
                       <td className="px-6 py-4 text-slate-600 font-bold">{activeJobs}</td>
                       <td className="px-6 py-4 text-slate-600 font-bold">{candidatesCount}</td>
                       <td className="px-6 py-4">
                          <button 
                            onClick={() => confirmDelete(r.id, r.name)}
                            className="bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-2 shadow-sm"
                          >
                            <Trash2 size={14} />
                            מחק מגייס
                          </button>
                       </td>
                     </tr>
                   );
                 })
               )}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};
