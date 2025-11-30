
// SUPABASE CLIENT DISABLED - MIGRATED TO FIRESTORE
// Leaving empty shell to prevent import errors if any files still reference it.

export const initializeSupabase = () => {
    // No-op
};

export const getSupabase = () => null;

export const validateSupabaseConnection = async (url: string, key: string) => {
    return { success: false, message: 'Supabase has been deprecated. Please use Firebase.' };
};

export const connectToSupabase = (url: string, key: string) => {
    return false;
};

export const disconnectSupabase = () => {
    // No-op
};

export const isSupabaseConfigured = () => false;
