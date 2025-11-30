import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldX } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // CRITICAL FIX: Safely handle error object creation to avoid "Converting circular structure to JSON"
    // We ensure we only copy primitive message/stack strings.
    let safeMessage = 'Unknown Error';
    let safeStack = undefined;

    try {
        safeMessage = error.message || String(error);
        safeStack = error.stack;
    } catch (e) {
        safeMessage = 'Circular or Malformed Error';
    }

    const safeError = new Error(safeMessage);
    if (safeStack) safeError.stack = safeStack;

    return { hasError: true, error: safeError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Safe logging that guarantees no crashes
    const msg = error?.message || 'Unknown error';
    console.error("Uncaught error (Safely Logged):", msg);
  }

  handleReset = () => {
    // Smart Reset: Preserve firebase config, but clear potential bad data
    const firebaseConfig = localStorage.getItem('firebase_config');
    const currentUser = localStorage.getItem('current_user');
    const firebaseRaw = localStorage.getItem('firebase_raw_config');
    const memo = localStorage.getItem('firebase_config_memo');
    
    // Clear everything to be safe
    localStorage.clear();
    
    // Restore critical configs so user doesn't have to login/connect again
    if (firebaseConfig) localStorage.setItem('firebase_config', firebaseConfig);
    if (currentUser) localStorage.setItem('current_user', currentUser);
    if (firebaseRaw) localStorage.setItem('firebase_raw_config', firebaseRaw);
    if (memo) localStorage.setItem('firebase_config_memo', memo);

    // Reload
    window.location.reload();
  };

  handleHardReset = () => {
    // Nuclear option: Clear everything
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center font-sans" dir="rtl">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">אופס, קרתה שגיאה...</h1>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                המערכת נתקלה בבעיה לא צפויה.
                <br/>
                הנתונים שלך בטוחים, אך עלינו לרענן את התצוגה.
            </p>
            
            {this.state.error && (
                <div className="bg-slate-100 p-3 rounded-lg mb-6 text-left dir-ltr overflow-auto max-h-24 border border-slate-200">
                   <code className="text-xs text-slate-600 break-all">{this.state.error.message}</code>
                </div>
            )}

            <div className="space-y-3">
                <button 
                  onClick={this.handleReset}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                >
                  <RefreshCw size={18} />
                  רענן מערכת (שמור חיבור)
                </button>
                
                <button 
                  onClick={this.handleHardReset}
                  className="w-full bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldX size={18} />
                  איפוס מלא (התנתק)
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}