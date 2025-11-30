
export type UserRole = 'ADMIN' | 'RECRUITER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type JobStatus = 'OPEN' | 'FILLED' | 'ARCHIVED';

export interface SourceFile {
  data: string; // Base64 string
  type: string; // e.g. 'image/png', 'application/pdf'
  name: string;
}

export interface Question {
  id: string;
  text: string;
  answer?: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  type: 'PROFESSIONAL' | 'GENERAL';
  description: string;
  questions: Question[];
  isCompleted: boolean;
}

export interface Job {
  id: string;
  recruiterId: string; // Owner ID
  title: string;
  department: string;
  location: string;
  description: string;
  postedDate: string;
  imageUrl?: string | null; // Visual Header Image (AI Generated or chosen)
  themeColor?: string;
  fullAdText?: string;
  status: JobStatus;
  isActiveInMatching: boolean;
  sourceFile?: SourceFile | null; // The original uploaded file/screenshot
  hiredCandidateId?: string; // ID of the candidate hired for this job
}

export interface Candidate {
  id: string;
  recruiterId: string; // Owner ID
  name: string;
  title: string;
  department: string; // Broad category (Sales, R&D) used for logic/filtering
  field?: string; // NEW: Specific domain/industry (e.g. "Cyber Security", "Digital Marketing")
  experience: string;
  skills: string[];
  avatarUrl: string;
  resumeText: string; 
  imageUrl?: string | null; // Header Image related to field
  cvImageUrl?: string | null; // Legacy field
  themeColor?: string;
  sourceFile?: SourceFile | null; // The original uploaded CV file
  
  // Contact Fields
  email?: string;
  phone?: string;
  linkedin?: string;
  
  // Questionnaire Data
  questionnaireSet?: Questionnaire[];
  questionnaireStatus?: 'NOT_SENT' | 'SENT' | 'COMPLETED';
}

export interface MatchResult {
  id?: string; // Firestore Doc ID
  jobId: string;
  candidateId: string;
  jobRecruiterId: string; // For filtering views
  candidateRecruiterId: string; // For filtering views
  score: number;
  reasoning: string;
  isActive: boolean;
  updatedAt?: string;
  isPlaced?: boolean; // Indicates if this match resulted in a hire
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  CANDIDATES = 'CANDIDATES',
  MATCHING = 'MATCHING',
  AI_TOOLS = 'AI_TOOLS',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT',
  INTEGRATIONS = 'INTEGRATIONS',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  PROFILE = 'PROFILE',
  QUESTIONNAIRE_HUB = 'QUESTIONNAIRE_HUB'
}

export enum ToolType {
  // Core Generators
  RESUME_GENERATOR = 'RESUME_GENERATOR',
  AD_GENERATOR = 'AD_GENERATOR',
  QUESTIONNAIRE_GENERATOR = 'QUESTIONNAIRE_GENERATOR', 
  
  // NEW AGENTS
  MATCH_ANALYZER = 'MATCH_ANALYZER', // Agent 1
  TEXT_EXTRACTOR = 'TEXT_EXTRACTOR', // Agent 2
  CANDIDATE_SUMMARY = 'CANDIDATE_SUMMARY', // Agent 3
  
  // Content & Communication
  LINKEDIN_POST = 'LINKEDIN_POST',
  EMAIL_WRITER = 'EMAIL_WRITER',
  
  // Screening & Analysis
  INTERVIEW_QS = 'INTERVIEW_QS',
  VIDEO_INTERVIEW = 'VIDEO_INTERVIEW', // New: Scripts for phone/video screen
  JD_XRAY = 'JD_XRAY', // New: Deep analysis of JDs
  BIAS_CHECKER = 'BIAS_CHECKER', // New: D&I Check
  
  // Sourcing & Planning
  BOOLEAN_SEARCH = 'BOOLEAN_SEARCH', // New: Boolean string builder
  ONBOARDING_PLAN = 'ONBOARDING_PLAN', // New: 30-60-90 Day plans
  
  // Misc
  SALARY_EST = 'SALARY_EST'
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  image?: string; // Base64 image
}

export interface GeneratorState {
  input: string;
  chatHistory: ChatMessage[];
  generatedData: any | null;
  headerImage: string | null;
  uploadedFile: SourceFile | null; // Track uploaded file for saving
  isLoading: boolean;
  activeTool: ToolType; 
}

export interface IntegrationStatus {
  gmail: boolean;
  linkedin: boolean;
  facebook: boolean;
}
