
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Robust cycle-safe stringify
const safeStringify = (obj: any, space: number = 2): string => {
  const seen = new WeakSet();
  try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, space);
  } catch (e) {
      return String(obj);
  }
};

export const safeErrorMsg = (err: any): string => {
    if (!err) return 'Unknown Error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object') {
        try {
            const simpleErr = {
                message: err.message || "No message",
                code: err.code || "No code",
                details: err.details || "No details"
            };
            return safeStringify(simpleErr);
        } catch (e) {
            return "Unreadable Error Object";
        }
    }
    return String(err);
};

// --- ERROR HANDLER WRAPPER ---
const handleGeminiError = (error: any): string => {
    const msg = safeErrorMsg(error);
    
    // Check for 429 / Quota errors specifically
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        return "⚠️ שגיאת מערכת: הגעת למכסת השימוש (Quota Exceeded). המערכת עמוסה, אנא נסה שוב בעוד דקה.";
    }
    
    // Check for 401 / Auth errors
    if (msg.includes('401') || msg.includes('UNAUTHENTICATED') || msg.includes('API key') || msg.includes('cred')) {
        return "⚠️ שגיאת הרשאה: מפתח ה-API אינו תקין או שאינו מוגדר. בדוק את קובץ ה-Env.";
    }
    
    if (msg.includes('503') || msg.includes('overloaded')) {
        return "⚠️ שגיאת מערכת: השרת עמוס כרגע. אנא נסה שוב מאוחר יותר.";
    }

    return `⚠️ שגיאה: ${msg}`;
};

// Helper to sanitize JSON string from Markdown and extra text
const cleanJson = (text: string): string => {
    if (!text) return '';
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    
    // Find JSON array or object boundaries to strip introductory text
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    
    // Determine which comes first to decide if it's array or object
    const isArrayFirst = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);
    
    if (isArrayFirst && arrayEnd > arrayStart) {
        return cleaned.substring(arrayStart, arrayEnd + 1);
    }
    if (objectStart !== -1 && objectEnd > objectStart) {
        return cleaned.substring(objectStart, objectEnd + 1);
    }
    
    return cleaned;
};

// Helper to extract array from potential object wrapper
const extractArrayFromResponse = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
        // Look for any property that is an array
        for (const key in data) {
            if (Array.isArray(data[key])) {
                return data[key];
            }
        }
    }
    return [];
};

