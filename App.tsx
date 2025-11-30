
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginView } from './components/LoginView';
import { Dashboard } from './components/Dashboard';
import { CandidatesList } from './components/CandidatesList';
import { MatchingView } from './components/MatchingView';
import { AITools } from './components/AITools';
import { DataManagement } from './components/DataManagement';
import { IntegrationsView } from './components/IntegrationsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileView } from './components/ProfileView';
import { QuestionnaireHub } from './components/QuestionnaireHub';

import { AppView, Job, Candidate, GeneratorState, ToolType, MatchResult, User } from './types';
import { createJob, createCandidate, deleteJob, deleteCandidate, deleteRecruiter } from './services/dataService';
import { getDb } from './services/firebaseClient'; 
import { onSnapshot, collection, query, doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';

const DEFAULT_GEN_STATE: Omit<GeneratorState, 'activeTool'> = {
  input: '',
  chatHistory: [],
  generatedData: null,
  headerImage: null,
  uploadedFile: null,
  isLoading: false
};

function App() {
  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  
  // Live Data from Firestore
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  
  const [dbConnected, setDbConnected] = useState(false);
  
  // External Candidate View State
  const [externalCandidate, setExternalCandidate] = useState<Candidate | null>(null);
  const [loadingExternal, setLoadingExternal] = useState(false);
  
  // Generator States
  const [resumeState, setResumeState] = useState<GeneratorState>({ ...DEFAULT_GEN_STATE, activeTool: ToolType.RESUME_GENERATOR });
  const [jobAdState, setJobAdState] = useState<GeneratorState>({ ...DEFAULT_GEN_STATE, activeTool: ToolType.AD_GENERATOR });
  
  // UI State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // 1. INITIALIZE & LOAD USER
  useEffect(() => {
      const db = getDb();
      setDbConnected(!!db);

      // CHECK FOR EXTERNAL CANDIDATE LINK (?view=candidate&cid=...)
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const cidParam = params.get('cid');

      if (viewParam === 'candidate' && cidParam && db) {
          setLoadingExternal(true);
          getDoc(doc(db, 'candidates', cidParam)).then(snap => {
              if (snap.exists()) {
                  setExternalCandidate({ id: snap.id, ...snap.data() } as Candidate);
                  setCurrentView(AppView.QUESTIONNAIRE_HUB);
              } else {
                  alert("מועמד לא נמצא או שהקישור פג תוקף");
                  window.location.search = ''; // Reset
              }
              setLoadingExternal(false);
          }).catch(e => {
              console.error(e);
              setLoadingExternal(false);
          });
          return; // Skip normal login flow
      }

      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            setCurrentUser(u);
            if (currentView === AppView.LOGIN) {
                setCurrentView(u.role === 'ADMIN' ? AppView.ADMIN_DASHBOARD : AppView.DASHBOARD);
            }
          } catch(e) {}
      }
  }, []);

  // 2. REAL-TIME LISTENERS
  useEffect(() => {
      if (!dbConnected || !currentUser) return;
      
      const db = getDb();
      if (!db) return;

      const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job));
          setJobs(loaded);
      });

      const unsubCand = onSnapshot(collection(db, 'candidates'), (snapshot) => {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
          setCandidates(loaded);
      });

      const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchResult));
          setMatches(loaded);
      });

      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          setRecruiters(loaded);
      });

      return () => {
          unsubJobs();
          unsubCand();
          unsubMatches();
          unsubUsers();
      };
  }, [dbConnected, currentUser]);


  // --- FILTERING LOGIC ---
  const visibleJobs = currentUser?.role === 'ADMIN' 
      ? jobs 
      : jobs.filter(j => j.recruiterId === currentUser?.id);

  const visibleCandidates = currentUser?.role === 'ADMIN'
      ? candidates
      : candidates.filter(c => c.recruiterId === currentUser?.id);
      
  const groupedMatches: Record<string, MatchResult[]> = {};
  matches.forEach(m => {
      if (!groupedMatches[m.jobId]) groupedMatches[m.jobId] = [];
      groupedMatches[m.jobId].push(m);
  });

  const internalMatchesCount = matches.filter(m => m.jobRecruiterId === m.candidateRecruiterId).length;
  const externalMatchesCount = matches.filter(m => m.jobRecruiterId !== m.candidateRecruiterId).length;

  // Profile Stats
  const profileStats = {
      totalJobs: visibleJobs.length,
      totalCandidates: visibleCandidates.length,
      activeMatches: matches.filter(m => (m.jobRecruiterId === currentUser?.id || m.candidateRecruiterId === currentUser?.id) && m.score > 80).length,
      filledJobs: visibleJobs.filter(j => j.status === 'FILLED').length
  };


  // --- HANDLERS ---
  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setCurrentView(user.role === 'ADMIN' ? AppView.ADMIN_DASHBOARD : AppView.DASHBOARD);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('current_user');
      setCurrentView(AppView.LOGIN);
  };

  const onAddJob = async (job: Job) => {
      if (currentUser) {
          await createJob({ ...job, recruiterId: currentUser.id });
          if (!dbConnected) {
             setJobs(prev => [...prev, job]);
          }
      }
  };

  const onAddCandidate = async (cand: Candidate) => {
      if (currentUser) {
          await createCandidate({ ...cand, recruiterId: currentUser.id });
          if (!dbConnected) {
             setCandidates(prev => [...prev, cand]);
          }
      }
  };

  // --- RENDER ---
  
  // EXTERNAL CANDIDATE VIEW (No Layout/Login)
  if (externalCandidate) {
      return (
          <div className="min-h-screen bg-slate-50 font-sans text-slate-800" dir="rtl">
              <QuestionnaireHub 
                  candidate={externalCandidate}
                  isRecruiterView={false}
              />
          </div>
      );
  }
  
  if (loadingExternal) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-teal-500" size={40}/></div>;
  }

  if (!currentUser || currentView === AppView.LOGIN) {
      return <LoginView onLogin={handleLogin} />;
  }

  const renderContent = () => {
      if (currentView === AppView.DATA_MANAGEMENT) {
          if (currentUser.role !== 'ADMIN') {
               return (
                  <Dashboard 
                      jobs={visibleJobs}
                      candidates={visibleCandidates}
                      onSelectJob={(j) => { setSelectedJob(j); setCurrentView(AppView.MATCHING); }}
                      onDeleteJob={deleteJob}
                  />
              );
          }
          return (
            <DataManagement 
                currentUser={currentUser} 
                localJobsCount={jobs.length} 
                localCandidatesCount={candidates.length} 
                localUsersCount={recruiters.length}
                localInternalMatches={internalMatchesCount}
                localExternalMatches={externalMatchesCount}
            />
          );
      }

      switch (currentView) {
          case AppView.ADMIN_DASHBOARD:
              return (
                  <AdminDashboard 
                      allJobs={jobs}
                      allCandidates={candidates}
                      recruiters={recruiters}
                      jobMatches={groupedMatches}
                      onViewGlobalJobs={() => setCurrentView(AppView.DASHBOARD)}
                      onViewGlobalCandidates={() => setCurrentView(AppView.CANDIDATES)}
                      onDeleteRecruiter={deleteRecruiter}
                  />
              );
          case AppView.DASHBOARD:
              return (
                  <Dashboard 
                      jobs={visibleJobs}
                      candidates={visibleCandidates}
                      onSelectJob={(j) => { setSelectedJob(j); setCurrentView(AppView.MATCHING); }}
                      onDeleteJob={deleteJob}
                  />
              );
          case AppView.CANDIDATES:
              return (
                  <CandidatesList 
                      candidates={visibleCandidates}
                      onDeleteCandidate={deleteCandidate}
                  />
              );
          case AppView.MATCHING:
              if (!selectedJob) return <Dashboard jobs={visibleJobs} candidates={visibleCandidates} onSelectJob={setSelectedJob} onDeleteJob={deleteJob} />;
              return (
                  <MatchingView 
                      job={selectedJob}
                      candidates={candidates} 
                      existingMatches={groupedMatches[selectedJob.id] || []}
                      onSaveMatches={() => {}} 
                      onBack={() => setCurrentView(AppView.DASHBOARD)}
                      recruiters={recruiters}
                  />
              );
          case AppView.AI_TOOLS:
              return (
                  <AITools 
                      onAddCandidate={onAddCandidate}
                      onAddJob={onAddJob}
                      resumeState={resumeState}
                      setResumeState={setResumeState}
                      jobAdState={jobAdState}
                      setJobAdState={setJobAdState}
                  />
              );
          case AppView.INTEGRATIONS:
              return <IntegrationsView />;
          case AppView.PROFILE:
              return (
                  <ProfileView 
                      user={currentUser}
                      stats={profileStats}
                      onLogout={handleLogout}
                  />
              );
          default:
              return <div>View Not Found</div>;
      }
  };

  return (
    <Layout currentView={currentView} currentUser={currentUser} onChangeView={setCurrentView} onLogout={handleLogout}>
        {renderContent()}
    </Layout>
  );
}

export default App;
