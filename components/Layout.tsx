
import React, { useState } from 'react';
import { AppView, User } from '../types';
import { LayoutDashboard, Users, Sparkles, UploadCloud, Menu, X, LogOut, Link2, Shield, ChevronLeft, UserCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  currentUser: User | null;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, currentUser, onChangeView, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If no user logged in (and view is login), render simple wrapper
  if (!currentUser || currentView === AppView.LOGIN) {
      return <div className="min-h-screen font-sans text-slate-800">{children}</div>;
  }

  const isGlobalView = currentView === AppView.ADMIN_DASHBOARD;

  // --- Navigation Item Component ---
  const NavItem = ({ view, icon: Icon, label, adminOnly, mobile = false }: { view: AppView; icon: any; label: string, adminOnly?: boolean, mobile?: boolean }) => {
    if (adminOnly && currentUser.role !== 'ADMIN') return null;
    
    const isActive = currentView === view;
    
    return (
      <button
        onClick={() => {
            onChangeView(view);
            if (mobile) setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
          ${isActive 
            ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 scale-[1.02]' 
            : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700 font-medium hover:shadow-sm'}
        `}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-teal-50' : 'text-slate-400 group-hover:text-teal-500 transition-colors'} />
        <span className="text-base tracking-wide">{label}</span>
        {isActive && <ChevronLeft size={16} className="mr-auto opacity-60" />}
      </button>
    );
  };

  // --- Sidebar Content (Shared between Desktop & Mobile) ---
  const SidebarContent = ({ mobile = false }) => (
      <div className="flex flex-col h-full">
          
          {/* 1. PROFILE SECTION (Moved to Top) */}
          <div className="p-6 border-b border-slate-100/60">
            <button 
                onClick={() => { onChangeView(AppView.PROFILE); if (mobile) setIsMobileMenuOpen(false); }}
                className={`w-full bg-gradient-to-br from-teal-50 to-white p-3 rounded-2xl border transition-all duration-300 group text-right shadow-sm hover:shadow-md
                    ${currentView === AppView.PROFILE ? 'border-teal-200 ring-2 ring-teal-100' : 'border-slate-100 hover:border-teal-100'}
                `}
            >
               <div className="flex items-center gap-3">
                 <img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm group-hover:scale-105 transition-transform" />
                 <div className="overflow-hidden flex-grow">
                   <p className="font-bold text-sm text-slate-900 truncate group-hover:text-teal-700 transition-colors">{currentUser.name}</p>
                   <p className="text-xs text-slate-500 flex items-center gap-1">
                      {currentUser.role === 'ADMIN' ? 'מנהל מערכת' : 'מגייס'}
                   </p>
                 </div>
                 <ChevronLeft size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
               </div>
            </button>
          </div>

          {/* 2. NAVIGATION (Flows immediately after) */}
          <nav className="flex-grow px-6 pt-4 space-y-2 overflow-y-auto custom-scrollbar">
            {currentUser.role === 'ADMIN' && (
                <NavItem view={AppView.ADMIN_DASHBOARD} icon={Shield} label="דשבורד ניהול" adminOnly mobile={mobile} />
            )}
            <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label={isGlobalView ? "מאגר משרות" : "לוח משרות"} mobile={mobile} />
            <NavItem view={AppView.CANDIDATES} icon={Users} label={isGlobalView ? "מאגר מועמדים" : "המועמדים שלי"} mobile={mobile} />
            
            <div className="text-[11px] font-bold text-slate-400 px-4 mb-2 mt-6 uppercase tracking-wider">כלים חכמים</div>
            <NavItem view={AppView.AI_TOOLS} icon={Sparkles} label="סוכן AI וג'נרטורים" mobile={mobile} />
            <NavItem view={AppView.INTEGRATIONS} icon={Link2} label="אינטגרציות" mobile={mobile} />
            
            <NavItem view={AppView.DATA_MANAGEMENT} icon={UploadCloud} label="הגדרות ונתונים" adminOnly mobile={mobile} />
          </nav>

          {/* 3. LOGOUT (Dedicated at Bottom) */}
          <div className="p-6 mt-auto border-t border-slate-100/60">
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-5 py-3 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all duration-300 group font-medium"
            >
               <LogOut size={20} className="group-hover:scale-110 transition-transform" />
               <span>התנתק מהמערכת</span>
            </button>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR (Glass Effect) --- */}
      {/* Changed border-r to border-l for RTL layout correctness */}
      <aside className="hidden md:flex w-80 flex-col h-full z-20 relative glass border-r-0 border-l border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <SidebarContent />
      </aside>

      {/* --- MOBILE HEADER & DRAWER --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center justify-between px-4 border-b border-white/20">
          <div className="font-bold text-xl flex items-center gap-2 text-slate-800">
             <div className="flex items-center gap-2">
                  <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm" />
                  <span className="text-sm font-bold">{currentUser.name}</span>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white/50 rounded-full text-teal-700">
              <Menu size={24} />
          </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute top-0 right-0 bottom-0 w-[85%] max-w-xs bg-teal-50/95 backdrop-blur-xl shadow-2xl animate-slide-in-right border-l border-white/50">
                <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 bg-white/50 rounded-full z-50">
                    <X size={20} />
                </button>
                <SidebarContent mobile={true} />
            </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 md:pb-12 scroll-smooth custom-scrollbar">
            <div className="max-w-8xl mx-auto">
                {children}
            </div>
        </div>

        {/* Mobile Bottom Nav (Floating Glass) */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 glass-dark bg-slate-900/90 text-slate-300 rounded-2xl px-6 py-4 flex justify-between items-center z-40 shadow-2xl shadow-teal-900/20 backdrop-blur-xl border border-white/10">
            <button onClick={() => onChangeView(AppView.DASHBOARD)} className={currentView === AppView.DASHBOARD ? 'text-teal-400' : 'hover:text-white'}><LayoutDashboard size={24}/></button>
            <button onClick={() => onChangeView(AppView.CANDIDATES)} className={currentView === AppView.CANDIDATES ? 'text-teal-400' : 'hover:text-white'}><Users size={24}/></button>
            <button onClick={() => onChangeView(AppView.AI_TOOLS)} className="bg-teal-500 text-white p-3 rounded-full -mt-12 shadow-lg shadow-teal-500/40 border-4 border-slate-900"><Sparkles size={24} fill="currentColor"/></button>
            <button onClick={() => onChangeView(AppView.PROFILE)} className={currentView === AppView.PROFILE ? 'text-teal-400' : 'hover:text-white'}><UserCircle size={24}/></button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="hover:text-white"><Menu size={24}/></button>
        </div>
      </main>

    </div>
  );
};