export const analyzeCandidateMatch = async (jobDescription: string, candidateResume: string, model: string = 'gemini-3-pro-preview') => {
  if (!process.env.API_KEY) return { score: 0, reasoning: "API Key missing" };
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `
        Act as an expert HR Recruiter. 
        Analyze the match between the following Job Description and Candidate Resume.
        Job Description: "${jobDescription}"
        Candidate Resume Summary: "${candidateResume}"
        Return a JSON object with:
        1. "score": A number between 0-100 indicating the fit.
        2. "reasoning": A concise 1-sentence summary in Hebrew.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            reasoning: { type: Type.STRING }
          },
          required: ["score", "reasoning"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Match analysis failed:", safeErrorMsg(error));
    // Return friendly error reasoning instead of empty
    return { score: 0, reasoning: handleGeminiError(error) };
  }
};

// --- NEW FUNCTION: Analyze Raw Text (Mixed JD/Resume) ---
export const analyzeRawMatch = async (rawInput: string, fileData?: string, model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) return { score: 0, reasoning: "API Key missing" };
    
    const contents: any[] = [
        { 
            text: `Act as a senior HR AI. 
            The user has provided a text that contains BOTH a Job Description and a Candidate's Resume details (or one is in the text and one is in the image).
            1. DISTINGUISH between the job requirements and the candidate's profile.
            2. ANALYZE the compatibility.
            3. OUTPUT a JSON with score (0-100), reasoning (Hebrew), and short lists of "pros" and "cons" (Hebrew).
            Input Text: "${rawInput}"`
        }
    ];

    if (fileData) {
        const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        contents.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contents },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        reasoning: { type: Type.STRING },
                        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                        cons: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["score", "reasoning"]
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (error) {
        return { score: 0, reasoning: handleGeminiError(error) };
    }
};

// --- NEW FUNCTION: Analyze Dual Input (Separate Job & Resume) ---
export const analyzeDualMatch = async (
  jobData: { text: string, file: any },
  resumeData: { text: string, file: any },
  model: string = 'gemini-3-pro-preview'
) => {
    if (!process.env.API_KEY) return { score: 0, reasoning: "API Key missing" };

    const parts: any[] = [];

    // Prompt Part
    let prompt = `Act as a senior HR AI.
    Analyze the compatibility between the Job Description and the Candidate Resume provided below.
    
    1. ANALYZE the Job Requirements.
    2. ANALYZE the Candidate's skills and experience.
    3. COMPARE them.
    4. OUTPUT a JSON with score (0-100), reasoning (Hebrew), pros (Array of strings, Hebrew), and cons (Array of strings, Hebrew).`;

    parts.push({ text: prompt });

    // Job Part
    parts.push({ text: "\n\n--- JOB DESCRIPTION SOURCE ---" });
    if (jobData.text) parts.push({ text: `Job Text: ${jobData.text}` });
    if (jobData.file) {
        const base64Data = jobData.file.data.includes(',') ? jobData.file.data.split(',')[1] : jobData.file.data;
        // Default to image/png if type missing, but try to use actual type if image
        parts.push({ inlineData: { mimeType: jobData.file.type || 'image/png', data: base64Data } });
    }

    // Resume Part
    parts.push({ text: "\n\n--- CANDIDATE RESUME SOURCE ---" });
    if (resumeData.text) parts.push({ text: `Resume Text: ${resumeData.text}` });
    if (resumeData.file) {
        const base64Data = resumeData.file.data.includes(',') ? resumeData.file.data.split(',')[1] : resumeData.file.data;
        parts.push({ inlineData: { mimeType: resumeData.file.type || 'image/png', data: base64Data } });
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        reasoning: { type: Type.STRING },
                        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                        cons: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["score", "reasoning"]
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (error) {
        return { score: 0, reasoning: handleGeminiError(error) };
    }
};

// --- NEW FUNCTION: Generic OCR ---
export const extractGenericText = async (base64Image: string, mimeType: string = 'image/png', model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { 
                        text: `Perform strict OCR. Extract ALL text visible in this image/document. 
                        Return the raw text exactly as it appears. 
                        Do not summarize.` 
                    },
                    { 
                        inlineData: { mimeType: mimeType, data: cleanBase64 } 
                    }
                ]
            }
        });
        
        return response.text || "No text found.";
    } catch (e) {
        console.error("OCR Failed", safeErrorMsg(e));
        throw new Error(handleGeminiError(e));
    }
};

export const generateResumeJSON = async (textInput: string, fileData?: string, model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const prompt = fileData 
        ? `Extract structured data from this CV. If specific details are missing, infer reasonable defaults or leave empty.` 
        : `Create a professional candidate profile summary based on this text: "${textInput}". If the text is raw, format it beautifully into the schema.`;
    const contents: any[] = [{ text: prompt }];
    if (fileData) {
        // Handle Data URL stripping if necessary, though genai usually handles base64
        const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        contents.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
    }
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contents },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        currentTitle: { type: Type.STRING },
                        department: { type: Type.STRING },
                        field: { type: Type.STRING },
                        contactEmail: { type: Type.STRING },
                        contactPhone: { type: Type.STRING },
                        experienceSummary: { type: Type.STRING },
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        fullResumeText: { type: Type.STRING },
                        themeColor: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Resume Gen Failed", safeErrorMsg(e));
        throw new Error(handleGeminiError(e));
    }
};

export const refineResumeJSON = async (currentData: any, instruction: string, model: string = 'gemini-3-pro-preview') => {
     if (!process.env.API_KEY) throw new Error("API Key missing");
     try {
        const safeData = safeStringify(currentData);
        
        const response = await ai.models.generateContent({
            model: model,
            contents: `Update this candidate profile based on the instruction: "${instruction}".
            Current Profile: ${safeData}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        currentTitle: { type: Type.STRING },
                        department: { type: Type.STRING },
                        field: { type: Type.STRING },
                        contactEmail: { type: Type.STRING },
                        contactPhone: { type: Type.STRING },
                        experienceSummary: { type: Type.STRING },
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        fullResumeText: { type: Type.STRING },
                        themeColor: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
     } catch (e) {
         console.error("Refine Resume Failed", safeErrorMsg(e));
         throw new Error(handleGeminiError(e));
     }
};

