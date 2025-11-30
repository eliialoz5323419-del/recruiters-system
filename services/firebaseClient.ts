import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

// Global Instance Cache
let firestoreDb: Firestore | null = null;

// Save configuration securely
const CONFIG_KEY = 'firebase_raw_config';

export const saveConfig = (configStr: string) => {
    localStorage.setItem(CONFIG_KEY, configStr);
};

export const getConfig = (): string => {
    return localStorage.getItem(CONFIG_KEY) || '';
};

export const parseConfig = (text: string) => {
    if (!text) return null;
    let trimmed = text.trim();

    // Remove comments (simple block and line comments)
    trimmed = trimmed.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    // Robustly remove variable declarations:
    trimmed = trimmed.replace(/^(export\s+)?(const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*/, '');
    
    // Remove trailing semicolon
    trimmed = trimmed.replace(/;$/, '');
    trimmed = trimmed.trim();

    // 1. Try strict JSON parsing first
    try {
        return JSON.parse(trimmed);
    } catch (e) {
        // Ignore and proceed to JS loose parsing
    }

    // 2. Javascript Object Literal Parsing
    try {
        let objectString = trimmed;
        
        // Find outer braces if they exist
        const firstOpen = trimmed.indexOf('{');
        const lastClose = trimmed.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            objectString = trimmed.substring(firstOpen, lastClose + 1);
        } else if (trimmed.indexOf(':') !== -1 && !trimmed.includes('{')) {
             // Fallback for bare keys
             objectString = `{${trimmed}}`;
        }

        // Use Function constructor to safely evaluate the JS object string
        const fn = new Function(`return ${objectString};`);
        const config = fn();

        return config;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Failed to parse Firebase configuration string:", msg);
        return null;
    }
};

export const initializeFirebase = (): boolean => {
    // 1. If already initialized, return true
    if (firestoreDb) return true;

    // 2. Try to load from storage
    const rawConfig = getConfig();
    if (!rawConfig) return false;

    const config = parseConfig(rawConfig);
    
    if (!config || !config.apiKey || !config.projectId) {
        if (rawConfig.length > 0) {
            console.error("Invalid Firebase Configuration Found (Check API Key/Project ID).");
        }
        return false;
    }

    try {
        let app: FirebaseApp;
        if (getApps().length === 0) {
            app = initializeApp(config);
        } else {
            app = getApp(); // Use existing app if HMR caused reload
        }

        // CRITICAL FIX: Use initializeFirestore with experimentalForceLongPolling
        // This resolves "Could not reach Cloud Firestore backend" errors in many environments
        try {
            firestoreDb = initializeFirestore(app, {
                experimentalForceLongPolling: true, 
                ignoreUndefinedProperties: true,
            });
            console.log("Firebase Connected Successfully (Long Polling Enabled) to Project:", config.projectId);
        } catch (initErr: any) {
            // Fallback: If already initialized with different settings (e.g. via hot reload), use existing instance
            if (initErr.code === 'failed-precondition') {
                console.warn("Firestore already initialized, using existing instance.");
                firestoreDb = getFirestore(app);
            } else {
                throw initErr;
            }
        }
        
        return true;
    } catch (e) {
        // Safe logging to avoid circular structure error
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Firebase Connection Failed:", msg);
        return false;
    }
};

export const getDb = (): Firestore | null => {
    if (!firestoreDb) {
        initializeFirebase();
    }
    return firestoreDb;
};

export const disconnectFirebase = () => {
    firestoreDb = null;
    localStorage.removeItem(CONFIG_KEY);
    window.location.reload();
};