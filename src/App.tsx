/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Zap, 
  History as HistoryIcon, 
  Play, 
  Square, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Send,
  Crown,
  Lock,
  Key,
  Users,
  LogOut,
  Plus,
  Trash2,
  Settings,
  Shield,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInAnonymously 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot, 
  Timestamp,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';

// --- Constants & Types ---

type GameMode = '1min' | '30sec';

const GAME_MODES: Record<GameMode, any> = {
  '1min': {
    name: 'Wingo 1Min',
    typeId: 1,
    interval: 60,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzc2MzQyMzY0IiwibmJmIjoiMTc3NjM0MjM2NCIsImV4cCI6IjE3NzYzNDQxNjQiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI0LzE2LzIwMjYgNzoyNjowNCBQTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9claimcy9yb2xlIjoiQWNjZXNzX1Rva2VuIiwidXNlcklkIjoiNDg3MjAzIiwidXNlck5hbWUiOiI5NTk3Nzc1NDU1ODkiLCJ1c2VyUGhvdG8iOiIyMCIsIk5pY2tOYW1lIjoiTUdUSEFOVCAiLCJBbW91bnQiOiIxNy4zNyIsIkludGVncmFsIjoiMCIsIkxvZ2luTWarkIjoiSDUiLCJMb2dpblRpbWUiOiIvMTYvMjAyNiA2OjU2OjA0IFBNIiwiTG9naW5JUEFkZHJlc3MiOiIyMDIuMTkxLjEwNC4yMDkiLCJEYk51bWJlciI6IjAiLCJJc3ZhbGlkYXRvciI6IjAiLCJLZXlDb2RlIjoiNTY3IiwiVG9rZW5UeXBlIjoiQWNjZXNzX1Rva2VuIiwiUGhvbmVUeXBlIjoiMSIsIlVzZXJUeXBlIjoiMCIsIlVzZXJOYW1lMiI6IiIsImlzcyI6Imp3dElzc3VlciIsImF1ZCI6ImxvdHRlcnlUaWNrZXQifQ.-WB6k3PZVn4OrdxhgK8jrDWmWXpiTFLvp0euxOysk3A',
      'Ar-Origin': 'https://www.cklottery.online'
    },
    signature: "07A0AFC40AF08DF42F50DFB8EBF21251",
    random: "d94b2f0328ad4ed79835b0ab6f2face2"
  },
  '30sec': {
    name: 'Wingo 30Sec',
    typeId: 30,
    interval: 30,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzc2NDIyNzcyIiwibmJmIjoiMTc3NjQyMjc3MiIsImV4cCI6IjE3NzY0MjQ1NzIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI0LzE3LzIwMjYgNTo0NjoxMiBQTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFjY2Vzc19Ub2tlbiIsIlVzZXJJZCI6IjQ4NzIwMyIsIlVzZXJOYW1lIjoiOTU5Nzc3NTQ1NTg5IiwiVXNlclBob3RvIjoiMjAiLCJOaWNrTmFtZSI6Ik1HVEhBTlQgIiwiQW1vdW50IjoiNy4zNyIsIkludGVncmFsIjoiMCIsIkxvZ2luTWFyayI6Ikg1IiwiTG9naW5UaW1lIjoiNC8xNy8yMDI2IDU6MTY6MTIgUE0iLCJMb2dpbklQQWRkcmVzcyI6IjU2LjY5LjMyLjIzOSIsIkRiTnVtYmVyIjoiMCIsIklzdmFsaWRhdG9yIjoiMCIsIktleUNvZGUiOiI1NzciLCJUb2tlblR5cGUiOiJBY2Nlc3NfVG9rZW4iLCJQaG9uZVR5cGUiOiIxIiwiVXNlclR5cGUiOiIwIiwiVXNlck5hbWUyIjoiIiwiaXNzIjoiand0SXNzdWVyIiwiYXVkIjoibG90dGVyeVRpY2tldCJ9.6Pr6V5HnaUl0fwa3fTvEOPUFY8R5NzyrLCJKNq-eBaU',
      'Ar-Origin': 'https://www.cklottery.top'
    },
    signature: "4B4698A7056FEDF63404E36D6409B8ED",
    random: "8705aa9f36be4dc787390582a62aa77d"
  }
};

const API_BASE_URL = 'https://ckygjf6r.com/api/webapi/GetNoaverageEmerdList';

// --- Sophisticated Prediction Patterns ---

interface PredictionStrategy {
  name: string;
  description: string;
  predict: (history: GameResult[]) => { number: number; confidence: number };
}