// --- NEW FUNCTION: STRICT OCR FOR JOB ADS ---
export const extractJobFromImage = async (base64Image: string, model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    // Strip header if present to get pure base64
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { 
                        text: `You are a strict OCR and Data Extraction Engine. 
                        1. TRANSCRIBE: Read every single word in the provided image.
                        2. EXTRACT: Return ALL the text found in the image in the 'fullAdText' field. Do not summarize. Copy it exactly.
                        3. STRUCTURE: Based on the text you extracted, populate the other fields (title, location, requirements).
                        4. ACCURACY: Do NOT invent a job description. Only use what is visible in the image. If you cannot see text, leave fields empty.` 
                    },
                    { 
                        inlineData: { mimeType: 'image/png', data: cleanBase64 } 
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        department: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING, description: "A summary of the role" },
                        fullAdText: { type: Type.STRING, description: "The exact raw text content from the image" },
                        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        themeColor: { type: Type.STRING }
                    }
                }
            }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Job OCR Failed", safeErrorMsg(e));
        throw new Error(handleGeminiError(e));
    }
};

export const generateJobAdJSON = async (textInput: string, fileData?: string, isParsing: boolean = false, model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    // If we are parsing a file, we redirect to the dedicated OCR function
    if (isParsing && fileData) {
        return extractJobFromImage(fileData, model);
    }
    
    // Otherwise, we generate from text prompt (creative mode)
    let prompt = `Create a professional Job Advertisement based on: "${textInput}". Ensure attractive Hebrew copy.`;

    const contents: any[] = [{ text: prompt }];

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contents },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        department: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        fullAdText: { type: Type.STRING },
                        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        themeColor: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Job Gen Failed", safeErrorMsg(e));
        throw new Error(handleGeminiError(e));
    }
};

export const refineJobAdJSON = async (currentData: any, instruction: string, model: string = 'gemini-3-pro-preview') => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    try {
        const safeData = safeStringify(currentData);

        const response = await ai.models.generateContent({
            model: model,
            contents: `Update this Job Advertisement based on the instruction: "${instruction}".
            Current Ad: ${safeData}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        department: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        fullAdText: { type: Type.STRING },
                        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        themeColor: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Job Refine Failed", safeErrorMsg(e));
        throw new Error(handleGeminiError(e));
    }
};

export const generateVisualBackground = async (context: string, currentImage?: string, model: string = 'gemini-2.5-flash-image') => {
    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: `Suggest a single english keyword for an Unsplash image representing: ${context}`
        });
        const keyword = response.text?.trim() || 'office';
        return `https://source.unsplash.com/800x600/?${keyword}`;
    } catch (e) {
        return null;
    }
};

export const generateSocialMediaAsset = async (title: string, dept: string, instruction: string, model: string = 'gemini-2.5-flash') => {
    try {
        const response = await ai.models.generateContent({
             model: model,
             contents: `Suggest a visual theme keyword (English) for a job ad: ${title} in ${dept}. Instruction: ${instruction}`
        });
        const keyword = response.text?.trim() || 'business';
        return `https://source.unsplash.com/800x600/?${keyword}`;
    } catch (e) {
        return null;
    }
};

export const generateGenericContent = async (prompt: string, fileData?: string, model: string = 'gemini-3-pro-preview') => {
     if (!process.env.API_KEY) throw new Error("API Key missing");
     const contents: any[] = [{ text: prompt }];
     if (fileData) {
         const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
         contents.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
     }
     try {
         const response = await ai.models.generateContent({
             model: model,
             contents: { parts: contents }
         });
         return response.text || '';
     } catch (e) {
         console.error("Generic Gen Failed", safeErrorMsg(e));
         return handleGeminiError(e);
     }
};

// --- NEW FUNCTION: Tailored Questionnaires based on Gaps ---
export const generateTailoredQuestionnaires = async (jobDescription: string, candidateResume: string) => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Act as a senior Recruiter.
            Analyze the following Job Description against the Candidate's Resume.
            Identify 3 key "Technical Gaps" or areas that need verification.
            Identify 2 key "Soft Skill/Cultural" areas to probe.

            Based on this, generate exactly 5 screening questionnaires in Hebrew.
            
            Structure Required:
            1. Three (3) Professional/Technical Questionnaires: Focus specifically on the identified technical gaps or experience mismatch.
            2. Two (2) Personality/Cultural Questionnaires: Focus on motivation, team fit, and soft skills.
            
            Each questionnaire MUST have exactly 5 questions.
            The output must be a JSON Array of objects.

            Job Description: ${jobDescription.substring(0, 1000)}
            Candidate Resume: ${candidateResume.substring(0, 1000)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['PROFESSIONAL', 'GENERAL'] },
                            description: { type: Type.STRING },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        text: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ['text', 'boolean', 'rating'] }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const cleaned = cleanJson(response.text || '[]');
        try {
            const parsed = JSON.parse(cleaned);
            // Robustly extract array even if model wrapped it in { questionnaires: [...] }
            const data = extractArrayFromResponse(parsed);
            return data;
        } catch (parseError) {
             console.error("Failed to parse JSON for tailored questionnaires", parseError);
             return [];
        }
    } catch (e) {
        console.error("Tailored Questionnaire Gen Failed", safeErrorMsg(e));
        return [];
    }
};

