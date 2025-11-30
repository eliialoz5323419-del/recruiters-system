







import React, { useState, useRef, useEffect } from 'react';
import { ToolType, Candidate, Job, GeneratorState, ChatMessage } from '../types';
import { generateResumeJSON, generateJobAdJSON, extractJobFromImage, generateVisualBackground, generateSocialMediaAsset, refineResumeJSON, refineJobAdJSON, generateGenericContent, generateQuestionnaireSet, extractGenericText, analyzeRawMatch, analyzeDualMatch } from '../services/geminiService';
import { Search, ArrowRight, Sparkles, Linkedin, Mail, DollarSign, ArrowUp, Loader2, CheckCircle, ChevronRight, PenTool, Upload, Briefcase, FileText, UserCheck, MessageSquare, Megaphone, Info, X, Video, ShieldCheck, Microscope, Binary, CalendarClock, LayoutTemplate, Image as ImageIcon, Download, Share2, Home, Cpu, Heart, TrendingUp, Palette, FolderOpen, MapPin, Phone, ListChecks, Send, Wifi, Battery, Eye, Maximize2, Layout, Facebook, Instagram, Monitor, MousePointerClick, ClipboardList, ScanText, FileInput, UserPlus, Copy, Check } from 'lucide-react';
import { AIModelSelector } from './AIModelSelector';

interface AIToolsProps {
  onAddCandidate: (candidate: Candidate) => Promise<void>;
  onAddJob: (job: Job) => Promise<void>;
  resumeState: GeneratorState;
  setResumeState: React.Dispatch<React.SetStateAction<GeneratorState>>;
  jobAdState: GeneratorState;
  setJobAdState: React.Dispatch<React.SetStateAction<GeneratorState>>;
}

type SubMode = 'SELECTION' | 'UPLOAD' | 'CREATE';
type AdLayout = 'classic' | 'side' | 'bottom' | 'middle' | 'story';

// --- PROMPT TEMPLATES (ADVERTISING FORMATS) ---
const PROMPT_FOLDERS = [
    {
        id: 'story_mobile',
        title: 'Story',
        subtitle: 'סטורי',
        layout: 'story' as AdLayout,
        icon: Instagram,
        image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop', 
        prompt: `צור מודעת דרושים בסגנון "Instagram Story". תמונה עליונה גדולה (Top Header), וכל הטקסט מתחתיה.`
    },
    {
        id: 'fb_feed',
        title: 'Feed',
        subtitle: 'פיד קלאסי',
        layout: 'classic' as AdLayout,
        icon: Facebook,
        image: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?q=80&w=800&auto=format&fit=crop', 
        prompt: `צור מודעת דרושים בסגנון "Facebook Feed Post". טקסט שיווקי למעלה, תמונה באמצע, וכפתור למטה.`
    },
    {
        id: 'linkedin_banner',
        title: 'Banner',
        subtitle: 'באנר רוחבי',
        layout: 'side' as AdLayout,
        icon: Linkedin,
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop', 
        prompt: `צור מודעת דרושים בסגנון "LinkedIn Wide Banner". תמונה בצד אחד, טקסט בצד השני.`
    },
    {
        id: 'ig_impact',
        title: 'Impact',
        subtitle: 'ויזואל תחתון',
        layout: 'bottom' as AdLayout,
        icon:  ImageIcon,
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop', 
        prompt: `צור מודעת דרושים בסגנון "Visual Anchor". כותרת ענקית למעלה, תמונה גדולה למטה.`
    },
    {
        id: 'showcase',
        title: 'Showcase',
        subtitle: 'מוצר/מרכז',
        layout: 'middle' as AdLayout,
        icon: LayoutTemplate,
        image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop', 
        prompt: `צור מודעת דרושים בסגנון "Showcase Middle". כותרת למעלה, תמונה במרכז הפוקוס, ופרטים למטה.`
    }
];

// --- TOOL CONFIGURATION ---
const TOOLS_CONFIG = [
    {
        id: ToolType.MATCH_ANALYZER,
        title: "התאמת משרה וקו''ח",
        subtitle: "סוכן התאמות חכם (Agent)",
        desc: "הזן תיאור משרה וקורות חיים (טקסט חופשי או קובץ), וקבל ניתוח התאמה מעמיק מבוסס Gemini 3 Pro כולל ציון, נימוקים, יתרונות וחסרונות.",
        icon: Microscope,
        color: "bg-gradient-to-br from-indigo-500 to-blue-600"
    },
    {
        id: ToolType.TEXT_EXTRACTOR,
        title: "חילוץ טקסט מתמונה",
        subtitle: "OCR מלא לקבצים",
        desc: "העלה כל תמונה או מסמך (מודעת דרושים, קו''ח). הסוכן ישלוף את כל המלל הכתוב (OCR) ויחזיר לך את הטקסט הגולמי + הקובץ המקורי.",
        icon: ScanText,
        color: "bg-gradient-to-br from-slate-600 to-slate-800"
    },
    {
        id: ToolType.CANDIDATE_SUMMARY,
        title: "מסכם מועמדים",
        subtitle: "יצירת כרטיס מועמד מעוצב",
        desc: "הזן מלל גולמי של קורות חיים. הסוכן ינתח את המידע, יסכם את הנקודות החשובות וייצור עבורך כרטיסייה מעוצבת ומוכנה למערכת.",
        icon: UserPlus,
        color: "bg-gradient-to-br from-violet-500 to-fuchsia-500"
    },
    {
        id: ToolType.AD_GENERATOR,
        title: "אדריכל המשרות",
        subtitle: "יצירה וניתוח של משרות",
        desc: "כלי זה מאפשר לך ליצור תיאורי משרה מקצועיים מאפס או לנתח מודעות קיימות. הוא משתמש ב-Gemini כדי לנסח דרישות מדויקות, ומשלב את מודל Nano Banana ליצירת תמונות קונספט ויזואליות למשרה.",
        icon: Megaphone,
        color: "bg-gradient-to-br from-pink-500 to-rose-500"
    },
    {
        id: ToolType.RESUME_GENERATOR,
        title: "מנתח המועמדים",
        subtitle: "סריקה ופרופיל מועמד",
        desc: "מערכת חכמה להמרת קורות חיים (PDF/תמונה) לנתונים דיגיטליים. הכלי מחלץ שמות, מיומנויות וניסיון, או מאפשר לך ליצור פרופיל מועמד פיקטיבי על בסיס תיאור קצר.",
        icon: UserCheck,
        color: "bg-gradient-to-br from-emerald-500 to-teal-500"
    },
    {
        id: ToolType.QUESTIONNAIRE_GENERATOR,
        title: "מחולל השאלונים",
        subtitle: "בניית שאלונים אוטומטית",
        desc: "צור שאלונים מקצועיים ואישיותיים לכל תפקיד ברגע. הזן את שם התפקיד וקבל סט של 5 שאלונים מוכנים לשליחה למועמד.",
        icon: ClipboardList,
        color: "bg-gradient-to-br from-indigo-500 to-purple-600"
    }
];

const Header: React.FC<any> = ({ title, subtitle, icon: Icon, activeTool, subMode, onBack, selectedModel, onSelectModel }) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 animate-fade-in z-10 relative">
        <div className="flex items-center gap-4">
            {(activeTool || subMode !== 'SELECTION') && (
                <button 
                onClick={onBack}
                className="p-3 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-100 transition-all shadow-sm group"
                >
                    <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform"/>
                </button>
            )}
            
            {!activeTool && (
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Icon size={24} />
            </div>
            )}

            <div>
                <h2 className="text-2xl font-black text-slate-900 mb-0.5">{title}</h2>
                <p className="text-slate-500 font-medium text-sm">{subtitle}</p>
            </div>
        </div>

        {activeTool && <AIModelSelector currentModel={selectedModel} onSelect={onSelectModel} />}
    </div>
);

