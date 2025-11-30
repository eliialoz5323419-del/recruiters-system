
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Sparkles, ArrowRight, User as UserIcon, Mail, Dices, Shield, Loader2 } from 'lucide-react';
import { authenticateUser } from '../services/dataService';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const performLogin = async (userName: string, userEmail: string, role: UserRole) => {
    setLoading(true);
    try {
      // AuthenticateUser handles saving to DB/LocalStorage
      const user = await authenticateUser(userName, userEmail, role);
      
      // Save to local storage for session persistence - SAFELY
      try {
        localStorage.setItem('current_user', JSON.stringify(user));
      } catch (storageErr) {
        console.warn("Failed to save session to local storage:", storageErr);
      }
      
      onLogin(user);
    } catch (err) {
      console.error("Login error", err);
      alert("אירעה שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    // Determine role based on name input
    const lowerName = name.toLowerCase();
    const role: UserRole = (lowerName.includes('admin') || lowerName.includes('מנהל')) 
      ? 'ADMIN' 
      : 'RECRUITER';

    performLogin(name, email, role);
  };

  const handleDemoLogin = () => {
      // Static credentials for Demo Recruiter - Ensures data persistence across reloads!
      const demoName = "מגייס להדגמה";
      const demoEmail = "recruiter@demo.com";
      
      performLogin(demoName, demoEmail, 'RECRUITER');
  };

  const handleQuickAdminLogin = () => {
      // Static credentials for Admin so it's always the same user
      const adminName = "מנהל מערכת";
      const adminEmail = "admin@system.com";
      
      performLogin(adminName, adminEmail, 'ADMIN');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      {/* Background Gradient - Teal */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50"></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 relative z-10">
        
        {/* Header / Branding */}
        <div className="bg-teal-600 p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-600 opacity-90"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-lg mb-4">
              <Sparkles size={32} fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black text-white mb-1">המגייסים</h1>
            <p className="text-teal-50 text-sm font-medium">מערכת גיוס חכמה לארגונים</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-10">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-800">כניסה למערכת</h2>
            <p className="text-slate-500 text-sm">הזן פרטים או היכנס עם משתמש קבוע</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">שם מלא</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: ישראל ישראלי"
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-medium transition-all focus:bg-white"
                />
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2 text-slate-400">
                   <UserIcon size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">כתובת מייל</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-medium transition-all focus:bg-white"
                />
                <div className="absolute top-1/2 right-3 transform -translate-y-1/2 text-slate-400">
                   <Mail size={18} />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !name.trim() || !email.trim()}
              className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg shadow-teal-200 flex items-center justify-center gap-2 transition-all mt-4
                ${loading || !name.trim() || !email.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:scale-[1.02]'}
              `}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  כניסה <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-xs font-bold text-slate-400 uppercase mb-3">
                חשבונות לבדיקה (מידע נשמר)
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-teal-50 hover:text-teal-600 border border-slate-100 text-slate-600 font-bold transition-colors flex flex-col items-center justify-center gap-2 group text-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin text-slate-400"/> : <Dices size={20} className="text-slate-400 group-hover:text-teal-500" />}
                  מגייס (משתמש דמו)
                </button>
                
                 <button 
                  type="button"
                  onClick={handleQuickAdminLogin}
                  disabled={loading}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-600 border border-slate-100 text-slate-600 font-bold transition-colors flex flex-col items-center justify-center gap-2 group text-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin text-slate-400"/> : <Shield size={20} className="text-slate-400 group-hover:text-purple-600" />}
                  מנהל (משתמש קבוע)
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
