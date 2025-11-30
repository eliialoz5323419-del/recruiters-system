
import React, { useState } from 'react';
import { Mail, Linkedin, Facebook, CheckCircle, XCircle, RefreshCw, Link2 } from 'lucide-react';
import { IntegrationStatus } from '../types';

export const IntegrationsView: React.FC = () => {
  // In a real app, this would come from the backend user profile
  const [status, setStatus] = useState<IntegrationStatus>({
    gmail: false,
    linkedin: false,
    facebook: false
  });
  
  const [loading, setLoading] = useState<string | null>(null);

  const toggleConnection = (platform: keyof IntegrationStatus) => {
    setLoading(platform);
    
    // Mock API Call
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        [platform]: !prev[platform]
      }));
      setLoading(null);
    }, 1500);
  };

  const IntegrationCard = ({ 
    id, 
    name, 
    icon: Icon, 
    description, 
    colorClass, 
    isConnected 
  }: { 
    id: keyof IntegrationStatus, 
    name: string, 
    icon: any, 
    description: string, 
    colorClass: string,
    isConnected: boolean
  }) => (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${isConnected ? 'bg-white border-emerald-200 shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
       {isConnected && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
       
       <div className="p-6">
          <div className="flex justify-between items-start mb-4">
             <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
                <Icon size={28} className={colorClass.replace('bg-', 'text-')} />
             </div>
             <div className="flex flex-col items-end">
                <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                   {isConnected ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                   {isConnected ? 'מחובר' : 'לא מחובר'}
                </span>
             </div>
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2">{name}</h3>
          <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{description}</p>
          
          <button 
            onClick={() => toggleConnection(id)}
            disabled={loading === id}
            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
              ${isConnected 
                ? 'border-2 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200' 
                : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200'}
            `}
          >
             {loading === id ? <RefreshCw size={16} className="animate-spin"/> : <Link2 size={16} />}
             {loading === id ? 'מתקשר...' : isConnected ? 'התנתק' : `התחבר ל-${name}`}
          </button>
       </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20">
       <div className="mb-8">
         <h1 className="text-3xl font-bold text-slate-900 mb-2">אינטגרציות וחיבורים</h1>
         <p className="text-slate-500">חבר את המערכת למקורות חיצוניים כדי לשאוב קורות חיים ולפרסם משרות אוטומטית.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IntegrationCard 
             id="gmail"
             name="Gmail / Outlook"
             icon={Mail}
             description="סריקה אוטומטית של תיבת המייל לשאיבת קורות חיים שנשלחו."
             colorClass="bg-red-500 text-red-600"
             isConnected={status.gmail}
          />
          <IntegrationCard 
             id="linkedin"
             name="LinkedIn"
             icon={Linkedin}
             description="פרסום משרות אוטומטי וקבלת הודעות InMail ממועמדים."
             colorClass="bg-blue-600 text-blue-600"
             isConnected={status.linkedin}
          />
          <IntegrationCard 
             id="facebook"
             name="Facebook Jobs"
             icon={Facebook}
             description="פרסום משרות בקבוצות רלוונטיות וניהול קמפיינים."
             colorClass="bg-indigo-600 text-indigo-600"
             isConnected={status.facebook}
          />
       </div>

       {/* Detailed Status Section (Only visible if connected) */}
       {(status.gmail || status.linkedin) && (
         <div className="mt-10 bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-fade-in">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <RefreshCw size={18} className="text-indigo-500"/>
               סטטוס סנכרון אחרון
            </h3>
            <div className="space-y-3">
               {status.gmail && (
                 <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="bg-red-100 p-1.5 rounded text-red-600"><Mail size={14}/></div>
                       <span className="text-sm font-medium text-slate-700">Gmail Scanner</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-bold">פעיל - נסרק לפני 5 דק'</span>
                 </div>
               )}
               {status.linkedin && (
                 <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-100 p-1.5 rounded text-blue-600"><Linkedin size={14}/></div>
                       <span className="text-sm font-medium text-slate-700">LinkedIn Publisher</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-bold">מחובר - ממתין לפקודה</span>
                 </div>
               )}
            </div>
         </div>
       )}
    </div>
  );
};
