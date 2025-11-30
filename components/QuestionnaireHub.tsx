

import React, { useState, useEffect } from 'react';
import { Candidate, Questionnaire, Job } from '../types';
import { generateQuestionnaireSet, generateTailoredQuestionnaires, generateSingleQuestionnaire, analyzeInterviewAnswers } from '../services/geminiService';
import { ArrowRight, Bot, CheckCircle, Share2, ClipboardList, Plus, Save, Send, Loader2, PlayCircle, LayoutGrid, X, FileSearch, TrendingUp, ThumbsUp, ThumbsDown, Award } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { getDb } from '../services/firebaseClient';

interface QuestionnaireHubProps {
  candidate: Candidate;
  job?: Job; // Optional: Needed for context-aware generation
  isRecruiterView: boolean;
  onBack?: () => void;
  onUpdateCandidate?: (id: string, data: Partial<Candidate>) => void;
}

interface AnalysisResult {
    finalScore: number;
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
}

export const QuestionnaireHub: React.FC<QuestionnaireHubProps> = ({ candidate, job, isRecruiterView, onBack, onUpdateCandidate }) => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(candidate.questionnaireSet || []);
  const [activeQ, setActiveQ] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  
  // "Add New" Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // State for answering (Candidate Mode)
  const [answers, setAnswers] = useState<Record<string, string>>({}); 

  // --- AUTOMATIC GENERATION ON ENTRY ---
  useEffect(() => {
    // If we have no questionnaires, but we have a JOB and we are in recruiter view,
    // trigger the automatic "Gap Analysis" generation immediately.
    // Ensure we don't trigger if already generating.
    if (isRecruiterView && questionnaires.length === 0 && job && !isGenerating) {
        triggerAutoGeneration();
    }
  }, [isRecruiterView, questionnaires.length, job]);

  useEffect(() => {
      // Sync local state if candidate updates from props
      if (candidate.questionnaireSet) {
          // SAFETY: Map to ensure structure validity before setting state
          const safeSet = candidate.questionnaireSet.map(q => ({
              ...q,
              questions: Array.isArray(q.questions) ? q.questions : []
          }));
          setQuestionnaires(safeSet);
          
          // Rehydrate answers if we had them stored
          const flatAnswers: Record<string, string> = {};
          safeSet.forEach(q => {
              if (Array.isArray(q.questions)) {
                q.questions.forEach(qs => {
                    if(qs.answer) flatAnswers[`${q.id}_${qs.id}`] = qs.answer;
                });
              }
          });
          setAnswers(flatAnswers);
      }
  }, [candidate]);

  const triggerAutoGeneration = async () => {
      if (!job) return;
      setIsGenerating(true);
      try {
          const generated = await generateTailoredQuestionnaires(job.description, candidate.resumeText);
          
          if (!generated || !Array.isArray(generated) || generated.length === 0) {
              console.error("Generated data is invalid or empty:", generated);
              setIsGenerating(false);
              return;
          }

          // Add IDs safely
          const processed = generated.map((q: any, i: number) => ({
              ...q,
              id: `q_${Date.now()}_${i}`,
              // SAFETY CHECK: Ensure q.questions exists and is an array
              questions: (q && Array.isArray(q.questions)) 
                 ? q.questions.map((qs: any, j: number) => ({ ...qs, id: `qs_${i}_${j}` })) 
                 : [],
              isCompleted: false
          }));
          
          setQuestionnaires(processed);
          
          if (onUpdateCandidate) {
              onUpdateCandidate(candidate.id, { questionnaireSet: processed, questionnaireStatus: 'NOT_SENT' });
          }
      } catch (e) {
          console.error("Auto generation failed", e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleManualRegenerate = async () => {
      setLoading(true);
      try {
          // Fallback to generic set if no job, or tailored if job exists
          let generated = [];
          if (job) {
             generated = await generateTailoredQuestionnaires(job.description, candidate.resumeText);
          } else {
             generated = await generateQuestionnaireSet(candidate.title, candidate.name);
          }

          if (!generated || !Array.isArray(generated) || generated.length === 0) {
             alert("שגיאה ביצירת התוכן. נסה שוב.");
             setLoading(false);
             return;
          }

          const processed = generated.map((q: any, i: number) => ({
              ...q,
              id: `q_${Date.now()}_${i}`,
              questions: Array.isArray(q.questions) 
                  ? q.questions.map((qs: any, j: number) => ({ ...qs, id: `qs_${i}_${j}` })) 
                  : [],
              isCompleted: false
          }));
          
          setQuestionnaires(processed);
          if (onUpdateCandidate) {
              onUpdateCandidate(candidate.id, { questionnaireSet: processed, questionnaireStatus: 'NOT_SENT' });
          }
      } catch (e) {
          alert("שגיאה ביצירת שאלונים.");
      } finally {
          setLoading(false);
      }
  };

  const handleAddNewQuestionnaire = async () => {
      if (!newTopic.trim()) return;
      setAddingLoading(true);
      try {
          const jobTitle = job ? job.title : candidate.title;
          const newQ = await generateSingleQuestionnaire(newTopic, jobTitle);
          
          if (newQ && Array.isArray(newQ.questions)) {
              const processedQ = {
                  ...newQ,
                  id: `q_adhoc_${Date.now()}`,
                  questions: newQ.questions.map((qs: any, j: number) => ({ ...qs, id: `qs_adhoc_${j}` })),
                  isCompleted: false
              };
              
              const updatedSet = [...questionnaires, processedQ];
              setQuestionnaires(updatedSet);
              
              if (onUpdateCandidate) {
                  onUpdateCandidate(candidate.id, { questionnaireSet: updatedSet });
              }
              setShowAddModal(false);
              setNewTopic('');
          } else {
              alert("לא הצלחתי לייצר שאלון תקין. נסה לנסח את הנושא אחרת.");
          }
      } catch (e) {
          console.error(e);
          alert("שגיאה ביצירת שאלון.");
      } finally {
          setAddingLoading(false);
      }
  };

  const handleAnalyzeAnswers = async () => {
      if (!job) {
          alert("לא ניתן לנתח ללא הקשר למשרה. וודא שפתחת את השאלון דרך משרה ספציפית.");
          return;
      }
      setIsAnalyzing(true);
      try {
          const result = await analyzeInterviewAnswers(job.description, questionnaires);
          if (result) {
              setAnalysisResult(result);
              setShowAnalysisModal(true);
          } else {
              alert("ניתוח התשובות נכשל. נסה שוב.");
          }
      } catch (e) {
          console.error(e);
          alert("שגיאה בניתוח.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleShare = () => {
      const link = `${window.location.origin}?view=candidate&cid=${candidate.id}`;
      navigator.clipboard.writeText(link);
      setShareLink(link);
      if (onUpdateCandidate) {
          onUpdateCandidate(candidate.id, { questionnaireStatus: 'SENT' });
      }
      setTimeout(() => setShareLink(''), 3000);
  };

  const handleAnswerChange = (qId: string, qsId: string, val: string) => {
      setAnswers(prev => ({ ...prev, [`${qId}_${qsId}`]: val }));
  };

  const saveAnswers = async () => {
      if (!activeQ) return;
      const updatedQs = questionnaires.map(q => {
          if (q.id === activeQ.id) {
              const updatedQuestions = (q.questions || []).map(qs => ({
                  ...qs,
                  answer: answers[`${q.id}_${qs.id}`] || ''
              }));
              const isComplete = updatedQuestions.every(qs => !!qs.answer);
              return { ...q, questions: updatedQuestions, isCompleted: isComplete };
          }
          return q;
      });

      setQuestionnaires(updatedQs);
      
      if (!isRecruiterView) {
          const db = getDb();
          if (db) {
              await updateDoc(doc(db, 'candidates', candidate.id), { questionnaireSet: updatedQs });
          }
      } else if (onUpdateCandidate) {
          onUpdateCandidate(candidate.id, { questionnaireSet: updatedQs });
      }
      setActiveQ(null);
  };

  const submitAll = async () => {
      if (!window.confirm("האם אתה בטוח שברצונך לשלוח את כל התשובות למגייס?")) return;
      const db = getDb();
      if (db) {
          await updateDoc(doc(db, 'candidates', candidate.id), { questionnaireStatus: 'COMPLETED' });
          alert("התשובות נשלחו בהצלחה!");
          if (onBack) onBack();
      }
  };

  // --- RENDER HELPERS ---

  if (activeQ) {
      return (
          <div className="min-h-screen bg-white md:rounded-[2.5rem] p-8 animate-fade-in relative flex flex-col">
              <button onClick={() => setActiveQ(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600">
                  <ArrowRight size={24} />
              </button>
              
              <div className="max-w-2xl mx-auto w-full">
                  <div className="text-center mb-8">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${activeQ.type === 'PROFESSIONAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                          {activeQ.type === 'PROFESSIONAL' ? 'שאלון מקצועי' : 'שאלון אישיות'}
                      </span>
                      <h2 className="text-3xl font-black text-slate-900">{activeQ.title}</h2>
                      <p className="text-slate-500 mt-2">{activeQ.description}</p>
                  </div>

                  <div className="space-y-8">
                      {/* SAFETY: Default to empty array if undefined */}
                      {(activeQ.questions || []).map((qs, i) => (
                          <div key={qs.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                              <label className="block text-slate-900 font-bold mb-3 text-lg flex gap-2">
                                  <span className="text-teal-500">{i + 1}.</span> {qs.text}
                              </label>
                              {qs.type === 'text' && (
                                  <textarea 
                                      className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-700 bg-white"
                                      placeholder="הכנס את התשובה שלך כאן..."
                                      value={answers[`${activeQ.id}_${qs.id}`] || qs.answer || ''}
                                      onChange={(e) => handleAnswerChange(activeQ.id, qs.id, e.target.value)}
                                      readOnly={isRecruiterView}
                                  />
                              )}
                              {qs.type === 'boolean' && (
                                  <div className="flex gap-4">
                                      {['כן', 'לא'].map(opt => (
                                          <button
                                              key={opt}
                                              onClick={() => !isRecruiterView && handleAnswerChange(activeQ.id, qs.id, opt)}
                                              className={`flex-1 py-3 rounded-xl border font-bold transition-all ${
                                                  (answers[`${activeQ.id}_${qs.id}`] || qs.answer) === opt
                                                  ? 'bg-teal-600 text-white border-teal-600'
                                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                              }`}
                                          >
                                              {opt}
                                          </button>
                                      ))}
                                  </div>
                              )}
                              {qs.type === 'rating' && (
                                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
                                      {[1, 2, 3, 4, 5].map(num => (
                                          <button
                                              key={num}
                                              onClick={() => !isRecruiterView && handleAnswerChange(activeQ.id, qs.id, String(num))}
                                              className={`w-10 h-10 rounded-lg font-bold transition-all flex items-center justify-center ${
                                                  (answers[`${activeQ.id}_${qs.id}`] || qs.answer) === String(num)
                                                  ? 'bg-teal-500 text-white shadow-lg scale-110'
                                                  : 'text-slate-400 hover:bg-slate-50'
                                              }`}
                                          >
                                              {num}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

                  <div className="mt-8 flex justify-center">
                      <button 
                          onClick={saveAnswers}
                          disabled={isRecruiterView}
                          className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isRecruiterView ? 'מצב צפייה בלבד' : 'שמור תשובות'}
                          <CheckCircle size={20} />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- LOADING STATE (INITIAL AUTO-GEN) ---
  if (isGenerating) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center p-8">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
                  <Bot size={40} className="text-indigo-600 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">המערכת מנתחת פערים...</h2>
              <p className="text-slate-500 max-w-md">
                 אני סורק כעת את קורות החיים מול דרישות המשרה כדי ליצור שאלונים מותאמים אישית (טכניים ואישיותיים) לבדיקת התאמה.
              </p>
          </div>
      );
  }

  return (
    <div className={`space-y-8 pb-20 animate-fade-in ${!isRecruiterView ? 'p-6 max-w-7xl mx-auto' : ''}`}>
         {/* HEADER */}
         <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                 {isRecruiterView && onBack && (
                     <button onClick={onBack} className="p-3 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                         <ArrowRight size={20} />
                     </button>
                 )}
                 <div>
                     <h2 className="text-3xl font-black text-slate-900 mb-1 flex items-center gap-3">
                        <LayoutGrid size={28} className="text-teal-600"/> 
                        מרכז שאלונים
                     </h2>
                     <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                         {isRecruiterView 
                             ? `שאלונים שנוצרו אוטומטית עבור ${candidate.name}`
                             : 'אנא ענה על כל השאלונים ברשימה'
                         }
                     </p>
                 </div>
             </div>

             {isRecruiterView ? (
                 <div className="flex gap-3">
                     {/* Analyze Button */}
                     {questionnaires.some(q => q.isCompleted) && (
                         <button 
                             onClick={handleAnalyzeAnswers}
                             disabled={isAnalyzing}
                             className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-indigo-200"
                         >
                             {isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <FileSearch size={18}/>}
                             {isAnalyzing ? 'מנתח תשובות...' : 'נתח תשובות (AI)'}
                         </button>
                     )}

                     <button 
                         onClick={handleManualRegenerate}
                         disabled={loading}
                         className="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                     >
                         {loading ? <Loader2 size={18} className="animate-spin"/> : <Bot size={18}/>}
                         צור סט מחדש
                     </button>
                     <button 
                         onClick={handleShare}
                         className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                     >
                         {shareLink ? <CheckCircle size={18}/> : <Share2 size={18}/>}
                         {shareLink ? 'קישור הועתק!' : 'שלח קישור למועמד'}
                     </button>
                 </div>
             ) : (
                 <div className="flex items-center gap-3">
                     <div className="text-right">
                         <div className="text-xs font-bold text-slate-400 uppercase">הושלמו</div>
                         <div className="text-xl font-black text-teal-600">
                             {questionnaires.filter(q => q.isCompleted).length} / {questionnaires.length}
                         </div>
                     </div>
                 </div>
             )}
         </div>

         {/* GRID */}
         {questionnaires.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                 <ClipboardList size={48} className="text-slate-300 mb-4" />
                 <p className="text-slate-500 font-bold">לא נוצרו שאלונים</p>
                 {isRecruiterView && <button onClick={handleManualRegenerate} className="text-teal-600 font-bold mt-2">לחץ כאן ליצירה</button>}
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                 {questionnaires.map((q, idx) => (
                     <div 
                         key={q.id}
                         onClick={() => setActiveQ(q)}
                         className={`relative rounded-[2rem] p-6 min-h-[280px] flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-2 hover:shadow-xl border border-white/20 overflow-hidden group
                            ${q.isCompleted 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-white border-slate-100 shadow-sm text-slate-800 hover:border-teal-200'}
                         `}
                     >
                         {/* Status Icon */}
                         <div className="absolute top-4 right-4">
                             {q.isCompleted ? (
                                 <div className="bg-white/20 backdrop-blur p-2 rounded-full text-white"><CheckCircle size={20}/></div>
                             ) : (
                                 <div className="bg-slate-100 p-2 rounded-full text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors"><PlayCircle size={20}/></div>
                             )}
                         </div>

                         <div className="mt-8">
                             <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${q.isCompleted ? 'text-emerald-100' : 'text-slate-400'}`}>
                                 {q.type === 'PROFESSIONAL' ? 'מקצועי' : 'כללי'}
                             </div>
                             <h3 className="text-xl font-black leading-tight mb-3 line-clamp-2">{q.title}</h3>
                             <p className={`text-xs leading-relaxed line-clamp-3 ${q.isCompleted ? 'text-emerald-50' : 'text-slate-500'}`}>
                                 {q.description}
                             </p>
                         </div>

                         <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                             <span className={`text-xs font-bold ${q.isCompleted ? 'text-white/80' : 'text-slate-400'}`}>
                                 {/* SAFETY: Check length only if questions is an array */}
                                 {Array.isArray(q.questions) ? q.questions.length : 0} שאלות
                             </span>
                             <div className={`p-2 rounded-full ${q.isCompleted ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-teal-500 group-hover:text-white'} transition-all`}>
                                 <ArrowRight size={14} />
                             </div>
                         </div>
                     </div>
                 ))}
                 
                 {/* ADD NEW CARD (Ghost Card) */}
                 {isRecruiterView && (
                     <button
                        onClick={() => setShowAddModal(true)}
                        className="rounded-[2rem] p-6 min-h-[280px] flex flex-col justify-center items-center cursor-pointer transition-all hover:-translate-y-2 border-2 border-dashed border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50"
                     >
                         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-white shadow-sm">
                             <Plus size={32} />
                         </div>
                         <h3 className="font-bold text-lg">הוסף שאלון</h3>
                         <p className="text-xs text-center mt-2 max-w-[150px]">
                             צור שאלון חדש בנושא ספציפי באמצעות AI
                         </p>
                     </button>
                 )}
             </div>
         )}

         {/* ADD NEW MODAL */}
         {showAddModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                 <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md animate-scale-up relative">
                     <button 
                        onClick={() => setShowAddModal(false)}
                        className="absolute top-4 right-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"
                     >
                         <X size={20} />
                     </button>
                     
                     <div className="text-center mb-6">
                         <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                             <Bot size={28} />
                         </div>
                         <h3 className="text-2xl font-black text-slate-900">יצירת שאלון חדש</h3>
                         <p className="text-slate-500 text-sm mt-1">
                             כתוב את הנושא, וה-AI ינסח 5 שאלות רלוונטיות.
                         </p>
                     </div>

                     <div className="space-y-4">
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">נושא השאלון</label>
                             <input 
                                type="text" 
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                placeholder="לדוגמה: ידע ב-React Hooks, תפקוד תחת לחץ..."
                                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                             />
                         </div>
                         <button 
                            onClick={handleAddNewQuestionnaire}
                            disabled={!newTopic.trim() || addingLoading}
                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                         >
                             {addingLoading ? <Loader2 size={20} className="animate-spin" /> : <Bot size={20} />}
                             {addingLoading ? 'יוצר שאלון...' : 'צור והוסף לרשימה'}
                         </button>
                     </div>
                 </div>
             </div>
         )}

         {/* ANALYSIS RESULTS MODAL */}
         {showAnalysisModal && analysisResult && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl animate-scale-up relative overflow-hidden flex flex-col max-h-[90vh]">
                     
                     {/* Header */}
                     <div className="bg-slate-900 p-8 text-white relative shrink-0">
                         <button 
                            onClick={() => setShowAnalysisModal(false)}
                            className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
                         >
                             <X size={20} />
                         </button>
                         
                         <div className="flex items-center gap-6">
                             {/* Score Gauge */}
                             <div className="relative w-24 h-24 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                     <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                                     <circle 
                                        cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                        className={`${analysisResult.finalScore >= 80 ? 'text-emerald-500' : analysisResult.finalScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                                        strokeDasharray={44 * 2 * Math.PI}
                                        strokeDashoffset={44 * 2 * Math.PI - (analysisResult.finalScore / 100) * (44 * 2 * Math.PI)}
                                        strokeLinecap="round"
                                     />
                                 </svg>
                                 <span className="absolute text-2xl font-black">{analysisResult.finalScore}</span>
                             </div>

                             <div>
                                 <h2 className="text-2xl font-bold mb-1">ניתוח ראיון דיגיטלי</h2>
                                 <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium">
                                     <Award size={16} />
                                     המלצת מערכת: <span className="text-white font-bold">{analysisResult.recommendation}</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Content */}
                     <div className="p-8 overflow-y-auto custom-scrollbar">
                         <div className="mb-8">
                             <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                 <TrendingUp size={20} className="text-indigo-500"/>
                                 סיכום ביצועים
                             </h4>
                             <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                                 {analysisResult.summary}
                             </p>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                 <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                                     <ThumbsUp size={18}/> חוזקות
                                 </h4>
                                 <ul className="space-y-2">
                                     {analysisResult.strengths.map((s, i) => (
                                         <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                             <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0"/>
                                             {s}
                                         </li>
                                     ))}
                                 </ul>
                             </div>

                             <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                                 <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                                     <ThumbsDown size={18}/> נקודות לתשומת לב
                                 </h4>
                                 <ul className="space-y-2">
                                     {analysisResult.concerns.map((s, i) => (
                                         <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                             <div className="w-3.5 h-3.5 rounded-full bg-red-200 flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-bold text-red-700">!</div>
                                             {s}
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         </div>
                     </div>

                 </div>
             </div>
         )}

         {/* CANDIDATE SUBMIT BUTTON */}
         {!isRecruiterView && questionnaires.length > 0 && (
             <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-center z-50">
                 <button 
                     onClick={submitAll}
                     disabled={!questionnaires.every(q => q.isCompleted)}
                     className="px-12 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-teal-200 hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-50 disabled:grayscale"
                 >
                     <Send size={24} />
                     שלח הכל למגייס
                 </button>
             </div>
         )}
    </div>
  );
};