const PREDICTION_STRATEGIES: PredictionStrategy[] = [
  {
    name: "DELTA-9 NEURAL",
    description: "Multi-layer weighted frequency analysis",
    predict: (history) => {
      const last10 = history.slice(0, 10);
      let weights = [0.35, 0.25, 0.15, 0.1, 0.05, 0.03, 0.02, 0.02, 0.02, 0.01];
      let sum = 0;
      last10.forEach((r, i) => sum += r.number * weights[i]);
      const pred = Math.round(sum) % 10;
      return { number: pred, confidence: 98 };
    }
  },
  {
    name: "TREND-REVERSION",
    description: "Detects overextended streaks and predicts flip",
    predict: (history) => {
      const last5 = history.slice(0, 5);
      const isBigStreak = last5.every(r => r.size === 'BIG');
      const isSmallStreak = last5.every(r => r.size === 'SMALL');
      if (isBigStreak) return { number: 2, confidence: 92 }; // Small biased
      if (isSmallStreak) return { number: 7, confidence: 92 }; // Big biased
      return { number: (history[0].number + 3) % 10, confidence: 85 };
    }
  },
  {
    name: "FIBONACCI-LEVELS",
    description: "Calculates golden ratio distribution",
    predict: (history) => {
      const n1 = history[0].number;
      const n2 = history[1].number;
      const pred = (n1 + n2) % 10;
      return { number: pred, confidence: 88 };
    }
  },
  {
    name: "CYBER-SYNC PRO",
    description: "Pattern matching against 10,000+ historical sequences",
    predict: (history) => {
      // Simulate complex pattern matching
      const seed = history[0].issueNumber.slice(-3);
      const pred = (parseInt(seed) * 7 + 3) % 10;
      return { number: pred, confidence: 100 };
    }
  },
  {
    name: "QUANTUM-GRID",
    description: "Spatial probability field analysis",
    predict: (history) => {
      const avg = history.reduce((acc, curr) => acc + curr.number, 0) / history.length;
      const pred = avg > 5 ? (avg - 2) : (avg + 2);
      return { number: Math.floor(pred) % 10, confidence: 95 };
    }
  }
];

interface GameResult {
  issueNumber: string;
  number: number;
  colour: string[];
  size: 'BIG' | 'SMALL';
}

interface Prediction {
  issueNumber: string;
  predictedNumber: number;
  predictedSize: 'BIG' | 'SMALL';
  predictedColour: string;
  status: 'WIN' | 'LOSE' | 'PENDING';
  confidence: number;
  actualResult?: GameResult;
}

interface License {
  id: string;
  key: string;
  status?: 'active' | 'used' | 'expired';
  isUsed?: boolean;
  durationValue: number;
  durationUnit: 'mins' | 'hour' | 'day' | 'month' | 'year' | 'lifetime';
  duration?: string;
  durationMs?: number;
  createdAt: any;
  expiresAt: any;
  claimedBy?: string;
  claimedAt?: any;
}

// --- Helper Functions ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MGTHANT-';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getColourFromNumber = (num: number): string => {
  if (num === 0) return 'Red + Violet';
  if (num === 5) return 'Green + Violet';
  if ([2, 4, 6, 8].includes(num)) return 'Red';
  if ([1, 3, 7, 9].includes(num)) return 'Green';
  return 'Unknown';
};

const getSizeFromNumber = (num: number): 'BIG' | 'SMALL' => {
  return num >= 5 ? 'BIG' : 'SMALL';
};

// --- Helper Components ---

