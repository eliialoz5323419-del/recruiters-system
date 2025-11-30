
import React, { useState, useEffect } from 'react';
import { Flame, Save, Database, Cloud, Monitor, RefreshCw, Server, Layout, Trash2, LogOut, AlertTriangle, Copy, FileText, Check, Wrench, Users, Briefcase, Link2, Globe, ExternalLink, ShieldAlert, Code2 } from 'lucide-react';
import { initializeFirebase, saveConfig, getConfig, disconnectFirebase, getDb } from '../services/firebaseClient';
import { User, MatchResult } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { deleteAllCandidates, deleteAllJobs, deleteAllMatches, deleteAllRecruiters, purgeLowQualityMatches, cleanupOrphanedData } from '../services/dataService';

// Hardcoded Project Config for easy access
const PROJECT_CONFIG = `const firebaseConfig = {
  apiKey: "AIzaSyBm_oPVSdwiUtGkAePXI9v_kO-SXmFmQsc",
  authDomain: "the-recruiters-86947.firebaseapp.com",
  projectId: "the-recruiters-86947",
  storageBucket: "the-recruiters-86947.firebasestorage.app",
  messagingSenderId: "595688985882",
  appId: "1:595688985882:web:7934902561bcf7bd2b08a3",
  measurementId: "G-9VRVLRQ4R3"
};`;

interface DataManagementProps {
    currentUser: User | null;
    localJobsCount: number;
    localCandidatesCount: number;
    localUsersCount: number;
    localInternalMatches: number;
    localExternalMatches: number;
}

