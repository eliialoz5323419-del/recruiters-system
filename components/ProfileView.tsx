
import React from 'react';
import { User } from '../types';
import { Camera, Briefcase, Users, Trophy, Bell, CheckCircle, Clock, TrendingUp, LogOut, Edit2, ChevronLeft, Shield } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  stats: {
    totalJobs: number;
    totalCandidates: number;
    activeMatches: number;
    filledJobs: number;
  };
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, stats, onLogout }) => {
  
  // Mock Messages
  const messages = [
    { id: 1, title: "התאמה מושלמת נמצאה", desc: "אלגוריתם ה-AI מצא מועמד בציון 95% למשרת Full Stack", time: "לפני שעתיים", type: "success" },
    { id: 2, title: "עדכון מערכת", desc: "נוספו יכולות חדשות למחולל המשרות", time: "לפני יום", type: "info" },
    { id: 3, title: "מועמד חדש הצטרף", desc: "קורות חיים חדשים נסרקו מהמייל", time: "לפני יומיים", type: "info" },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in flex flex-col min-h-[85vh]">
      
      {/* 1. Header Profile Section */}
      <div className="text-center mb-12 relative">
          <div className="w-32 h-32 mx-auto rounded-full p-1 bg-gradient-to-tr from-teal-400 to-emerald-600 shadow-2xl mb-6 relative group cursor-pointer">
             <img 
               src={user.avatar} 
               className="w-full h-full rounded-full border-4 border-white object-cover"
               alt="Profile"
             />
             <div className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full border-4 border-white">
                 <Edit2 size={14} />
             </div>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2">{user.name}</h1>
          <div className="flex items-center justify-center gap-2 text-slate-500 font-medium mb-6">
             <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600">
                 {user.role === 'ADMIN' ? 'מנהל מערכת' : 'מגייס מורשה'}
             </span>
             <span>{user.email}</span>
          </div>

          {/* Quick Stats Row */}
          <div className="flex justify-center gap-8 border-y border-slate-100 py-6">
              <div className="text-center">
                  <div className="text-2xl font-black text-slate-900">{stats.totalJobs}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase">משרות</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center">
                  <div className="text-2xl font-black text-slate-900">{stats.totalCandidates}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase">מועמדים</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center">
                  <div className="text-2xl font-black text-slate-900">{stats.filledJobs}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase">גיוסים</div>
              </div>
          </div>
      </div>

      {/* 2. Notifications / Activity */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-auto">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Bell size={20} className="text-teal-500"/> עדכונים אחרונים
          </h3>
          <div className="space-y-6">
              {messages.map((msg, i) => (
                  <div key={msg.id} className="flex gap-4 items-start">
                      <div className="flex-col items-center hidden md:flex">
                          <div className="w-2 h-2 bg-slate-200 rounded-full mt-2"></div>
                          {i !== messages.length - 1 && <div className="w-px h-12 bg-slate-100 my-1"></div>}
                      </div>
                      <div className="flex-grow bg-slate-50 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-slate-800 text-sm">{msg.title}</h4>
                              <span className="text-[10px] text-slate-400 font-bold">{msg.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{msg.desc}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* 3. Bottom Logout Button - Distinct */}
      <div className="mt-12">
          <button 
            onClick={onLogout}
            className="w-full bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 hover:shadow-lg py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group transform hover:-translate-y-1"
          >
              <div className="bg-red-50 p-2 rounded-full group-hover:bg-red-100 transition-colors">
                  <LogOut size={20} className="ml-0.5" />
              </div>
              <span>התנתק ויציאה למסך הראשי</span>
          </button>
      </div>

    </div>
  );
};