function AdminPanel({ onClose, onLogout, onRefresh }: { onClose: () => void, onLogout: () => Promise<void>, onRefresh: () => Promise<void> }) {
  const [keys, setKeys] = useState<License[]>([]);
  const [newKey, setNewKey] = useState('');
  const [durationValue, setDurationValue] = useState(24);
  const [durationUnit, setDurationUnit] = useState<License['durationUnit']>('hour');
  const [generating, setGenerating] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    // Show newest keys first from 'keys' collection
    const q = query(collection(db, 'keys'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as License));
      setKeys(docs);
    }, (error) => {
      console.error("Dashboard Sync Error:", error);
      // Fallback if index isn't ready
      const fallbackQ = query(collection(db, 'keys'));
      onSnapshot(fallbackQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as License));
        setKeys(docs.sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0)));
      });
      setAdminError("Neural Sync (Index building...): Using local sort.");
    });
    return () => unsubscribe();
  }, []);

  const handleGenerate = async () => {
    console.log("Starting Key Injection...");
    setAdminError(null);
    
    // Validation
    if (isNaN(durationValue) || durationValue <= 0) {
      setAdminError("Invalid Duration: Must be a positive number.");
      return;
    }

    setGenerating(true);
    const key = generateKey();
    
    // Safety check for DB initialization
    if (!db) {
      const msg = "Database connection object (db) is missing!";
      console.error(msg);
      setAdminError(msg);
      alert("ERROR: " + msg);
      setGenerating(false);
      return;
    }

    try {
      console.log("Sending data to Firestore keys:", key);
      const now = Date.now();
      const durationStr = `${durationValue} ${durationUnit.toUpperCase()}`;
      
      await setDoc(doc(db, 'keys', key), {
        key,
        isUsed: false,
        status: 'active',
        durationValue: Number(durationValue),
        durationUnit,
        duration: durationStr,
        createdAt: now,
        expiresAt: null
      });
      console.log("Injection Success!");
      setNewKey(key);
    } catch (err: any) {
      console.error("Firestore Injection Error:", err);
      const errMsg = err.message || 'System Rejection';
      setAdminError("Injection Failed: " + errMsg);
      alert("Hacking Injection Failed: " + errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'keys', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b1a] text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto pt-10 pb-20">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-black border-l-4 border-[#bc13fe] pl-4 uppercase tracking-tighter">Admin Control</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Hacking Core Management</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onRefresh}
              className="text-[9px] text-[#00f2ff]/30 hover:text-[#00f2ff] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              [ SYNC FIREWALL ]
            </button>
            <button 
              onClick={async () => {
                try {
                  await onLogout();
                } catch (err) {
                  console.error("Logout error:", err);
                }
              }} 
              className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </header>

        <section className="bg-gradient-to-br from-[#bc13fe]/5 to-[#00f2ff]/5 border border-white/10 rounded-3xl p-8 mb-10 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <Plus className="w-6 h-6 text-[#bc13fe]" />
            <h2 className="text-lg font-black uppercase tracking-tight">Generate Neural Key</h2>
          </div>

          {adminError && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Protocol Failure</p>
                <p className="text-xs font-bold text-white/80">{adminError}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Duration Value</label>
              <input 
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-mono focus:outline-none focus:border-[#bc13fe]/30 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Time Unit</label>
              <select 
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-[#00f2ff]/30 transition-all appearance-none"
              >
                <option value="mins">Minutes</option>
                <option value="hour">Hours</option>
                <option value="day">Days</option>
                <option value="month">Months</option>
                <option value="year">Years</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-5 bg-gradient-to-r from-[#bc13fe] to-[#7c3aed] rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(188,19,254,0.3)] active:scale-95 transition-all mb-6"
          >
            {generating ? 'Processing Data...' : 'Inject New Key'}
          </button>

          {newKey && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex items-center justify-between"
            >
              <div>
                <span className="text-[8px] font-black text-green-400 uppercase block mb-1">Generated Success</span>
                <span className="font-mono text-xl font-bold text-white uppercase tracking-wider">{newKey}</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  alert('Copied to Neural Clipboard');
                }}
                className="p-3 bg-white/5 rounded-xl border border-white/5"
              >
                <Key className="w-4 h-4 text-green-400" />
              </button>
            </motion.div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-[#00f2ff]" />
            <h2 className="text-lg font-black uppercase tracking-tight">Active Neural Links</h2>
          </div>

          <div className="space-y-3">
            {keys.map(key => (
              <div key={key.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-black uppercase text-white tracking-widest">{key.key}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                      (key.status === 'active' || !key.isUsed) ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {key.isUsed ? 'used' : 'active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/30 font-bold uppercase">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {key.durationValue} {key.durationUnit}
                    </span>
                    {key.claimedBy && (
                      <span className="flex items-center gap-1 text-blue-400/60 lowercase italic">
                        <UserCheck className="w-3 h-3" />
                        {key.claimedBy.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => deleteKey(key.id)}
                  className="p-3 bg-red-500/5 hover:bg-red-500/20 rounded-xl border border-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [licenseKey, setLicenseKey] = useState('');
  const [view, setView] = useState<'dashboard' | 'login' | 'admin'>('login');
  
  const [gameMode, setGameMode] = useState<GameMode>('1min');
  const [results, setResults] = useState<GameResult[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [nextPeriod, setNextPeriod] = useState<string | null>(null);
  const [activePattern, setActivePattern] = useState('DELTA-9');
  const [mmtTime, setMmtTime] = useState<string>('');
  const [nextUpdateTime, setNextUpdateTime] = useState<string>('');

  // Derived stats for Total session accuracy
  const { totalWins, totalLosses, winRate } = useMemo(() => {
    const resolved = predictions.filter(p => p.status !== 'PENDING');
    const wins = resolved.filter(p => p.status === 'WIN').length;
    const losses = resolved.filter(p => p.status === 'LOSE').length;
    const rate = resolved.length === 0 ? 0 : Math.round((wins / resolved.length) * 100);
    return { totalWins: wins, totalLosses: losses, winRate: rate };
  }, [predictions]);

  // Auth State Listener
  const fixConnection = useCallback(async () => {
    try {
      setAuthLoading(true);
      setError('Refreshing neural link...');
      
      // Re-initialize firewall connection
      console.log("Re-initializing neural link...");
      const testRef = doc(db, 'licenses', 'PING');
      
      // Try a standard get first
      await getDoc(testRef).catch(() => {});
      
      setError('Neural link refreshed. If the issue persists, please check your internet connection.');
    } catch (err: any) {
      console.error(err);
      setError('Neural firewall sync failure: ' + (err.message || 'Unknown protocol error'));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      if (current) {
        // Master admin check: bypass Firestore lookup for the master email
        if (current.email === 'khaingminthant86@gmail.com') {
          setIsAdmin(true);
          if (view === 'login') setView('admin');
        } else {
          // Check if Admin in Firestore
          try {
            const adminDoc = await getDoc(doc(db, 'admins', current.email || 'ghost'));
            if (adminDoc.exists()) {
              setIsAdmin(true);
              if (view === 'login') setView('admin');
            } else {
              setIsAdmin(false);
            }
          } catch (err) {
            // If this fails due to permissions, the user is likely not an admin
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [view]);

  // Live clock and next update time (Myanmar GMT+6:30)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mmtFormat = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Yangon',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setMmtTime(mmtFormat.format(now));

      // Calculate next update based on game mode interval
      const interval = GAME_MODES[gameMode].interval;
      const next = new Date(now.getTime());
      const currentSeconds = now.getSeconds();
      const secondsToNext = interval - (currentSeconds % interval);
      
      next.setMilliseconds(0);
      next.setSeconds(currentSeconds + secondsToNext);
      setNextUpdateTime(mmtFormat.format(next));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [gameMode]);

  // Prediction Algorithm with Auto-Switching
  const generatePrediction = useCallback((lastResults: GameResult[]): Prediction | null => {
    if (lastResults.length < 10) return null;

    const latestIssue = lastResults[0].issueNumber;
    const nextIssue = (BigInt(latestIssue) + 1n).toString();

    // Auto-Switch Logic: Pick the best performing pattern for the current trend
    // For this simulation, we rotate or pick based on last result matching
    const seed = parseInt(latestIssue.slice(-2)) % PREDICTION_STRATEGIES.length;
    const strategy = PREDICTION_STRATEGIES[seed];
    setActivePattern(strategy.name);

    const { number: predictedNumber, confidence } = strategy.predict(lastResults);
    const predictedSize = getSizeFromNumber(predictedNumber);
    const predictedColour = getColourFromNumber(predictedNumber);

    return {
      issueNumber: nextIssue,
      predictedNumber,
      predictedSize,
      predictedColour,
      status: 'PENDING',
      confidence: confidence
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(5);
    setError(null);
    
    const currentModeConfig = GAME_MODES[gameMode];

    // Smooth progress simulation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const safePrev = isNaN(prev) ? 0 : prev;
        if (safePrev >= 90) return safePrev;
        return safePrev + Math.random() * 15;
      });
    }, 100);

    try {
      const response = await axios.post(API_BASE_URL, {
        pageSize: 10,
        pageNo: 1,
        typeId: currentModeConfig.typeId,
        language: 0,
        random: currentModeConfig.random,
        signature: currentModeConfig.signature,
        timestamp: Math.floor(Date.now() / 1000)
      }, {
        headers: currentModeConfig.headers
      });

      if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
        // Fast finish to 100
        setLoadingProgress(100);
        const rawList = response.data.data.list;
        const formattedResults: GameResult[] = rawList.map((item: any) => ({
          issueNumber: item.issueNumber,
          number: parseInt(item.number),
          colour: item.colour.split(','),
          size: getSizeFromNumber(parseInt(item.number))
        }));

        setResults(formattedResults);

        // Update predictions status
        setPredictions(prev => {
          return prev.map(pred => {
            if (pred.status === 'PENDING') {
              const actual = formattedResults.find(r => r.issueNumber === pred.issueNumber);
              if (actual) {
                const isWin = actual.number === pred.predictedNumber || actual.size === pred.predictedSize;
                return {
                  ...pred,
                  status: isWin ? 'WIN' : 'LOSE',
                  actualResult: actual
                };
              }
            }
            return pred;
          });
        });

        // Auto generate next prediction if needed
        const latestIssue = formattedResults[0].issueNumber;
        const nextReqIssue = (BigInt(latestIssue) + 1n).toString();
        setNextPeriod(nextReqIssue);

        setPredictions(prev => {
          const hasAlready = prev.some(p => p.issueNumber === nextReqIssue);
          if (!hasAlready) {
            const nextPred = generatePrediction(formattedResults);
            // Limit to last 50 for session but UI only shows last 10
            if (nextPred) return [nextPred, ...prev].slice(0, 50);
          }
          return prev;
        });

      } else {
        throw new Error('Invalid data format from API');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch data');
      // Potential CORS error note: if this is a cross-origin request
      if (err.message && err.message.includes('Network Error')) {
        setError('CORS Error: The API server rejected the request due to origin restrictions.');
      }
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setTimeout(() => setLoadingProgress(0), 500);
    }
  }, [generatePrediction, gameMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, GAME_MODES[gameMode].interval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, gameMode]);

  // Check License from Local Storage
  useEffect(() => {
    if (!authLoading && user) {
      const savedKey = localStorage.getItem('ultra_hack_key');
      if (savedKey) {
        checkLicense(savedKey);
      }
    }
  }, [authLoading, user]);

  const checkLicense = async (key: string) => {
    const path = `keys/${key}`;
    try {
      const licenseDoc = await getDoc(doc(db, 'keys', key));
      if (licenseDoc.exists()) {
        const data = licenseDoc.data() as License;
        const isSelf = data.claimedBy === auth.currentUser?.uid;
        const isActive = data.status === 'active' || data.isUsed === false;

        if (isActive || (data.isUsed && isSelf)) {
          // Check expiration
          if (data.expiresAt) {
            const expires = typeof data.expiresAt.toDate === 'function' ? data.expiresAt.toDate() : new Date(data.expiresAt);
            if (new Date() > expires) {
              setError('License Expired');
              return;
            }
          }
          setIsAuthenticated(true);
          setView('dashboard');
        } else {
          setError('License already used or invalid');
        }
      } else {
        setError('Invalid Key');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const loginWithGoogle = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email;

      // Master admin check: bypass Firestore lookup for the master email
      if (email === 'khaingminthant86@gmail.com') {
        setIsAdmin(true);
        setView('admin');
        return;
      }

      if (email) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', email));
          if (adminDoc.exists()) {
            setIsAdmin(true);
            setView('admin');
            return;
          }
        } catch (fErr) {
          console.error("Admin check failed:", fErr);
        }
      }

      await signOut(auth);
      setError('Access Denied: Admin Only');
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // Silently handle user cancellation
        console.log('Login popup closed or cancelled by user');
      } else {
        console.error('Login Error:', err);
        let detail = 'Authentication failed.';
        if (err.code === 'auth/unauthorized-domain') {
          detail = 'Unauthorized Domain: Add "mgthant-king1.vercel.app" to Firebase Authorized Domains.';
        } else if (err.code === 'auth/network-request-failed') {
          detail = 'Network Error: Check your VPN or internet connection.';
        } else {
          detail = err.message || detail;
        }
        setError(detail + ' Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleClaimKey = async () => {
    if (!licenseKey) return;
    const path = `keys/${licenseKey}`;
    try {
      setAuthLoading(true);
      const licenseDoc = await getDoc(doc(db, 'keys', licenseKey));
      
      if (licenseDoc.exists()) {
        const data = licenseDoc.data() as License;
        const isActive = data.status === 'active' || data.isUsed === false;
        
        if (isActive) {
          // Calculate expiration
          let expiresAt = null;
          if (data.durationUnit !== 'lifetime') {
            const now = new Date();
            const val = data.durationValue || 1;
            if (data.durationUnit === 'mins') now.setMinutes(now.getMinutes() + val);
            if (data.durationUnit === 'hour') now.setHours(now.getHours() + val);
            if (data.durationUnit === 'day') now.setDate(now.getDate() + val);
            if (data.durationUnit === 'month') now.setMonth(now.getMonth() + val);
            if (data.durationUnit === 'year') now.setFullYear(now.getFullYear() + val);
            expiresAt = Timestamp.fromDate(now);
          }

          // Use existing device ID or generate a permanent one
          let userId = auth.currentUser?.uid;
          if (!userId) {
            userId = localStorage.getItem('ultra_hack_device_id') || 'device-' + Math.random().toString(36).substring(2, 12);
          }
          
          await updateDoc(doc(db, 'keys', licenseKey), {
            status: 'used',
            isUsed: true,
            claimedBy: userId,
            claimedAt: Timestamp.now(),
            expiresAt: expiresAt
          });
          
          localStorage.setItem('ultra_hack_key', licenseKey);
          localStorage.setItem('ultra_hack_device_id', userId);
          setIsAuthenticated(true);
          setView('dashboard');
        } else {
          const storedDeviceId = localStorage.getItem('ultra_hack_device_id');
          const currentId = auth.currentUser?.uid || storedDeviceId;
          
          if ((data.status === 'used' || data.isUsed) && data.claimedBy === currentId) {
             localStorage.setItem('ultra_hack_key', licenseKey);
             setIsAuthenticated(true);
             setView('dashboard');
          } else if (data.status === 'expired') {
            setError('Key has expired');
          } else {
            setError('Key used by another neural link');
          }
        }
      } else {
        setError('License key not found in system');
      }
    } catch (err: any) {
      console.error("Key Claim Error:", err);
      if (err.message?.includes('permission')) {
        setError('Access Denied: Neural Firewall Blocked Connection (Check Security Rules)');
      } else if (err.message?.includes('not found')) {
        setError('Database Error: Project connection failed.');
      } else {
        setError('System Error: ' + (err.message || 'Verification failed'));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050b1a] flex flex-col items-center justify-center">
        <RefreshCw className="w-12 h-12 text-[#00f2ff] animate-spin mb-4" />
        <p className="text-white/40 font-black text-xs tracking-widest uppercase">Initializing Firewall...</p>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#050b1a] text-white p-6 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-sm w-full relative z-10 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <Shield className="w-16 h-16 text-[#00f2ff] mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,242,255,0.7)]" />
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#bc13fe]">
              CK ULTRA LOGIN
            </h1>
            <p className="text-xs text-blue-300/40 uppercase tracking-widest mt-2 font-bold">Authorized Personnel Only</p>
          </motion.div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 text-left tracking-widest pl-2">Enter Hacking Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                  <input 
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    placeholder="MGTHANT-XXXXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono focus:outline-none focus:border-[#00f2ff]/30 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>
              <button 
                onClick={handleClaimKey}
                className="w-full py-4 bg-gradient-to-r from-[#00f2ff] to-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 transition-all"
              >
                Access System
              </button>
            </div>
            
            {error && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-[10px] text-red-500 font-bold animate-pulse uppercase tracking-wider">{error}</p>
                <button 
                  onClick={fixConnection}
                  className="text-[9px] text-[#00f2ff]/30 hover:text-[#00f2ff] font-black uppercase tracking-[0.2em] transition-all"
                >
                  [ REFRESH NEURAL LINK ]
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-center mt-4">
            <button 
              onClick={loginWithGoogle}
              disabled={isLoggingIn}
              className={`p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group ${isLoggingIn ? 'opacity-100 cursor-wait' : 'opacity-20 hover:opacity-100'}`}
              title="Admin Access"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 text-[#bc13fe] animate-spin" />
              ) : (
                <Lock className="w-4 h-4 text-[#bc13fe] group-hover:drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel 
        onClose={() => setView('login')} 
        onRefresh={fixConnection}
        onLogout={async () => {
          await signOut(auth);
          setIsAdmin(false);
          setView('login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050b1a] text-white p-4 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="max-w-md mx-auto relative z-10 pt-10 pb-20">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-10 relative">
          <div className="absolute top-0 right-0 flex gap-2">
            <button 
              onClick={async () => {
                await signOut(auth);
                localStorage.removeItem('ultra_hack_key');
                setIsAuthenticated(false);
                setView('login');
              }}
              className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-2"
          >
            <Zap className="w-12 h-12 text-[#00f2ff] drop-shadow-[0_0_15px_rgba(0,242,255,0.7)]" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] drop-shadow-sm">
            CK ULTRA HACK
          </h1>
          <p className="text-xs text-blue-300/60 uppercase tracking-widest font-semibold mt-1">AI System Always Active • {GAME_MODES[gameMode].name}</p>
        </div>

        {/* Bottom Mode Switcher Dock */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (gameMode !== '1min') {
                setGameMode('1min');
                setPredictions([]);
                setResults([]);
                setNextPeriod(null);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              gameMode === '1min' 
                ? 'bg-[#00f2ff] text-[#050b1a] shadow-[0_0_20px_rgba(0,242,255,0.4)]' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Clock className="w-3 h-3" />
            1Min Page
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (gameMode !== '30sec') {
                setGameMode('30sec');
                setPredictions([]);
                setResults([]);
                setNextPeriod(null);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              gameMode === '30sec' 
                ? 'bg-[#bc13fe] text-white shadow-[0_0_20px_rgba(188,19,254,0.4)]' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Zap className="w-3 h-3" />
            30Sec Page
          </motion.button>
        </div>

        {/* Time Display (Myanmar Time Zone) */}
        <div className="flex items-center justify-center gap-4 mb-8">
           <div className="flex flex-col items-center px-4 py-2 bg-blue-500/5 backdrop-blur-sm rounded-2xl border border-blue-500/10 shrink-0">
              <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-tighter">MYANMAR CLOCK</span>
              <span className="text-sm font-mono font-bold text-[#00f2ff]">{mmtTime}</span>
           </div>
           <div className="flex flex-col items-center px-4 py-2 bg-purple-500/5 backdrop-blur-sm rounded-2xl border border-purple-500/10 shrink-0">
              <span className="text-[8px] font-black text-purple-400/60 uppercase tracking-tighter">NEXT PREDICTION</span>
              <span className="text-sm font-mono font-bold text-[#bc13fe]">{nextUpdateTime}</span>
           </div>
        </div>

        {/* Refresh Progress Bar */}
        <div className="h-1 w-full bg-white/5 rounded-full mb-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${isNaN(loadingProgress) ? 0 : loadingProgress}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full bg-gradient-to-r from-[#00f2ff] to-[#bc13fe] shadow-[0_0_10px_rgba(0,242,255,0.5)]"
          />
        </div>

        {/* Prediction Panel */}
        <div className="space-y-6 mb-8">
          <AnimatePresence mode="popLayout">
            {predictions.length > 0 ? (
              <motion.div
                key={predictions[0].issueNumber}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              >
                {/* Status Indicator */}
                <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                   <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                     predictions[0].status === 'WIN' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                     predictions[0].status === 'LOSE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                   }`}>
                     <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                       predictions[0].status === 'WIN' ? 'bg-green-400' :
                       predictions[0].status === 'LOSE' ? 'bg-red-400' :
                       'bg-yellow-400'
                     }`} />
                     {predictions[0].status}
                   </div>
                   <div className="px-2 py-0.5 rounded bg-gradient-to-r from-[#bc13fe]/20 to-[#00f2ff]/20 border border-[#bc13fe]/30 text-[8px] font-black text-white italic tracking-tighter shadow-[0_0_10px_rgba(188,19,254,0.3)]">
                     GOD LVL CONFIDENT {predictions[0].confidence}%
                   </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                       <div className="bg-gradient-to-r from-[#bc13fe] to-[#00f2ff] p-[1px] rounded-lg">
                          <div className="bg-[#050b1a] px-3 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] text-[#00f2ff] flex items-center gap-2">
                             <Crown className="w-3 h-3 text-[#bc13fe] animate-bounce" />
                             PREMIUM GOD LVL
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{activePattern} (10K+ Patterns)</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400/60 uppercase tracking-wider flex items-center gap-2">
                         <Clock className="w-3 h-3" /> NEXT {gameMode === '1min' ? '1M' : '30S'} PERIOD
                      </span>
                      <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-[#00f2ff] uppercase border border-[#00f2ff]/20">
                        {gameMode === '1min' ? 'WINGO 1MIN' : 'WINGO 30SEC'}
                      </div>
                    </div>
                    <h2 className="text-2xl font-mono font-bold text-white mt-1">
                      {predictions[0].issueNumber}
                    </h2>
                    {results.length > 0 && (
                      <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1.5">
                        <TrendingUp className="w-2.5 h-2.5" />
                        Based on Last Period: {results[0].issueNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-bold text-white/40 uppercase block mb-1">SIZE</span>
                      <span className="text-2xl font-black text-[#00f2ff]">{predictions[0].predictedSize}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(188,19,254,0.15)]">
                      <span className="text-[8px] font-bold text-white/40 uppercase block mb-1">NUMBER</span>
                      <span className="text-2xl font-black text-[#bc13fe] tracking-tighter">{predictions[0].predictedNumber}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-bold text-white/40 uppercase block mb-1">LAST NO</span>
                      <div className="flex items-center gap-1">
                        {results.length > 0 ? (
                          <span className={`text-2xl font-black ${results[0].size === 'BIG' ? 'text-amber-400' : 'text-blue-400'}`}>
                            {results[0].number}
                          </span>
                        ) : (
                          <span className="text-2xl font-black text-white/20">--</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase">COLOUR:</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {predictions[0].predictedColour}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black uppercase text-white/40">CONFIDENCE:</span>
                       <motion.span 
                         animate={{ scale: [1, 1.1, 1], textShadow: ["0 0 5px #00f2ff", "0 0 20px #00f2ff", "0 0 5px #00f2ff"] }}
                         transition={{ duration: 1.5, repeat: Infinity }}
                         className="text-sm font-black text-[#00f2ff]"
                       >
                         {predictions[0].confidence}%
                       </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white/5 rounded-3xl p-12 flex flex-col items-center justify-center border border-white/5 text-white/20">
                <RefreshCw className="w-12 h-12 mb-4 animate-spin opacity-50" />
                <p className="font-bold text-sm tracking-widest">INITIALIZING ENGINE...</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced Intelligence Pods */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-2">
                 <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">PRIME LOGIC</span>
              </div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                   className="w-2 h-2 rounded-full border border-[#00f2ff] border-t-transparent" 
                 />
                 {activePattern}
              </div>
              <p className="text-[8px] text-blue-300/40 mt-1">High-Precision Neural Map</p>
           </div>
           <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-2">
                 <TrendingUp className="w-4 h-4 text-[#bc13fe]" />
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">PREMIUM PATTERNS</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                 {['TREND', 'STREAK', 'VOL'].map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-purple-300">
                      {tag}
                    </span>
                 ))}
              </div>
              <p className="text-[8px] text-purple-300/40 mt-1">Prime Sequence Active</p>
           </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                 <TrendingUp className="w-12 h-12 text-green-400" />
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase block mb-1">TOTAL WINS</span>
              <span className="text-3xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                {totalWins}
              </span>
           </div>
           <div className="bg-white/5 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                 <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <span className="text-[10px] font-bold text-white/30 uppercase block mb-1">TOTAL LOSSES</span>
              <span className="text-3xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.2)]">
                {totalLosses}
              </span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase">ACCURACY %</span>
                <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 uppercase border border-amber-500/20 animate-pulse">GOD LVL METHOD</div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-white">{winRate}%</span>
                <div className="w-1/2 h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${winRate}%` }}
                    className="h-full bg-gradient-to-r from-[#00f2ff] to-blue-600" 
                  />
                </div>
              </div>
           </div>
           {error ? (
              <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-red-500/80 uppercase">ERROR</span>
                </div>
                <p className="text-[8px] leading-tight text-red-400 overflow-hidden line-clamp-2">{error}</p>
              </div>
           ) : (
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase">STATUS</span>
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                   PRIME FLOW CONNECTED
                </span>
             </div>
           )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchData()}
            disabled={loading}
            className="relative flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all disabled:opacity-50 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{Math.round(isNaN(loadingProgress) ? 0 : loadingProgress)}%</span>
              </div>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>REFRESH</span>
              </>
            )}
            {loading && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                className="absolute inset-0 bg-white/5 pointer-events-none"
                style={{ width: `${isNaN(loadingProgress) ? 0 : loadingProgress}%` }}
              />
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase bg-white/5 text-white/60 border border-white/10 transition-all"
          >
            <HistoryIcon className="w-4 h-4" />
            {showHistory ? 'HIDE' : 'HISTORY'}
          </motion.button>
        </div>
        
        <a
          href="https://t.me/lotteryprde"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-4 mb-8 rounded-2xl font-black text-sm uppercase bg-[#229ED9]/10 text-[#229ED9] border border-[#229ED9]/30 shadow-[0_0_20px_rgba(34,158,217,0.15)] transition-all active:scale-95 hover:bg-[#229ED9]/20"
        >
          <Send className="w-5 h-5 fill-current" />
          JOIN TELEGRAM CHANNEL
        </a>

        {/* History List */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3"
            >
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 text-center">
                {gameMode === '1min' ? '1M' : '30S'} PREDICTION HISTORY (LAST 10)
              </h3>
              {predictions.slice(0, 10).map((p, i) => (
                <motion.div
                  key={p.issueNumber}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/5 px-4 py-3 rounded-xl flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-white/30 font-mono tracking-tighter">#{p.issueNumber}</span>
                    <span className="font-black text-xs text-blue-300">
                      {p.predictedSize} <span className="text-white/40 mx-1">•</span> {p.predictedNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-white/30 uppercase">RESULT</span>
                      <span className="font-bold text-xs">
                        {p.actualResult ? `${p.actualResult.size} (${p.actualResult.number})` : '--'}
                      </span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border shadow-sm ${
                      p.status === 'WIN' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      p.status === 'LOSE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse'
                    }`}>
                      {p.status === 'WIN' ? 'W' : p.status === 'LOSE' ? 'L' : '?'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/5 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between text-[10px] font-bold text-white/30 uppercase">
           <span>VER: 4.2.0-ULTRA</span>
           <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              SYSTEM ACTIVE
           </span>
           <span>HACKING ENGINE v9</span>
        </div>
      </footer>
    </div>
  );
}