export const DataManagement: React.FC<DataManagementProps> = ({ 
    currentUser,
    localJobsCount, 
    localCandidatesCount, 
    localUsersCount,
    localInternalMatches,
    localExternalMatches
}) => {
  const [configInput, setConfigInput] = useState('');
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Memo / Vault State
  const [memoConfig, setMemoConfig] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Cloud stats state
  const [cloudStats, setCloudStats] = useState({
      users: 0,
      candidates: 0,
      jobs: 0,
      internalMatches: 0,
      externalMatches: 0,
      loading: false
  });

  useEffect(() => {
      // Check connection status
      const existing = getConfig();
      if (existing) {
          setConfigInput(existing);
          // Try to init, but handle potential parsing/init errors gracefully
          try {
            const success = initializeFirebase();
            if (success) {
                setStatus('connected');
                fetchCloudStats();
            } else {
                setStatus('error');
            }
          } catch(e) {
              console.error("Auto-init failed:", e instanceof Error ? e.message : String(e));
              setStatus('error');
          }
      }

      // Load persistent memo
      const savedMemo = localStorage.getItem('firebase_config_memo');
      if (savedMemo) {
          setMemoConfig(savedMemo);
      } else {
          // Default to Project Config if empty
          setMemoConfig(PROJECT_CONFIG);
      }
  }, []);

  const handleSaveMemo = (value: string) => {
      setMemoConfig(value);
      localStorage.setItem('firebase_config_memo', value);
  };

  const copyMemo = () => {
      navigator.clipboard.writeText(memoConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  
  const loadProjectConfigToInput = () => {
      setConfigInput(PROJECT_CONFIG);
  };

  const handleConnect = () => {
      if (!configInput.trim()) return;
      saveConfig(configInput);
      if (!memoConfig) handleSaveMemo(configInput);
      
      try {
          const success = initializeFirebase();
          
          if (success) {
              setStatus('connected');
              setTimeout(() => window.location.reload(), 500);
          } else {
              setStatus('error');
              alert("נכשל בפענוח ההגדרות. וודא שהעתקת את כל הבלוק מ-Firebase Console.");
          }
      } catch(e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Manual init failed:", msg);
          setStatus('error');
      }
  };

  const fetchCloudStats = async () => {
      const db = getDb();
      if (!db) return;

      setCloudStats(prev => ({ ...prev, loading: true }));
      setFetchError(null);

      try {
          const timeoutPromise = new Promise((_, reject) => 
             setTimeout(() => reject(new Error('Timeout: Check your internet connection')), 8000)
          );

          const fetchPromise = Promise.all([
              getDocs(collection(db, 'users')),
              getDocs(collection(db, 'candidates')),
              getDocs(collection(db, 'jobs')),
              getDocs(collection(db, 'matches'))
          ]);

          const [usersSnap, candidatesSnap, jobsSnap, matchesSnap] = await Promise.race([fetchPromise, timeoutPromise]) as any[];

          let intMatches = 0;
          let extMatches = 0;
          
          matchesSnap.forEach((doc: any) => {
              const data = doc.data() as MatchResult;
              if (data.jobRecruiterId === data.candidateRecruiterId) {
                  intMatches++;
              } else {
                  extMatches++;
              }
          });

          setCloudStats({
              users: usersSnap.size,
              candidates: candidatesSnap.size,
              jobs: jobsSnap.size,
              internalMatches: intMatches,
              externalMatches: extMatches,
              loading: false
          });

      } catch (e: any) {
          // Safe logging
          const errMsg = e instanceof Error ? e.message : String(e);
          console.error("Failed to fetch cloud stats", errMsg);
          
          let friendlyError = "שגיאה בטעינת נתונים.";
          if (errMsg.includes('permission-denied')) {
              friendlyError = "אין הרשאות (Permission Denied). אנא בדוק את הגדרות Firestore Rules.";
          } else if (errMsg.includes('Timeout')) {
              friendlyError = "זמן קצוב עבר. בדוק את החיבור לאינטרנט.";
          }

          setFetchError(friendlyError);
          setCloudStats(prev => ({ ...prev, loading: false }));
      }
  };

  const handleDeleteCollection = async (type: 'users' | 'candidates' | 'jobs' | 'matches') => {
      let confirmMsg = "";
      switch(type) {
          case 'jobs': confirmMsg = "פעולה זו תמחק את כל המשרות מהענן."; break;
          case 'candidates': confirmMsg = "פעולה זו תמחק את כל המועמדים מהענן."; break;
          case 'matches': confirmMsg = "פעולה זו תמחק את כל ההתאמות מהענן."; break;
          case 'users': confirmMsg = "פעולה זו תמחק את כל המגייסים מהענן."; break;
      }

      if (!window.confirm(`⚠️ האם אתה בטוח?\n${confirmMsg}\nלא ניתן לשחזר את המידע לאחר המחיקה.`)) return;
      
      setIsDeleting(true);
      try {
          if (type === 'jobs') await deleteAllJobs();
          if (type === 'candidates') await deleteAllCandidates();
          if (type === 'matches') await deleteAllMatches();
          if (type === 'users') await deleteAllRecruiters(currentUser?.id);
          
          await fetchCloudStats();
          alert("המידע נמחק בהצלחה מהענן.");
      } catch (e: any) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Delete failed:", msg);
          if (msg.includes('permission-denied')) {
              alert("שגיאת הרשאות! עליך לשנות את ה-Rules במסד הנתונים.");
          } else {
              alert("שגיאה במחיקת המידע.");
          }
      } finally {
          setIsDeleting(false);
      }
  };

  const handlePurgeLowQuality = async () => {
      if(!window.confirm("האם למחוק מהדאטה את כל ההתאמות עם ציון נמוך מ-50?\nפעולה זו תנקה את ההתאמות המיותרות ותשאיר רק התאמות חזקות.")) return;
      setIsCleaning(true);
      try {
          const count = await purgeLowQualityMatches();
          await fetchCloudStats();
          alert(`נמחקו ${count} התאמות באיכות נמוכה.`);
      } catch(e: any) {
          console.error("Purge failed:", e instanceof Error ? e.message : String(e));
          alert("שגיאה בניקוי (בדוק הרשאות).");
      } finally {
          setIsCleaning(false);
      }
  };

  const handleCleanupOrphans = async () => {
      if(!window.confirm("האם למחוק נתונים יתומים (שאריות)?\nפעולה זו תמחק התאמות שמצביעות על משרות או מועמדים שכבר נמחקו, ותתקן את הפערים במספרים.")) return;
      setIsCleaning(true);
      try {
          const count = await cleanupOrphanedData();
          await fetchCloudStats();
          alert(`נמחקו ${count} רשומות יתומות.`);
      } catch(e: any) {
          console.error("Cleanup failed:", e instanceof Error ? e.message : String(e));
          alert("שגיאה בניקוי (בדוק הרשאות).");
      } finally {
          setIsCleaning(false);
      }
  };

  const StatBox = ({ title, count, colorClass, icon: Icon, isLoading, onDelete }: any) => (
      <div className={`bg-white p-4 rounded-xl border flex flex-col items-center justify-center text-center min-h-[140px] relative overflow-hidden shadow-sm ${colorClass}`}>
          {isLoading ? (
              <div className="flex-grow flex items-center justify-center">
                  <RefreshCw className="animate-spin text-slate-400" />
              </div>
          ) : (
              <>
                  <div className="mb-2 opacity-80"><Icon size={24} /></div>
                  <div className="text-3xl font-black text-slate-800 mb-1 leading-none">{count}</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
                  
                  {onDelete && (
                      <button 
                          onClick={onDelete}
                          disabled={isDeleting}
                          className="absolute top-2 right-2 text-red-200 hover:text-red-500 transition-colors"
                          title={`Delete all ${title}`}
                      >
                          <Trash2 size={14} />
                      </button>
                  )}
              </>
          )}
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20 px-4">
      <div className="text-center mb-8">
         <div className="inline-flex items-center justify-center p-3 bg-orange-50 text-orange-600 rounded-full mb-3 shadow-sm">
             <Flame size={32} />
         </div>
         <h1 className="text-3xl font-black text-slate-900 mb-1">ניהול דאטה והגדרות</h1>
         <p className="text-slate-500">סנכרון לענן, גיבוי ומחיקת נתונים</p>
      </div>

      {/* Connection Card */}
      <div className={`mb-8 p-6 rounded-2xl border-2 flex items-center justify-between
          ${status === 'connected' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}
      `}>
          <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${status === 'connected' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  <Database size={24} />
              </div>
              <div>
                  <h3 className={`font-bold text-lg ${status === 'connected' ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {status === 'connected' ? 'מחובר ל-Firebase' : 'לא מחובר'}
                  </h3>
                  <p className="text-sm opacity-70">
                      {status === 'connected' ? 'זרם הנתונים פעיל' : 'הדבק את הגדרות ה-Config למטה כדי להתחבר'}
                  </p>
              </div>
          </div>
          
          {status === 'connected' && (
              <button onClick={disconnectFirebase} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                  <LogOut size={16} /> התנתק
              </button>
          )}
      </div>

      {/* Troubleshooting / Rules Alert - Visible if Disconnected or if there's a fetch error */}
      {(status !== 'connected' || fetchError) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                  <ShieldAlert size={20} /> בעיות בחיבור או הרשאות?
              </h3>
              <div className="text-sm text-amber-900/80 space-y-2 leading-relaxed">
                  <p>אם המערכת לא מצליחה לשמור/לקרוא נתונים, סביר להניח שחוקי האבטחה (Rules) חוסמים זאת.</p>
                  <ol className="list-decimal list-inside space-y-1 font-medium mt-2"> 
                      <li>כנס ל-Firebase Console &gt; Firestore Database &gt; <strong>Rules</strong></li>  
                      <li>שנה את השורה <code>allow read, write: if false;</code> ל-<code>allow read, write: if true;</code></li>
                      <li>לחץ על <strong>Publish</strong>.</li>
                  </ol>
                  <p className="mt-2 text-xs opacity-80">* זה מאפשר גישה ללא אימות (מצב Test Mode), שזה בסדר לאפליקציית דמו.</p>
              </div>
          </div>
      )}

      {/* Maintenance Tools - Only if Connected */}
      {status === 'connected' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-4">
                  <Wrench size={20} /> כלי תחזוקה וניקוי (Maintenance Tools)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={handlePurgeLowQuality}
                    disabled={isCleaning}
                    className="flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-700 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm hover:shadow-md"
                  >
                      <Trash2 size={16} />
                      נקה התאמות נמוכות (Low Score &lt; 50%)
                      <span className="text-xs opacity-70 font-normal ml-1 hidden md:inline">- מתקן את ה-Internal Match</span>
                  </button>
                  <button 
                    onClick={handleCleanupOrphans}
                    disabled={isCleaning}
                    className="flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-700 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm hover:shadow-md"
                  >
                      <RefreshCw size={16} />
                      נקה נתונים יתומים (Orphans)
                      <span className="text-xs opacity-70 font-normal ml-1 hidden md:inline">- מסנכרן בין Cloud ל-Dashboard</span>
                  </button>
              </div>
          </div>
      )}

      {status !== 'connected' && (
          <div className="bg-white rounded-2xl shadow-lg border border-indigo-50 overflow-hidden p-8 mb-12 relative">
              <button 
                onClick={loadProjectConfigToInput}
                className="absolute top-8 left-8 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100"
              >
                  <Code2 size={14} /> טען קוד פרויקט
              </button>
              
              <label className="block text-sm font-bold text-slate-700 mb-3">
                  הדבק כאן את ה-Firebase Config (JS Object)
              </label>
              <div className="text-xs text-slate-400 mb-2">
                  העתק את הבלוק המלא: <code>const firebaseConfig = &#123; ... &#125;;</code>
              </div>
              <textarea 
                  value={configInput}
                  onChange={(e) => setConfigInput(e.target.value)}
                  className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                  dir="ltr"
              />
              <button 
                  onClick={handleConnect}
                  className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2"
              >
                  שמור והתחבר <Save size={20} />
              </button>
          </div>
      )}

      {/* COMPARISON VIEW */}
      {status === 'connected' && (
          <div className="space-y-8 animate-fade-in mb-12">
             
             <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Server size={24} className="text-blue-600"/>
                    בדיקת סנכרון (ענן מול מקומי)
                 </h2>
                 <button onClick={fetchCloudStats} className="text-sm bg-white border border-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                     <RefreshCw size={14} className={cloudStats.loading ? 'animate-spin' : ''}/>
                     רענן נתונים
                 </button>
             </div>

             {fetchError && (
                 <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 rounded-r-xl flex items-center gap-2">
                     <AlertTriangle size={20} />
                     <span className="font-bold text-sm">{fetchError}</span>
                 </div>
             )}
             
             {/* ROW 1: CLOUD */}
             <div className="relative">
                 <div className="absolute -top-3 right-4 bg-blue-600 text-white px-3 py-1 rounded shadow-md text-[10px] font-bold uppercase flex items-center gap-1 z-10">
                     <Cloud size={12} /> נתוני ענן (Cloud Firestore)
                 </div>
                 <div className="bg-blue-50/50 p-4 pt-6 rounded-2xl border border-blue-100">
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <StatBox 
                            title="מגייסים" 
                            count={cloudStats.users} 
                            icon={Users} 
                            isLoading={cloudStats.loading} 
                            colorClass="border-blue-200 text-blue-800"
                            onDelete={() => handleDeleteCollection('users')}
                        />
                        <StatBox 
                            title="מועמדים" 
                            count={cloudStats.candidates} 
                            icon={Briefcase} 
                            isLoading={cloudStats.loading} 
                            colorClass="border-blue-200 text-blue-800"
                            onDelete={() => handleDeleteCollection('candidates')}
                        />
                        <StatBox 
                            title="משרות פעילות" 
                            count={cloudStats.jobs} 
                            icon={Server} 
                            isLoading={cloudStats.loading} 
                            colorClass="border-blue-200 text-blue-800"
                            onDelete={() => handleDeleteCollection('jobs')}
                        />
                        <StatBox 
                            title="התאמות פנימיות" 
                            count={cloudStats.internalMatches} 
                            icon={Link2} 
                            isLoading={cloudStats.loading} 
                            colorClass="border-blue-200 text-blue-800"
                            onDelete={() => handleDeleteCollection('matches')}
                        />
                        <StatBox 
                            title="התאמות חיצוניות" 
                            count={cloudStats.externalMatches} 
                            icon={Globe} 
                            isLoading={cloudStats.loading} 
                            colorClass="border-blue-200 text-blue-800"
                            onDelete={() => handleDeleteCollection('matches')}
                        />
                     </div>
                 </div>
             </div>

             {/* ROW 2: DASHBOARD */}
             <div className="relative">
                 <div className="absolute -top-3 right-4 bg-purple-600 text-white px-3 py-1 rounded shadow-md text-[10px] font-bold uppercase flex items-center gap-1 z-10">
                     <Monitor size={12} /> תצוגת דשבורד (מקומי)
                 </div>
                 <div className="bg-purple-50/50 p-4 pt-6 rounded-2xl border border-purple-100">
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <StatBox 
                            title="מגייסים" 
                            count={localUsersCount} 
                            icon={Users} 
                            colorClass="border-purple-200 text-purple-800"
                        />
                        <StatBox 
                            title="מועמדים" 
                            count={localCandidatesCount} 
                            icon={Briefcase} 
                            colorClass="border-purple-200 text-purple-800"
                        />
                        <StatBox 
                            title="משרות פעילות" 
                            count={localJobsCount} 
                            icon={Layout} 
                            colorClass="border-purple-200 text-purple-800"
                        />
                        <StatBox 
                            title="התאמות פנימיות" 
                            count={localInternalMatches} 
                            icon={Link2} 
                            colorClass="border-purple-200 text-purple-800"
                        />
                        <StatBox 
                            title="התאמות חיצוניות" 
                            count={localExternalMatches} 
                            icon={Globe} 
                            colorClass="border-purple-200 text-purple-800"
                        />
                     </div>
                 </div>
             </div>
          </div>
      )}

      {/* CONFIG VAULT SECTION */}
      <div className="mt-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <FileText size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 text-lg">כספת הגדרות (גיבוי)</h3>
                      <p className="text-xs text-slate-500">שמור כאן את קוד ההגדרות לגיבוי מהיר.</p>
                  </div>
              </div>
              <div className="flex gap-2">
                <button 
                   onClick={() => setMemoConfig(PROJECT_CONFIG)}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors border border-slate-200"
                >
                    <Code2 size={14} /> אפס לפרויקט
                </button>
                <button 
                  onClick={copyMemo}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'הועתק!' : 'העתק ללוח'}
                </button>
              </div>
          </div>
          
          <textarea
              value={memoConfig}
              onChange={(e) => handleSaveMemo(e.target.value)}
              className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="הדבק כאן את קוד הקונפיגורציה שלך לשמירה קבועה..."
              dir="ltr"
          />
      </div>

    </div>
  );
};
