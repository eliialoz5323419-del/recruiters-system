
import { getDb } from './firebaseClient';
import { collection, addDoc, doc, deleteDoc, updateDoc, setDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { Job, Candidate, MatchResult, User, UserRole, JobStatus } from '../types';
import { analyzeCandidateMatch, safeErrorMsg } from './geminiService';

// Helper to avoid "Converting circular structure to JSON" errors during logging
const safeLogErr = (msg: string, err: any) => {
    // safeErrorMsg is already imported from geminiService and handles circular refs
    console.error(msg, safeErrorMsg(err));
};

// --- AUTH & USERS ---

export const authenticateUser = async (name: string, email: string, role: UserRole): Promise<User> => {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  
  if (!db) {
      // Fallback purely for UI Demo if not connected (Offline Mode)
      return { id: 'guest', name, email: cleanEmail, role };
  }

  try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", cleanEmail));
      
      // Add a timeout to prevent hanging indefinitely if offline
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 15000));
      const snapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;

      if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const d = docSnap.data();
          
          // STRICT SANITIZATION: Ensure we only return primitives, not Firestore objects
          return { 
              id: docSnap.id, 
              name: typeof d.name === 'string' ? d.name : name,
              email: typeof d.email === 'string' ? d.email : cleanEmail,
              role: (d.role === 'ADMIN' || d.role === 'RECRUITER') ? d.role : role,
              avatar: typeof d.avatar === 'string' ? d.avatar : undefined
          } as User;
      } else {
          const newUser = {
              name, 
              email: cleanEmail, 
              role, 
              avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
              createdAt: new Date().toISOString()
          };
          const ref = await addDoc(usersRef, newUser);
          return { id: ref.id, ...newUser } as User;
      }
  } catch (error: any) {
      // Ensure we don't crash on circular error objects
      safeLogErr("Auth failed (offline or timeout)", error);
      return { id: 'offline_user', name, email: cleanEmail, role };
  }
};

export const deleteRecruiter = async (recruiterId: string) => {
    const db = getDb();
    if (!db) return;

    console.log(`Starting cascading delete for recruiter: ${recruiterId}`);

    try {
        // CASCADING DELETE LOGIC
        
        // 1. Find and Delete Jobs
        const jobsQ = query(collection(db, 'jobs'), where("recruiterId", "==", recruiterId));
        const jobsSnap = await getDocs(jobsQ);
        for (const jobDoc of jobsSnap.docs) {
            await deleteDoc(jobDoc.ref);
        }

        // 2. Find and Delete Candidates
        const candQ = query(collection(db, 'candidates'), where("recruiterId", "==", recruiterId));
        const candSnap = await getDocs(candQ);
        for (const candDoc of candSnap.docs) {
            await deleteDoc(candDoc.ref);
        }

        // 3. Find and Delete Matches related to this recruiter
        const matchJobQ = query(collection(db, 'matches'), where("jobRecruiterId", "==", recruiterId));
        const matchCandQ = query(collection(db, 'matches'), where("candidateRecruiterId", "==", recruiterId));
        
        const [mJobSnap, mCandSnap] = await Promise.all([getDocs(matchJobQ), getDocs(matchCandQ)]);
        
        const matchRefsToDelete = new Set<string>();
        mJobSnap.forEach(m => matchRefsToDelete.add(m.id));
        mCandSnap.forEach(m => matchRefsToDelete.add(m.id));

        const batch = writeBatch(db);
        let batchCount = 0;

        for (const matchId of Array.from(matchRefsToDelete)) {
            batch.delete(doc(db, 'matches', matchId));
            batchCount++;
        }
        if (batchCount > 0) await batch.commit();

        // 4. Finally, Delete the Recruiter User
        await deleteDoc(doc(db, 'users', recruiterId));
        console.log(`Successfully deleted recruiter ${recruiterId} and all related data.`);
    } catch (e: any) {
        safeLogErr("Delete recruiter failed", e);
    }
};

// --- JOBS ---

export const createJob = async (job: Job): Promise<void> => {
    const db = getDb();
    if (!db) return;

    // 1. Save Job
    const { id, ...data } = job;
    try {
        const jobRef = await addDoc(collection(db, 'jobs'), { ...data, createdAt: new Date().toISOString() });
        
        // 2. TRIGGER AUTO-MATCHING
        const candidatesSnap = await getDocs(collection(db, 'candidates'));
        const candidates = candidatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));

        for (const cand of candidates) {
            const analysis = await analyzeCandidateMatch(job.description, cand.resumeText);
            
            if (analysis.score >= 50) {
                const matchData: Omit<MatchResult, 'id'> = {
                    jobId: jobRef.id,
                    candidateId: cand.id,
                    jobRecruiterId: job.recruiterId,
                    candidateRecruiterId: cand.recruiterId,
                    score: analysis.score,
                    reasoning: analysis.reasoning,
                    isActive: true,
                    updatedAt: new Date().toISOString()
                };
                
                await setDoc(doc(db, 'matches', `${jobRef.id}_${cand.id}`), matchData);
            }
        }
    } catch (e) {
        safeLogErr("Job creation or auto-matching failed", e);
    }
};

export const deleteJob = async (jobId: string) => {
    const db = getDb();
    if (!db) return;
    
    try {
        await deleteDoc(doc(db, 'jobs', jobId));
        
        // Cleanup matches for this job
        const q = query(collection(db, 'matches'), where("jobId", "==", jobId));
        const snap = await getDocs(q);
        
        const batch = writeBatch(db);
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) {
        safeLogErr("Delete job failed", e);
    }
};