const SelectionCard: React.FC<any> = ({ title, desc, icon: Icon, color, onClick, upload = false }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleClick = () => upload ? fileInputRef.current?.click() : onClick();
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onClick({ data: reader.result, type: file.type, name: file.name });
            reader.readAsDataURL(file);
        }
    };

    return (
    <button 
        onClick={handleClick}
        className="bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-full transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 duration-500 text-right group w-full"
    >
        <div className={`h-32 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center ${color}`}>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                <div className="relative z-10 p-6 bg-white/90 rounded-full shadow-lg text-slate-800 group-hover:scale-110 transition-transform">
                    <Icon size={40} strokeWidth={1.5} />
                </div>
        </div>
        <div className="p-8 flex-grow">
                <h3 className="text-2xl font-black text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{desc}</p>
        </div>
        <div className="p-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{upload ? 'סריקה וניתוח' : 'מחולל AI'}</span>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <ChevronRight size={16} />
            </div>
        </div>
        {upload && <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFile} />}
    </button>
    );
};

const ToolGridItem: React.FC<{ item: any, onClick: () => void }> = ({ item, onClick }) => {
    const [showInfo, setShowInfo] = useState(false);
    const Icon = item.icon;
    const handleInfoClick = (e: React.MouseEvent) => { e.stopPropagation(); setShowInfo(!showInfo); };
    
    return (
        <div className="relative h-64 group">
        <button 
            onClick={onClick}
            className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all text-right flex flex-col justify-between h-full w-full overflow-hidden relative"
        >
            <div>
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                    <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-4 group-hover:text-indigo-500 transition-colors">
                <span>פתח כלי</span>
                <ChevronRight size={14} />
            </div>
        </button>
        <button 
            onClick={handleInfoClick}
            className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:bg-slate-100 hover:text-indigo-500 transition-all z-20"
            title="מידע על הכלי"
        >
            {showInfo ? <X size={18}/> : <Info size={18} />}
        </button>
        {showInfo && (
            <div 
                onClick={() => setShowInfo(false)}
                className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-[2.5rem] p-6 z-30 flex flex-col justify-center items-start text-white animate-fade-in cursor-pointer"
            >
                <div className="flex items-center gap-2 mb-3 text-indigo-300">
                    <Icon size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider">מה הכלי עושה?</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{item.desc}</p>
            </div>
        )}
        </div>
    );
};

// --- MINI CAROUSEL CARD (REDUCED SIZE) ---
const MiniTemplateCard: React.FC<any> = ({ folder, isActive, onClick }) => {
    const Icon = folder.icon;
    return (
    <button 
        onClick={() => onClick(folder)}
        className={`rounded-2xl border overflow-hidden relative flex flex-col w-32 h-44 shrink-0 transition-all hover:scale-[1.02] group text-right
            ${isActive ? 'ring-4 ring-indigo-200 border-indigo-500 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md bg-white'}
        `}
    >
        <div className="h-24 relative w-full overflow-hidden bg-slate-100">
            <img src={folder.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent"></div>
            <div className="absolute top-2 right-2 z-10">
                    <div className={`w-6 h-6 rounded-full bg-white/30 backdrop-blur flex items-center justify-center shadow-sm ${isActive ? 'text-indigo-500' : 'text-white'}`}>
                        <Icon size={12} />
                    </div>
            </div>
        </div>
        <div className="p-3 flex-grow flex flex-col justify-between bg-white">
            <div>
                <h3 className={`font-bold text-xs mb-0.5 ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>{folder.title}</h3>
                <p className="text-slate-500 text-sm opacity-80">{folder.subtitle}</p>
            </div>
            <div className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isActive ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                <span>{isActive ? 'נבחר' : 'בחר'}</span>
                <ChevronRight size={10}/>
            </div>
        </div>
    </button>
    );
};

// --- COMPONENT FOR FILE/TEXT CARD (EXTRACTED) ---
const InputCard = ({ 
    title, 
    icon: Icon, 
    value, 
    onChange, 
    placeholder,
    colorClass
  }: { 
    title: string, 
    icon: any, 
    value: { text: string, file: any | null }, 
    onChange: (val: { text: string, file: any | null }) => void,
    placeholder: string,
    colorClass: string
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onChange({ ...value, file: { data: reader.result, type: file.type, name: file.name } });
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className={`p-4 border-b border-slate-50 flex justify-between items-center ${colorClass}`}>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Icon size={18} />
                    {title}
                </div>
                {value.file && (
                    <button 
                        onClick={() => onChange({ ...value, file: null })}
                        className="text-xs bg-white/80 hover:bg-white text-red-500 px-2 py-1 rounded-full flex items-center gap-1 font-bold"
                    >
                        <X size={12} /> הסר קובץ
                    </button>
                )}
            </div>
            
            <div className="p-4 flex-grow flex flex-col gap-3 relative">
                {/* File Drop Area / Preview */}
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center min-h-[120px]
                        ${value.file 
                            ? 'border-emerald-200 bg-emerald-50' 
                            : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                        }
                    `}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFile} />
                    
                    {value.file ? (
                        <>
                            <FileText size={32} className="text-emerald-500 mb-2" />
                            <span className="text-xs font-bold text-emerald-700 truncate max-w-full px-2">{value.file.name}</span>
                            <span className="text-[10px] text-emerald-500">הקובץ נטען בהצלחה</span>
                        </>
                    ) : (
                        <>
                            <Upload size={24} className="text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-600">העלה קובץ</span>
                            <span className="text-[10px] text-slate-400">PDF או תמונה</span>
                        </>
                    )}
                </div>

                {/* Text Area Divider */}
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-bold uppercase">או הדבק טקסט</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Text Area */}
                <textarea 
                    value={value.text}
                    onChange={(e) => onChange({ ...value, text: e.target.value })}
                    placeholder={placeholder}
                    className="w-full flex-grow p-3 bg-slate-50 rounded-xl border-none resize-none text-xs text-slate-700 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 custom-scrollbar min-h-[100px]"
                />
            </div>
        </div>
    );
  };