// --- NEW FUNCTION: Single Ad-Hoc Questionnaire ---
export const generateSingleQuestionnaire = async (topic: string, jobTitle: string) => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create a single screening questionnaire in Hebrew about "${topic}" for the role of "${jobTitle}".
            It should contain exactly 5 questions.
            Return strictly JSON object.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['PROFESSIONAL', 'GENERAL'] },
                        description: { type: Type.STRING },
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['text', 'boolean', 'rating'] }
                                }
                            }
                        }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '{}');
        const data = JSON.parse(cleaned);
        return data;
    } catch (e) {
        console.error("Single Questionnaire Gen Failed", safeErrorMsg(e));
        return null;
    }
};

export const generateQuestionnaireSet = async (jobTitle: string, candidateName: string) => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create a set of 5 screening questionnaires for the role of "${jobTitle}".
            Candidate Name: ${candidateName}.
            
            Structure:
            - 3 Professional/Technical Questionnaires (5 questions each).
            - 2 Personality/Soft Skills Questionnaires (5 questions each).
            
            Output JSON format exactly as specified (Array of objects).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['PROFESSIONAL', 'GENERAL'] },
                            description: { type: Type.STRING },
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        text: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ['text', 'boolean', 'rating'] }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '[]');
        try {
            const parsed = JSON.parse(cleaned);
            return extractArrayFromResponse(parsed);
        } catch (e) {
            console.error("Failed to parse Questionnaire Set", e);
            return [];
        }
    } catch (e) {
        console.error("Questionnaire Gen Failed", safeErrorMsg(e));
        return [];
    }
};

// --- NEW FUNCTION: Analyze Completed Answers ---
export const analyzeInterviewAnswers = async (jobDescription: string, questionnaires: any[]) => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    // Prepare data for the model
    const qaPairs = questionnaires.map(q => ({
        topic: q.title,
        type: q.type,
        qa: q.questions.map((qs: any) => ({
            question: qs.text,
            answer: qs.answer || "No answer provided"
        }))
    }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Act as a senior HR Analyst.
            Analyze the candidate's answers to the screening questionnaires against the Job Description.

            Job Description: "${jobDescription.substring(0, 1000)}..."
            
            Candidate Q&A Data: ${JSON.stringify(qaPairs)}

            Output a JSON evaluation containing:
            1. finalScore: Number (0-100) representing the NEW weighted fit score based on these answers.
            2. summary: A professional Hebrew summary of the candidate's performance in this "interview".
            3. strengths: Array of strings (Hebrew) listing key strengths identified in answers.
            4. concerns: Array of strings (Hebrew) listing red flags or weak answers.
            5. recommendation: String (Hebrew) - "Proceed to Interview", "Hold", or "Reject".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        finalScore: { type: Type.INTEGER },
                        summary: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendation: { type: Type.STRING }
                    }
                }
            }
        });

        const cleaned = cleanJson(response.text || '{}');
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Interview Analysis Failed", safeErrorMsg(e));
        return null;
    }
};