export const toggleJobStatus = async (id: string, currentStatus: JobStatus) => {
    const db = getDb();
    if (!db) return;
    const newStatus = currentStatus === 'OPEN' ? 'FILLED' : 'OPEN';
    try {
        await updateDoc(doc(db, 'jobs', id), { status: newStatus });
    } catch (e) {
        safeLogErr("Toggle job status failed", e);
    }
};

export const markJobAsFilled = async (jobId: string, candidateId: string) => {
    const db = getDb();
    if (!db) return;

    try {
        await updateDoc(doc(db, 'jobs', jobId), { 
            status: 'FILLED',
            hiredCandidateId: candidateId
        });

        const matchId = `${jobId}_${candidateId}`;
        await updateDoc(doc(db, 'matches', matchId), { isPlaced: true });
    } catch (e) {
        safeLogErr("Mark job as filled failed", e); 
    }
};

// --- CANDIDATES ---

export const createCandidate = async (candidate: Candidate): Promise<void> => {
    const db = getDb();
    if (!db) return;

    const { id, ...data } = candidate;
    try {
        const candRef = await addDoc(collection(db, 'candidates'), { ...data, createdAt: new Date().toISOString() });
        const newCandId = candRef.id;

        const jobsQ = query(collection(db, 'jobs'), where("status", "==", "OPEN"));
        const jobsSnap = await getDocs(jobsQ);
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

        for (const job of jobs) {
            const analysis = await analyzeCandidateMatch(job.description, candidate.resumeText);

            if (analysis.score >= 50) {
                const matchData: Omit<MatchResult, 'id'> = {
                    jobId: job.id,
                    candidateId: newCandId,
                    jobRecruiterId: job.recruiterId,
                    candidateRecruiterId: candidate.recruiterId,
                    score: analysis.score,
                    reasoning: analysis.reasoning,
                    isActive: true,
                    updatedAt: new Date().toISOString()
                };

                await setDoc(doc(db, 'matches', `${job.id}_${newCandId}`), matchData);
            }
        }
    } catch (e) {
        safeLogErr("Candidate creation or auto-matching failed", e);
    }
};

export const deleteCandidate = async (candId: string) => {
    const db = getDb();
    if (!db) return;

    try {
        await deleteDoc(doc(db, 'candidates', candId));

        const q = query(collection(db, 'matches'), where("candidateId", "==", candId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) {
        safeLogErr("Delete candidate failed", e);
    }
};

// --- MAINTENANCE & CLEANUP TOOLS ---

export const purgeLowQualityMatches = async () => {
    const db = getDb();
    if (!db) return 0;

    try {
        const snap = await getDocs(collection(db, 'matches'));
        const batch = writeBatch(db);
        let count = 0;

        snap.forEach(doc => {
            const data = doc.data() as MatchResult;
            if (data.score < 50) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) await batch.commit();
        console.log(`Purged ${count} low quality matches.`);
        return count;
    } catch (e) {
        safeLogErr("Purge failed", e);
        return 0;
    }
};

export const cleanupOrphanedData = async () => {
    const db = getDb();
    if (!db) return 0;

    try {
        const jobsSnap = await getDocs(collection(db, 'jobs'));
        const jobIds = new Set(jobsSnap.docs.map(d => d.id));

        const candSnap = await getDocs(collection(db, 'candidates'));
        const candIds = new Set(candSnap.docs.map(d => d.id));

        const matchesSnap = await getDocs(collection(db, 'matches'));
        const batch = writeBatch(db);
        let deletedCount = 0;

        matchesSnap.forEach(doc => {
            const data = doc.data() as MatchResult;
            if (!jobIds.has(data.jobId) || !candIds.has(data.candidateId)) {
                batch.delete(doc.ref);
                deletedCount++;
            }
        });

        if (deletedCount > 0) await batch.commit();
        console.log(`Cleaned up ${deletedCount} orphaned matches.`);
        return deletedCount;
    } catch (e) {
        safeLogErr("Cleanup orphaned data failed", e);
        return 0;
    }
};

// --- BULK DELETIONS ---

const deleteCollectionInBatches = async (collectionName: string) => {
    const db = getDb();
    if (!db) return;
    
    try {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        const BATCH_SIZE = 450;
        let batch = writeBatch(db);
        let count = 0;
        let batchPromises = [];

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            count++;
            if (count >= BATCH_SIZE) {
                batchPromises.push(batch.commit());
                batch = writeBatch(db);
                count = 0;
            }
        }

        if (count > 0) {
            batchPromises.push(batch.commit());
        }

        await Promise.all(batchPromises);
    } catch (e) {
        safeLogErr(`Failed to delete collection: ${collectionName}`, e);
    }
};

export const deleteAllMatches = async () => {
    await deleteCollectionInBatches('matches');
};

export const deleteAllJobs = async () => {
    await deleteCollectionInBatches('jobs');
    await deleteAllMatches();
};

export const deleteAllCandidates = async () => {
    await deleteCollectionInBatches('candidates');
    await deleteAllMatches();
};

export const deleteAllRecruiters = async (currentUserId?: string) => {
    const db = getDb();
    if (!db) return;
    
    try {
        const snap = await getDocs(collection(db, 'users'));
        let batch = writeBatch(db);
        let count = 0;
        let batchPromises = [];
        
        snap.forEach(d => {
            if (d.id !== currentUserId) {
                batch.delete(d.ref);
                count++;
                if (count >= 450) {
                    batchPromises.push(batch.commit());
                    batch = writeBatch(db);
                    count = 0;
                }
            }
        });
        
        if (count > 0) batchPromises.push(batch.commit());
        await Promise.all(batchPromises);

        await deleteAllJobs();
        await deleteAllCandidates();
        await deleteAllMatches();
    } catch (e) {
        safeLogErr("Failed to delete all recruiters", e);
    }
};