// --- EXTRACTED TEXT EXTRACTOR COMPONENT ---
const TextExtractorView = ({
    activeTool,
    subMode,
    onBack,
    selectedModel,
    setSelectedModel,
    genericFile,
    setGenericFile,
    handleSendMessage,
    genericOutput,
    genericLoading
}: any) => {
    const toolConfig = TOOLS_CONFIG.find(t => t.id === activeTool) || TOOLS_CONFIG[0];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const fileData = { data: reader.result as string, type: file.type, name: file.name };
                setGenericFile(fileData);
                handleSendMessage("Strict OCR", fileData);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCopy = () => {
        if (genericOutput) {
            navigator.clipboard.writeText(genericOutput);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative pb-12">
               <Header 
                   title={toolConfig.title} 
                   subtitle={toolConfig.subtitle} 
                   icon={toolConfig.icon}
                   activeTool={activeTool}
                   subMode={subMode}
                   onBack={onBack}
                   selectedModel={selectedModel}
                   onSelectModel={setSelectedModel}
               />

               {/* DUAL CARD LAYOUT */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-6 h-[500px]">
                   
                   {/* LEFT: UPLOAD CARD */}
                   <div className="bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-full hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all relative group">
                        <div className="absolute top-6 right-6 z-20">
                            <span className="bg-white/90 backdrop-blur-md text-slate-700 px-4 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 shadow-sm flex items-center gap-1.5">
                                <Upload size={12}/> קובץ מקור
                            </span>
                        </div>
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full cursor-pointer flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative"
                        >
                            {genericFile ? (
                                genericFile.type.includes('pdf') ? (
                                    <div className="text-center">
                                        <FileText size={64} className="text-slate-400 mb-4 mx-auto"/>
                                        <p className="font-bold text-slate-600">{genericFile.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">לחץ להחלפה</p>
                                    </div>
                                ) : (
                                    <img src={genericFile.data} className="w-full h-full object-contain p-8" alt="Source" />
                                )
                            ) : (
                                <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-3xl group-hover:border-indigo-400 group-hover:scale-105 transition-all">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-sm">
                                        <Upload size={32} className="text-indigo-500" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-1">העלה קובץ לסריקה</h3>
                                    <p className="text-slate-500 text-sm">תמונה או PDF</p>
                                </div>
                            )}
                        </div>
                   </div>

                   {/* RIGHT: OUTPUT CARD (APP STYLE) */}
                   <div className="bg-white rounded-[2.5rem] shadow-[0_10px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-full relative">
                        {/* Header Image Area */}
                        <div className="h-24 bg-gradient-to-r from-slate-700 to-slate-800 relative shrink-0">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white to-transparent"></div>
                            <div className="absolute top-6 right-6">
                                <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/10 shadow-sm flex items-center gap-1.5">
                                    <ScanText size={12}/> פלט טקסט
                                </span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-grow px-8 pb-8 -mt-6 relative flex flex-col">
                            {/* Icon Badge */}
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center mb-4 text-slate-700">
                                <FileText size={24} />
                            </div>

                            <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">טקסט שחולץ</h3>
                                    <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">OCR RESULT</p>
                                </div>
                                {genericOutput && !genericOutput.startsWith('⚠️') && (
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors"
                                    >
                                        {copied ? <Check size={14}/> : <Copy size={14}/>}
                                        {copied ? 'הועתק!' : 'העתק'}
                                    </button>
                                )}
                            </div>

                            <div className="flex-grow bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                                {genericLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                                        <p className="text-slate-400 text-xs font-bold animate-pulse">מפענח טקסט מהתמונה...</p>
                                    </div>
                                ) : genericOutput ? (
                                    <textarea 
                                        readOnly
                                        value={genericOutput}
                                        className={`w-full h-full p-6 bg-transparent resize-none outline-none text-sm leading-relaxed font-mono custom-scrollbar ${genericOutput.startsWith('⚠️') ? 'text-red-600 font-bold' : 'text-slate-700'}`}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                        <ScanText size={48} className="opacity-20 mb-2"/>
                                        <p className="font-bold text-sm">ממתין לקובץ...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                   </div>
               </div>
          </div>
    );
};

export const AITools: React.FC<AIToolsProps> = ({ 
  onAddCandidate, 
  onAddJob, 
  resumeState, 
  setResumeState, 
  jobAdState, 
  setJobAdState 
}) => {
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [subMode, setSubMode] = useState<SubMode>('SELECTION');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-preview');
  
  // New: Layout Selection for Ad Generator
  const [activeLayout, setActiveLayout] = useState<AdLayout>('story');

  // Generic tool states
  const [genericOutput, setGenericOutput] = useState<any | null>(null);
  const [genericHistory, setGenericHistory] = useState<ChatMessage[]>([]);
  const [genericLoading, setGenericLoading] = useState(false);
  const [genericFile, setGenericFile] = useState<any>(null); // For Text Extractor

  // New State for Pre-filled input
  const [prefilledInput, setPrefilledInput] = useState<string>('');

  // --- NEW STATES FOR MATCH ANALYZER DUAL INPUT ---
  const [matchJob, setMatchJob] = useState<{ text: string, file: any | null }>({ text: '', file: null });
  const [matchResume, setMatchResume] = useState<{ text: string, file: any | null }>({ text: '', file: null });

  // --- HELPER: RESET ---
  const handleBack = () => {
    // If we are in workspace, go back to selection for the relevant tools
    if (subMode !== 'SELECTION' && (activeTool === ToolType.AD_GENERATOR || activeTool === ToolType.RESUME_GENERATOR)) {
        setSubMode('SELECTION');
    } else {
        // Go back to main grid
        setActiveTool(null);
        setSubMode('SELECTION');
        setGenericOutput(null);
        setGenericHistory([]);
        setGenericFile(null);
        // Reset Dual Inputs
        setMatchJob({ text: '', file: null });
        setMatchResume({ text: '', file: null });
    }
    setPrefilledInput('');
    setActiveLayout('story');
  };

  const resetToolState = () => {
    setResumeState(prev => ({ ...prev, generatedData: null, headerImage: null, uploadedFile: null, chatHistory: [] }));
    setJobAdState(prev => ({ ...prev, generatedData: null, headerImage: null, uploadedFile: null, chatHistory: [] }));
    setGenericOutput(null);
    setGenericHistory([]);
    setGenericFile(null);
    setSubMode('SELECTION');
    setPrefilledInput('');
    setActiveLayout('story');
    setMatchJob({ text: '', file: null });
    setMatchResume({ text: '', file: null });
  };

  // --- STATE MANAGEMENT ---
  const getCurrentState = () => {
    if (activeTool === ToolType.RESUME_GENERATOR) return resumeState;
    if (activeTool === ToolType.AD_GENERATOR) return jobAdState;
    return { chatHistory: genericHistory, isLoading: genericLoading, generatedData: genericOutput, uploadedFile: genericFile };
  };

  const updateCurrentState = (updater: (prev: any) => any) => {
    if (activeTool === ToolType.RESUME_GENERATOR) setResumeState(updater);
    else if (activeTool === ToolType.AD_GENERATOR) setJobAdState(updater);
    else {
        const newState = updater({ chatHistory: genericHistory, isLoading: genericLoading, generatedData: genericOutput, uploadedFile: genericFile });
        setGenericHistory(newState.chatHistory);
        setGenericLoading(newState.isLoading);
        setGenericOutput(newState.generatedData);
        if (newState.uploadedFile) setGenericFile(newState.uploadedFile);
    }
  };

  // --- HANDLER FOR DUAL MATCH ANALYSIS ---
  const handleDualAnalysis = async () => {
    if ((!matchJob.text && !matchJob.file) || (!matchResume.text && !matchResume.file)) {
        alert("נא להזין תיאור משרה וקורות חיים (טקסט או קובץ) כדי לבצע בדיקה.");
        return;
    }
    setGenericLoading(true);
    try {
        const result = await analyzeDualMatch(matchJob, matchResume, selectedModel);
        setGenericOutput(result);
    } catch (e) {
        console.error(e);
        alert("שגיאה בניתוח.");
    } finally {
        setGenericLoading(false);
    }
  };

  // --- AI HANDLERS ---
  const handleSendMessage = async (text: string, fileData?: { data: string, type: string, name: string }) => {
      const currentState = getCurrentState();
      const isResume = activeTool === ToolType.RESUME_GENERATOR;
      const isJob = activeTool === ToolType.AD_GENERATOR;
      const isQuestionnaire = activeTool === ToolType.QUESTIONNAIRE_GENERATOR;
      const isMatch = activeTool === ToolType.MATCH_ANALYZER;
      const isExtractor = activeTool === ToolType.TEXT_EXTRACTOR;
      const isSummary = activeTool === ToolType.CANDIDATE_SUMMARY;

      // New: Transactional Agents check (should reset history for each new request)
      const isTransactionalAgent = isMatch || isExtractor || isSummary;

      const userMsg: ChatMessage = { role: 'user', text, image: fileData?.data }; 
      
      updateCurrentState((prev: any) => ({ 
          ...prev, 
          isLoading: true, 
          uploadedFile: fileData || prev.uploadedFile, 
          // If transactional agent, reset history to just this message. Otherwise append.
          chatHistory: isTransactionalAgent ? [userMsg] : [...prev.chatHistory, userMsg],
          // Also clear previous generated output for transactional agents to avoid confusion
          generatedData: isTransactionalAgent ? null : prev.generatedData
      }));

      try {
          let newData;
          let newImage = (currentState as any).headerImage;
          let newSourceImage = (currentState as any).uploadedFile;
          let aiText = "";

          if (isMatch) {
              // Agent 1: Raw Match Analyzer (Fallback if used via generic chat interface)
              const rawInput = text; 
              // We pass the uploaded file (if any) and text to the raw analyzer
              newData = await analyzeRawMatch(rawInput, fileData?.data, selectedModel);
              aiText = `הניתוח הושלם. ציון התאמה: ${newData.score}/100`;
              // We store the result in generatedData

          } else if (isExtractor) {
              // Agent 2: Text Extractor
              if (fileData) {
                  try {
                      // Updated to pass mimeType correctly
                      const extracted = await extractGenericText(fileData.data, fileData.type, selectedModel);
                      newData = extracted;
                      aiText = "הטקסט חולץ בהצלחה מהקובץ.";
                      newSourceImage = fileData; // Keep the file to display it
                  } catch (err: any) {
                      // Catch inner errors (like Quota Exceeded) and set them as the output
                      newData = err.message;
                      aiText = "שגיאה בחילוץ הטקסט.";
                  }
              } else {
                  aiText = "אנא העלה קובץ או תמונה לחילוץ טקסט.";
              }

          } else if (isSummary) {
              // Agent 3: Candidate Summary (Reuse Resume JSON logic but for display purpose)
              newData = await generateResumeJSON(text, undefined, selectedModel);
              newImage = await generateVisualBackground(text, undefined, selectedModel);
              aiText = "הכרטיסיה סוכמה ועוצבה בהצלחה.";

          } else if (isResume) {
              if (!currentState.generatedData) {
                  if (subMode === 'UPLOAD' && fileData) {
                      newData = await generateResumeJSON("Strict Extraction", fileData.data, selectedModel);
                      newImage = fileData.data;
                      aiText = "הנתונים חולצו מהקובץ בהצלחה.";
                  } else {
                      [newData, newImage] = await Promise.all([
                          generateResumeJSON(text, undefined, selectedModel),
                          generateVisualBackground(text, undefined, selectedModel)
                      ]);
                      aiText = `יצרתי פרופיל מועמד לתפקיד ${newData.currentTitle}.`;
                  }
              } else {
                  newData = await refineResumeJSON(currentState.generatedData, text, selectedModel);
                  aiText = "הפרופיל עודכן.";
              }

          } else if (isJob) {
              const currentData = currentState.generatedData;

              // SCENARIO 1: UPLOAD MODE - USE STRICT EXTRACTOR
              if (subMode === 'UPLOAD' && fileData && !currentData) {
                   // Ensure we preserve the uploaded file for saving
                   newSourceImage = fileData;
                   
                   // Use the new STRICT OCR function
                   newData = await extractJobFromImage(fileData.data, selectedModel);
                   
                   // Use the uploaded image as the visual if it's an image
                   newImage = fileData.data; 
                   aiText = "המודעה נסרקה בהצלחה (OCR מלא). כל הטקסט חולץ לשדה 'תיאור מלא'.";
              
              // SCENARIO 2: FIRST TEXT GENERATION (NO DATA YET)
              } else if (!currentData) {
                  // 1. Generate ONLY the JSON (Business Card)
                  newData = await generateJobAdJSON(text, undefined, false, selectedModel);
                  
                  // 2. Specific Verification Message (Elegant)
                  aiText = `רגע לפני שאני ניגש למלאכת העיצוב, חשוב לי לוודא שהפרטים שהזנת מדויקים ומלאים.
אנא בדוק: האם ציינת דרכי התקשרות (מייל/וואטסאפ)? האם הגדרת מיקום מדויק?
אם הכל תקין, אשר לי בהודעה חוזרת ואצור עבורך את התמונה המושלמת.`;

              // SCENARIO 3: HAS DATA -> CHECK FOR IMAGE REQUEST vs REFINEMENT
              } else {
                  // Check if user wants an image
                  const imageKeywords = ['תמונה', 'picture', 'image', 'photo', 'כן', 'yes', 'create', 'תייצר', 'עצב', 'visual', 'אשר', 'מאשר', 'תקין', 'confirmed', 'ok'];
                  const isImageRequest = imageKeywords.some(keyword => text.toLowerCase().includes(keyword));

                  if (isImageRequest) {
                      // Generate Image based on the EXISTING data
                      aiText = "מעולה, אני ניגש לעצב את התמונה המקצועית עבור המשרה שלך...";
                      
                      // Using the detailed prompt logic ("Part B")
                      const socialImage = await generateSocialMediaAsset(currentData.title, currentData.department, text, selectedModel);
                      
                      if (socialImage) {
                           newSourceImage = { 
                               data: socialImage, 
                               type: 'image/png', 
                               name: 'generated-job-post.png' 
                           };
                           aiText = "התמונה נוצרה בהצלחה! היא מופיעה בצד שמאל. כעת תוכל לפרסם את המשרה.";
                      } else {
                           aiText = "לא הצלחתי ליצור את התמונה כרגע. נסה שוב.";
                      }
                      newData = currentData; // Keep existing data

                  } else {
                      // Text Refinement
                      newData = await refineJobAdJSON(currentData, text, selectedModel);
                      aiText = "פרטי המשרה עודכנו.";
                  }
              }

          } else if (isQuestionnaire) {
              // Questionnaire Generator Logic
              const questionnaires = await generateQuestionnaireSet(text, "מועמד");
              // We just stringify it for the generic output for now, but really we want to show it nicely
              setGenericOutput(JSON.stringify(questionnaires, null, 2));
              aiText = `יצרתי סט של 5 שאלונים עבור תפקיד: ${text}.`;
          } else {
              let systemPromptPrefix = "";
              switch (activeTool) {
                  case ToolType.BOOLEAN_SEARCH: systemPromptPrefix = "You are a Boolean Search Expert..."; break;
                  default: systemPromptPrefix = "You are a helpful HR AI Assistant.";
              }

              const fullPrompt = `${systemPromptPrefix}\n\nUser Request: ${text}`;
              const res = await generateGenericContent(fullPrompt, fileData?.data, selectedModel);
              
              setGenericOutput(res);
              aiText = res;
          }

          updateCurrentState((prev: any) => ({ 
              ...prev, 
              generatedData: newData || prev.generatedData,
              headerImage: newImage || prev.headerImage,
              uploadedFile: newSourceImage || prev.uploadedFile, // This stores the generated image OR the uploaded file
              isLoading: false,
              chatHistory: [...prev.chatHistory, { role: 'ai', text: aiText }]
          }));

      } catch (error: any) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error("AI Tools Error:", errMsg);
          
          // CRITICAL FIX: If we are in Text Extractor, show error in the output box
          let errorOutput = null;
          if (activeTool === ToolType.TEXT_EXTRACTOR) {
              errorOutput = errMsg;
          }

          updateCurrentState((prev: any) => ({ 
              ...prev, 
              isLoading: false,
              generatedData: errorOutput || prev.generatedData, // Show friendly error in text box
              chatHistory: [...prev.chatHistory, { role: 'ai', text: errMsg }]
          }));
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // NOTE: Agent 3 (Summary) essentially does the same as Resume Generator so we can use the same save logic
      const isSummary = activeTool === ToolType.CANDIDATE_SUMMARY;
      const data = isSummary ? genericOutput : resumeState.generatedData;
      
      if ((activeTool === ToolType.RESUME_GENERATOR || isSummary) && data) {
          await onAddCandidate({
              id: `gen_${Date.now()}`, 
              recruiterId: '', 
              name: data.fullName || 'מועמד ללא שם',
              title: data.currentTitle || 'ללא כותרת',
              department: data.department || 'General', 
              field: data.field || data.department || 'General',
              experience: data.experienceSummary || '',
              skills: Array.isArray(data.skills) ? data.skills : [],
              avatarUrl: `https://ui-avatars.com/api/?name=${data.fullName || 'User'}&background=random`,
              resumeText: data.fullResumeText || '',
              imageUrl: isSummary ? (getCurrentState() as any).headerImage : resumeState.headerImage, 
              cvImageUrl: isSummary ? null : resumeState.uploadedFile?.data,
              sourceFile: isSummary ? null : resumeState.uploadedFile,
              themeColor: data.themeColor || '#4f46e5',
              email: data.contactEmail,
              phone: data.contactPhone
          });
          alert("מועמד נשמר!");
          handleBack();
          resetToolState();
      } else if (activeTool === ToolType.AD_GENERATOR && jobAdState.generatedData) {
          const data = jobAdState.generatedData;
          
          await onAddJob({
              id: `job_${Date.now()}`,
              recruiterId: '',
              title: data.title || 'משרה ללא כותרת',
              department: data.department || 'כללי',
              location: data.location || 'לא צוין',
              description: data.description || '',
              postedDate: new Date().toLocaleDateString('he-IL'),
              fullAdText: data.fullAdText || '',
              // Use the generated social image as the header image if available
              imageUrl: jobAdState.uploadedFile?.data || jobAdState.headerImage,
              sourceFile: jobAdState.uploadedFile, 
              themeColor: data.themeColor || '#ec4899',
              status: 'OPEN',
              isActiveInMatching: true
          });
          alert("משרה פורסמה!");
          handleBack();
          resetToolState();
      }
    } catch (e) {
      alert("שגיאה בשמירה.");
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- VIEWS ---

  // --- NEW AGENT 1: MATCH ANALYZER ---
  if (activeTool === ToolType.MATCH_ANALYZER) {
      const toolConfig = TOOLS_CONFIG.find(t => t.id === activeTool) || TOOLS_CONFIG[0];
      return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative pb-12">
               <Header 
                   title={toolConfig.title} 
                   subtitle={toolConfig.subtitle} 
                   icon={toolConfig.icon}
                   activeTool={activeTool}
                   subMode={subMode}
                   onBack={handleBack}
                   selectedModel={selectedModel}
                   onSelectModel={setSelectedModel}
               />
               
               {/* DUAL INPUT AREA */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 shrink-0 h-[400px]">
                   <InputCard 
                       title="תיאור משרה"
                       icon={Briefcase}
                       value={matchJob}
                       onChange={setMatchJob}
                       placeholder="הדבק את תיאור המשרה כאן..."
                       colorClass="bg-indigo-50/50"
                   />
                   <InputCard 
                       title="קורות חיים"
                       icon={FileText}
                       value={matchResume}
                       onChange={setMatchResume}
                       placeholder="הדבק את קורות החיים כאן..."
                       colorClass="bg-emerald-50/50"
                   />
               </div>

               {/* ACTION BUTTON */}
               <div className="flex justify-center mb-8">
                   <button 
                       onClick={handleDualAnalysis}
                       disabled={genericLoading || ((!matchJob.text && !matchJob.file) || (!matchResume.text && !matchResume.file))}
                       className={`
                           px-12 py-4 rounded-2xl font-black text-lg shadow-xl flex items-center gap-3 transition-all hover:scale-105
                           ${genericLoading || ((!matchJob.text && !matchJob.file) || (!matchResume.text && !matchResume.file))
                             ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                             : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-200'
                           }
                       `}
                   >
                       {genericLoading ? <Loader2 size={24} className="animate-spin" /> : <Microscope size={24} />}
                       {genericLoading ? 'מבצע ניתוח...' : 'בדוק התאמה'}
                   </button>
               </div>

               {/* OUTPUT AREA */}
               {genericOutput && !genericOutput.reasoning?.includes('⚠️') && (
                   <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
                       <div className="bg-white p-8 rounded-3xl shadow-lg border border-indigo-100 animate-fade-in max-w-3xl mx-auto">
                           {/* Score Circle */}
                           <div className="flex justify-center mb-6">
                               <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="58" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                                        <circle 
                                            cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                            className={`${genericOutput.score >= 80 ? 'text-emerald-500' : genericOutput.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                                            strokeDasharray={58 * 2 * Math.PI}
                                            strokeDashoffset={58 * 2 * Math.PI - (genericOutput.score / 100) * (58 * 2 * Math.PI)}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-black text-slate-800">{genericOutput.score}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">התאמה</span>
                                    </div>
                               </div>
                           </div>

                           <h3 className="text-center text-xl font-bold text-slate-800 mb-6">{genericOutput.reasoning}</h3>
                           
                           <div className="grid grid-cols-2 gap-4">
                               <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                   <h4 className="font-bold text-emerald-800 mb-2 text-sm">יתרונות</h4>
                                   <ul className="text-xs text-emerald-700 space-y-1 list-disc list-inside">
                                       {genericOutput.pros?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                   </ul>
                               </div>
                               <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                   <h4 className="font-bold text-red-800 mb-2 text-sm">חסרונות</h4>
                                   <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                                       {genericOutput.cons?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                   </ul>
                               </div>
                           </div>
                       </div>
                   </div>
               )}

               {/* ERROR STATE IN MATCH ANALYZER */}
               {genericOutput && genericOutput.reasoning?.includes('⚠️') && (
                   <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center mx-auto max-w-lg mt-8">
                       <h3 className="font-bold text-red-700 mb-2 text-lg">שגיאת ניתוח</h3>
                       <p className="text-red-600">{genericOutput.reasoning}</p>
                   </div>
               )}
          </div>
      );
  }

  // --- NEW AGENT 2: TEXT EXTRACTOR ---
  if (activeTool === ToolType.TEXT_EXTRACTOR) {
      // Use the dedicated component to avoid conditional hook errors
      return (
          <TextExtractorView 
            activeTool={activeTool}
            subMode={subMode}
            onBack={handleBack}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            genericFile={genericFile}
            setGenericFile={setGenericFile}
            handleSendMessage={handleSendMessage}
            genericOutput={genericOutput}
            genericLoading={genericLoading}
          />
      );
  }

  // --- NEW AGENT 3: CANDIDATE SUMMARY ---
  if (activeTool === ToolType.CANDIDATE_SUMMARY) {
      const toolConfig = TOOLS_CONFIG.find(t => t.id === activeTool) || TOOLS_CONFIG[0];
      return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative">
               <Header 
                   title={toolConfig.title} 
                   subtitle={toolConfig.subtitle} 
                   icon={toolConfig.icon}
                   activeTool={activeTool}
                   subMode={subMode}
                   onBack={handleBack}
                   selectedModel={selectedModel}
                   onSelectModel={setSelectedModel}
               />
               
               {/* CHAT INPUT */}
               <div className="shrink-0 py-4 bg-transparent z-20">
                   <GeminiChatInterface 
                        activeTool={activeTool} 
                        chatHistory={genericHistory} 
                        isLoading={genericLoading} 
                        onSend={handleSendMessage} 
                        hasData={!!genericOutput} 
                        placeholder="הדבק טקסט גולמי של קורות חיים ליצירת כרטיסייה..."
                   />
               </div>

               {/* OUTPUT - Reuse ResumePreview */}
               <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
                   {genericOutput ? (
                        <ResumePreview 
                            data={genericOutput} 
                            image={(getCurrentState() as any).headerImage} 
                            onSave={handleSave} 
                            isSaving={isSaving} 
                        />
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-400 max-w-lg mx-auto text-center px-4">
                           <UserPlus size={40} className="mb-4 opacity-50"/>
                           <p className="mb-2 font-bold text-slate-600">מסכם המועמדים מוכן</p>
                           <p className="text-sm opacity-70">הזן טקסט חופשי והמערכת תעצב אותו לכרטיס מועמד מקצועי.</p>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  if (activeTool === ToolType.AD_GENERATOR) {
      
      // RESTORED SELECTION SCREEN FOR JOB AD GENERATOR
      if (subMode === 'SELECTION') {
          return (
              <div className="pb-20 space-y-8 animate-fade-in">
                  <Header 
                    title="אדריכל המשרות" 
                    subtitle="בחר כיצד ליצור משרה חדשה" 
                    icon={Megaphone}
                    activeTool={activeTool}
                    subMode={subMode}
                    onBack={handleBack}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                      <SelectionCard 
                          title="העלאת מודעה קיימת" 
                          desc="העלה תמונה של מודעה קיימת. המערכת תסרוק את הטקסט, תחלץ את הפרטים ותיצור משרה דיגיטלית במערכת."
                          icon={Upload}
                          color="bg-gradient-to-br from-pink-500 to-rose-600"
                          upload={true}
                          onClick={(fileData: any) => { setSubMode('UPLOAD'); handleSendMessage("Strict Parse", fileData); }}
                      />
                      <SelectionCard 
                          title="צור משרה עם AI" 
                          desc="היעזר בבוט החכם ובסוכני העיצוב כדי ליצור תיאור משרה מנצח ופוסטים מעוצבים לרשתות החברתיות."
                          icon={Sparkles}
                          color="bg-gradient-to-br from-purple-500 to-fuchsia-600"
                          onClick={() => setSubMode('CREATE')}
                      />
                  </div>
              </div>
          );
      }

      // Workspace View (Create/Upload)
      return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in gap-6">
               
               {/* 1. TOP SECTION: HEADER & COMPACT CAROUSEL */}
               <div className="shrink-0 space-y-4">
                   <Header 
                       title="אדריכל המשרות" 
                       subtitle="עיצוב קמפיינים ב-AI" 
                       icon={Megaphone}
                       activeTool={activeTool}
                       subMode={subMode}
                       onBack={handleBack}
                       selectedModel={selectedModel}
                       onSelectModel={setSelectedModel} 
                   />
                   
                   {/* COMPACT CAROUSEL - Only in CREATE mode */}
                   {subMode === 'CREATE' && (
                       <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                           <div className="flex gap-3 w-max">
                               {PROMPT_FOLDERS.map((folder) => (
                                   <MiniTemplateCard 
                                       key={folder.id} 
                                       folder={folder} 
                                       isActive={activeLayout === folder.layout}
                                       onClick={(f: any) => {
                                           setActiveLayout(f.layout);
                                           setPrefilledInput(`${f.prompt}\n\n[הכנס כאן את פרטי המשרה והדגשים העיצוביים...]`);
                                       }}
                                   />
                               ))}
                           </div>
                       </div>
                   )}
               </div>

               {/* 2. WORKSPACE: 2 PERMANENT CARDS */}
               <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden pb-2 h-full min-h-[500px]">
                   
                   {/* RIGHT: CHAT DESIGNER (Always Open) */}
                   <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full relative order-1 lg:order-1">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-50 bg-white z-10 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-500"><Sparkles size={16}/></div>
                                מעצב אישי (Chat)
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">AI Designer</span>
                        </div>
                        
                        {/* Chat Interface */}
                        <div className="flex-grow relative bg-slate-50/30 flex flex-col overflow-hidden">
                             <GeminiChatInterface 
                                activeTool={activeTool} 
                                chatHistory={jobAdState.chatHistory} 
                                isLoading={jobAdState.isLoading} 
                                onSend={handleSendMessage} 
                                hasData={!!jobAdState.generatedData} 
                                placeholder={subMode === 'UPLOAD' ? "המודעה נסרקה. בקש שינויים או לחץ על פרסם." : "תאר לי את המשרה, את האווירה ואת המסר שתרצה להעביר..."}
                                externalInput={prefilledInput}
                                setExternalInput={setPrefilledInput}
                                mode="desktop" 
                             />
                        </div>
                   </div>

                   {/* LEFT: LIVE PREVIEW (Result) */}
                   <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full relative order-2 lg:order-2">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-50 bg-white z-10 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-teal-50 p-1.5 rounded-lg text-teal-500"><Monitor size={16}/></div>
                                תצוגה מקדימה
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">תבנית:</span>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">
                                    {activeLayout}
                                </span>
                            </div>
                        </div>
                        
                        {/* Preview Content */}
                        <div className="flex-grow overflow-y-auto p-6 bg-slate-100/50 flex items-center justify-center custom-scrollbar">
                             {jobAdState.generatedData ? (
                                <JobAdPreview 
                                    layout={activeLayout}
                                    data={jobAdState.generatedData}
                                    image={jobAdState.uploadedFile?.data} 
                                />
                             ) : (
                                <div className="text-center text-slate-300 max-w-xs mx-auto">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-100 shadow-inner">
                                        <Layout className="text-slate-200" size={32}/>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-400 mb-1">ממתין לנתונים</h3>
                                    <p className="text-xs text-slate-400/70">התחל לשוחח עם המעצב מימין כדי לראות את התוצאה כאן בזמן אמת.</p>
                                </div>
                             )}
                        </div>
                        
                        {/* Footer Action: PUBLISH (Translator) */}
                        <div className="p-4 bg-white border-t border-slate-50 z-20">
                             <button 
                                onClick={handleSave}
                                disabled={!jobAdState.generatedData || isSaving}
                                className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg
                                    ${jobAdState.generatedData 
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.01]' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                                `}
                             >
                                 {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Megaphone size={18}/>}
                                 {isSaving ? 'מפרסם למערכת...' : 'פרסם משרה למערכת'}
                             </button>
                        </div>
                   </div>

               </div>
          </div>
      );
  }

  if (activeTool === ToolType.RESUME_GENERATOR) {
      if (subMode === 'SELECTION') {
          return (
              <div className="pb-20 space-y-8 animate-fade-in">
                  <Header 
                    title="מנתח המועמדים" 
                    subtitle="בחר כיצד להוסיף מועמד חדש" 
                    icon={UserCheck}
                    activeTool={activeTool}
                    subMode={subMode}
                    onBack={handleBack}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                      <SelectionCard 
                          title="העלאת קורות חיים" 
                          desc="העלה תמונה או קובץ PDF. המערכת תחלץ את כל הפרטים, הכישורים והניסיון ותיצור כרטיס מועמד."
                          icon={FileText}
                          color="bg-gradient-to-br from-emerald-500 to-teal-600"
                          upload={true}
                          onClick={(fileData: any) => { setSubMode('UPLOAD'); handleSendMessage("Strict Parse", fileData); }}
                      />
                      <SelectionCard 
                          title="צור פרופיל עם AI" 
                          desc="הזן תיאור חופשי וה-AI יבנה פרופיל מועמד מלא, כולל תמונה, היסטוריה תעסוקתית וכישורים."
                          icon={PenTool}
                          color="bg-gradient-to-br from-violet-500 to-purple-600"
                          onClick={() => setSubMode('CREATE')}
                      />
                  </div>
              </div>
          );
      }

      return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative">
               <Header 
                    title="מנתח המועמדים" 
                    subtitle={subMode === 'UPLOAD' ? 'ניתוח קובץ מקור' : 'יצירת פרופיל'} 
                    icon={UserCheck} 
                    activeTool={activeTool}
                    subMode={subMode}
                    onBack={handleBack}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
               />
               
               {/* TOP: INPUT CHAT - MOVED UP HERE (Unified Layout) */}
               <div className="shrink-0 py-4 bg-transparent z-20">
                   <GeminiChatInterface 
                        activeTool={activeTool} 
                        chatHistory={resumeState.chatHistory} 
                        isLoading={resumeState.isLoading} 
                        onSend={handleSendMessage} 
                        hasData={!!resumeState.generatedData} 
                   />
               </div>

               {/* BOTTOM: CONTENT */}
               <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
                   {resumeState.generatedData ? (
                        <ResumePreview data={resumeState.generatedData} image={resumeState.headerImage} onSave={handleSave} isSaving={isSaving} />
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-400">
                           {resumeState.isLoading ? <Loader2 size={40} className="animate-spin mb-4"/> : <UserCheck size={40} className="mb-4 opacity-50"/>}
                           <p className="font-medium text-lg">{resumeState.isLoading ? 'מפענח נתונים...' : 'מערכת מוכנה'}</p>
                           <p className="text-sm opacity-70 mt-2">הזן תיאור או העלה קובץ</p>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  // --- NEW: QUESTIONNAIRE GENERATOR VIEW ---
  if (activeTool === ToolType.QUESTIONNAIRE_GENERATOR) {
     const toolConfig = TOOLS_CONFIG.find(t => t.id === activeTool) || TOOLS_CONFIG[5];
     return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative">
               <Header 
                   title={toolConfig.title} 
                   subtitle={toolConfig.subtitle} 
                   icon={toolConfig.icon}
                   activeTool={activeTool}
                   subMode={subMode}
                   onBack={handleBack}
                   selectedModel={selectedModel}
                   onSelectModel={setSelectedModel}
               />
               
               {/* CHAT INPUT */}
               <div className="shrink-0 py-4 bg-transparent z-20">
                   <GeminiChatInterface 
                        activeTool={activeTool} 
                        chatHistory={genericHistory} 
                        isLoading={genericLoading} 
                        onSend={handleSendMessage} 
                        hasData={!!genericOutput} 
                        placeholder="הכנס שם תפקיד (למשל: מנהל מוצר) ליצירת שאלונים..."
                   />
               </div>

               {/* OUTPUT */}
               <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
                   {genericOutput ? (
                       <div className="bg-slate-50 p-6 rounded-3xl shadow-inner border border-slate-100">
                           {/* Simple rendering of the JSON for now as per "Generic" logic, but formatted */}
                           <h3 className="text-xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                               <CheckCircle size={24} className="text-emerald-500"/>
                               שאלונים נוצרו בהצלחה
                           </h3>
                           <div className="grid gap-4">
                              {(() => {
                                  try {
                                      const data = JSON.parse(genericOutput);
                                      return Array.isArray(data) && data.map((q: any, i: number) => (
                                          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                              <div className="flex justify-between items-start mb-2">
                                                  <h4 className="font-bold text-lg text-slate-900">{q.title}</h4>
                                                  <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{q.type}</span>
                                              </div>
                                              <p className="text-sm text-slate-500 mb-3">{q.description}</p>
                                              <div className="space-y-1">
                                                  {q.questions.map((qs: any, j: number) => (
                                                      <div key={j} className="text-sm text-slate-700 flex gap-2">
                                                          <span className="text-slate-400 font-bold">{j+1}.</span>
                                                          {qs.text}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      ));
                                  } catch (e) {
                                      return <div className="whitespace-pre-line">{genericOutput}</div>;
                                  }
                              })()}
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-400 max-w-lg mx-auto text-center px-4">
                           <ClipboardList size={40} className="mb-4 opacity-50"/>
                           <p className="mb-2 font-bold text-slate-600">מחולל השאלונים מוכן</p>
                           <p className="text-sm opacity-70">{toolConfig.desc}</p>
                           <p className="text-xs text-indigo-500 mt-4 font-bold">טיפ: כתוב את שם התפקיד בלבד</p>
                       </div>
                   )}
               </div>
          </div>
     );
  }

  // Fallback for other generic tools if any
  if (activeTool) {
      const toolConfig = TOOLS_CONFIG.find(t => t.id === activeTool) || TOOLS_CONFIG[0];
      return (
          <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in relative">
               <Header 
                   title={toolConfig.title} 
                   subtitle={toolConfig.subtitle} 
                   icon={toolConfig.icon}
                   activeTool={activeTool}
                   subMode={subMode}
                   onBack={handleBack}
                   selectedModel={selectedModel}
                   onSelectModel={setSelectedModel}
               />
               
               <div className="shrink-0 py-4 bg-transparent z-20">
                   <GeminiChatInterface 
                        activeTool={activeTool} 
                        chatHistory={genericHistory} 
                        isLoading={genericLoading} 
                        onSend={handleSendMessage} 
                        hasData={!!genericOutput} 
                   />
               </div>

               <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
                   {genericOutput ? (
                       <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 whitespace-pre-line leading-relaxed text-slate-700 text-lg">
                           {genericOutput}
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-400 max-w-lg mx-auto text-center px-4">
                           <Sparkles size={40} className="mb-4 opacity-50"/>
                           <p className="mb-2 font-bold text-slate-600">{toolConfig.title} מוכן לפעולה</p>
                           <p className="text-sm opacity-70">{toolConfig.desc}</p>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <div className="flex items-end justify-between mb-2">
         <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">סוכני AI</h1>
            <p className="text-slate-500 font-medium">סוויטת הגיוס החכמה</p>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {TOOLS_CONFIG.map((tool) => (
              <ToolGridItem 
                  key={tool.id} 
                  item={tool} 
                  onClick={() => setActiveTool(tool.id as ToolType)}
              />
          ))}
      </div>
    </div>
  );
};

// --- JOB AD PREVIEW COMPONENT (HANDLES 5 LAYOUTS) ---
const JobAdPreview = ({ layout, data, image, logo }: { layout: AdLayout, data: any, image?: string, logo?: string }) => {
    
    // Placeholder if image not generated yet
    const displayImage = image || "https://images.unsplash.com/photo-1622547748225-3fc4abd2d00d?q=80&w=800&auto=format&fit=crop";

    // --- LAYOUT 1: Classic Feed (Facebook) ---
    // Text Top, Image Middle, Action Bottom
    if (layout === 'classic') {
        return (
            <div className="bg-white w-[320px] rounded-xl shadow-xl overflow-hidden border border-slate-200 scale-90 origin-top">
                {/* Header (Fake Profile) */}
                <div className="p-3 flex items-center gap-2 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">HR</div>
                    <div>
                        <div className="text-xs font-bold text-slate-900">גיוס והשמה</div>
                        <div className="text-[10px] text-slate-400">Sponsored • Just now</div>
                    </div>
                </div>
                {/* Text Top */}
                <div className="p-3 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    <p className="font-bold mb-1">{data.title}</p>
                    {data.description.substring(0, 120)}... <span className="text-blue-600 font-bold cursor-pointer">קרא עוד</span>
                </div>
                {/* Image Middle */}
                <div className="w-full h-48 bg-slate-100">
                    <img src={displayImage} className="w-full h-full object-cover" />
                </div>
                {/* Action Bottom */}
                <div className="p-2 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">הגש מועמדות עכשיו</div>
                    <button className="bg-slate-800 text-white px-4 py-1.5 rounded text-[10px] font-bold">Apply Now</button>
                </div>
            </div>
        );
    }

    // --- LAYOUT 2: Side-by-Side (Banner) ---
    // Image Left (50%), Text Right (50%)
    if (layout === 'side') {
        return (
            <div className="bg-white w-[480px] h-[240px] rounded-xl shadow-xl overflow-hidden flex border border-slate-200 scale-90 origin-top">
                {/* Image Side */}
                <div className="w-1/2 h-full bg-slate-100 relative">
                     <img src={displayImage} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/10"></div>
                </div>
                {/* Text Side */}
                <div className="w-1/2 p-6 flex flex-col justify-center bg-white">
                    <div className="uppercase text-[10px] font-bold text-blue-600 mb-1">{data.department}</div>
                    <h2 className="text-lg font-black text-slate-900 mb-2 leading-tight">{data.title}</h2>
                    <p className="text-[10px] text-slate-500 mb-4 leading-relaxed line-clamp-4">{data.description}</p>
                    <button className="bg-blue-600 text-white w-full py-2 rounded-lg font-bold text-xs">הגש מועמדות</button>
                </div>
            </div>
        );
    }

    // --- LAYOUT 3: Bottom Visual (Impact) ---
    // Text Top, Image Bottom (Remaining)
    if (layout === 'bottom') {
        return (
            <div className="bg-white w-[320px] h-[480px] rounded-xl shadow-xl overflow-hidden flex flex-col border border-slate-200 relative scale-90 origin-top">
                <div className="p-6 pb-2 z-10 bg-white">
                    <h1 className="text-2xl font-black text-slate-900 mb-1">{data.title}</h1>
                    <div className="flex gap-2 mb-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold">{data.location}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold">{data.department}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{data.description.substring(0, 80)}...</p>
                </div>
                <div className="flex-grow relative">
                    <img src={displayImage} className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 right-4">
                        <button className="w-full bg-white/90 backdrop-blur text-slate-900 py-2.5 rounded-xl font-black text-xs shadow-lg">שלח קורות חיים</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- LAYOUT 4: Sandwich (Middle) ---
    // Header -> Image -> Body -> Footer
    if (layout === 'middle') {
        return (
            <div className="bg-slate-900 w-[320px] min-h-[480px] rounded-xl shadow-xl overflow-hidden flex flex-col border border-slate-800 text-white scale-90 origin-top">
                <div className="p-4 text-center">
                    <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-0.5">אנחנו מגייסים</div>
                    <h2 className="text-lg font-bold">{data.title}</h2>
                </div>
                <div className="h-48 bg-slate-800 relative group">
                    <img src={displayImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 border-y-4 border-teal-500/20"></div>
                </div>
                <div className="p-4 flex-grow bg-slate-800/50">
                    <p className="text-xs text-slate-300 leading-relaxed text-center">{data.description.substring(0, 100)}...</p>
                </div>
                <div className="p-3 bg-teal-600 text-center font-bold text-xs cursor-pointer hover:bg-teal-500 transition-colors">
                    JOIN THE TEAM
                </div>
            </div>
        );
    }

    // --- LAYOUT 5: Story/Mobile (Original/Default) ---
    // Image Top (40%), Text Bottom
    return (
        <div className="bg-white w-[300px] h-[520px] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 relative scale-95 origin-top">
             <div className="h-[40%] relative w-full bg-slate-200">
                 <img src={displayImage} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
                 <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[9px] font-bold border border-white/20">
                     {data.department}
                 </div>
             </div>
             <div className="flex-grow p-6 flex flex-col">
                 <h2 className="text-xl font-black text-slate-900 mb-1 leading-tight">{data.title}</h2>
                 <div className="w-8 h-1 bg-indigo-500 rounded-full mb-3"></div>
                 <div className="space-y-3 flex-grow overflow-hidden">
                     <p className="text-xs text-slate-600 leading-relaxed line-clamp-6">{data.description}</p>
                     
                     <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                         <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">מיקום</div>
                         <div className="text-[10px] font-bold text-slate-800">{data.location}</div>
                     </div>
                 </div>
                 <div className="mt-3 pt-3 border-t border-slate-100">
                     <div className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs text-center shadow-lg shadow-indigo-200">
                         הגש מועמדות
                     </div>
                 </div>
             </div>
        </div>
    );
};

const GeminiChatInterface = ({ activeTool, chatHistory, isLoading, onSend, hasData, placeholder, externalInput, setExternalInput, mode = "desktop" }: any) => {
    const [inputValue, setInputValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Update internal state when external input changes (from Prompt Selection)
    useEffect(() => {
        if (externalInput) {
            setInputValue(externalInput);
            // Optionally clear external input immediately if you only want a one-time set
            // setExternalInput(''); 
        }
    }, [externalInput]);

    // Single source of truth for sending messages
    const handleSend = () => {
        if (isLoading || !inputValue.trim()) return;
        
        const messageToSend = inputValue;
        setInputValue(''); // Clear immediately to prevent double sends
        if (setExternalInput) setExternalInput('');
        onSend(messageToSend);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // For chat interface, we send the file with a default "Analyze this" text if input is empty
                const textToSend = inputValue.trim() || "Analyze this file";
                setInputValue('');
                onSend(textToSend, { data: reader.result, type: file.type, name: file.name });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Prevent trigger during IME composition (Hebrew/Japanese etc)
        if (e.nativeEvent.isComposing) return;
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isMobileMode = mode === 'mobile';

    return (
        <div className={`flex flex-col h-full relative ${isMobileMode ? '' : 'mx-0 gap-0'}`}>
             {/* Chat Bubbles Area */}
             <div 
                className={`overflow-y-auto custom-scrollbar space-y-4 px-4 py-4 flex-grow pb-24`} 
                ref={scrollRef}
             >
                {chatHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                         <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                             <Sparkles size={20} className="text-indigo-500"/>
                         </div>
                         <p className="text-sm font-bold text-slate-500">הסוכן מוכן.</p>
                         <p className="text-xs text-slate-400 max-w-[200px]">כתוב הנחיה או העלה קובץ.</p>
                     </div>
                )}
                {chatHistory.map((msg: ChatMessage, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100' 
                              : 'bg-indigo-600 text-white rounded-tl-none shadow-md'
                        }`}>
                            {msg.image && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                    <img src={msg.image} className="max-h-32 object-contain bg-black/20" alt="uploaded"/>
                                </div>
                            )}
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-end">
                        <div className="bg-indigo-50 px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-2 text-indigo-500 text-[10px] font-bold animate-pulse border border-indigo-100">
                            <Loader2 size={12} className="animate-spin"/>
                            <span>חושב...</span>
                        </div>
                    </div>
                )}
             </div>

            {/* Input Area - Fixed to Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-100 z-20">
                <div className={`bg-slate-50 rounded-[1.5rem] shadow-sm border border-slate-200 p-1 pr-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:bg-white ${inputValue.length > 50 ? 'items-start py-2' : ''}`}>
                    <textarea 
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            if (setExternalInput) setExternalInput(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder || "כתוב כאן..."}
                        className={`flex-grow bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 mx-1 text-xs font-medium resize-none custom-scrollbar ${inputValue.length > 50 ? 'h-16' : 'h-8 py-1.5'}`}
                        disabled={isLoading}
                    />
                    <div className="flex items-center gap-1 self-end">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="העלה קובץ"
                        >
                            <FileInput size={16}/>
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.preventDefault(); 
                                handleSend(); 
                            }}
                            disabled={isLoading || (!inputValue.trim())}
                            className={`p-2 rounded-full transition-all ${inputValue.trim() ? 'bg-indigo-600 text-white shadow-md hover:scale-105' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <ArrowUp size={16}/>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResumePreview = ({ data, image, onSave, isSaving }: any) => (
    <div className="relative max-w-[210mm] mx-auto min-h-[140mm] flex flex-col animate-fade-in bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100 mb-6">
         <div className="absolute top-4 left-4 z-10">
                 <button 
                    onClick={onSave} 
                    disabled={isSaving}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                 >
                     {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14}/>}
                     {isSaving ? 'שמור מועמד...' : 'שמור מועמד'}
                 </button>
        </div>
        <div className="p-10 border-t-[8px]" style={{ borderColor: data?.themeColor || '#1e293b' }}>
             <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{data?.fullName || 'שם מלא'}</h1>
                    <h2 className="text-lg font-medium" style={{ color: data?.themeColor || '#000' }}>{data?.currentTitle || 'תפקיד'}</h2>
                </div>
                {image && <img src={image} className="w-20 h-20 object-cover rounded-xl shadow-md" />}
             </div>
             <div className="grid grid-cols-3 gap-8">
                <div className="col-span-1">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-xs">פרטים</h3>
                        <p className="text-slate-500 text-sm">{data?.contactEmail}</p>
                        <p className="text-slate-500 text-sm">{data?.contactPhone}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-xs">מיומנויות</h3>
                        <div className="flex flex-wrap gap-2">
                            {(data?.skills || []).map((s: string, i: number) => <span key={i} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md text-[10px] font-bold text-slate-700">{s}</span>)}
                        </div>
                    </div>
                </div>
                <div className="col-span-2">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-xs">ניסיון ותקציר</h3>
                    <p className="text-slate-600 whitespace-pre-line leading-relaxed text-sm text-justify">{data?.fullResumeText || 'אין מידע'}</p>
                </div>
             </div>
        </div>
    </div>
);
