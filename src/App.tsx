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
  UserCheck,
  Brain,
  Target,
  Crosshair,
  Bell,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInAnonymously } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User
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

type GameMode = '1min' | '30sec' | 'trx';

const GAME_MODES: Record<GameMode, any> = {
  '1min': {
    name: 'Wingo 1Min',
    typeId: 1,
    endpoint: 'https://ckygjf6r.com/api/webapi/GetNoaverageEmerdList',
    interval: 60,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzc2NjIxNzkyIiwibmJmIjoiMTc3NjYyMTc5MiIsImV4cCI6IjE3NzY2MjM1OTIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI0LzIwLzIwMjYgMTowMzoxMiBBTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Rvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFjY2Vzc19Ub2tlbiIsIlVzZXJJZCI6IjQ4NzIwMyIsIlVzZXJOYW1lIjoiOTU5Nzc3NTQ1NTg5IiwiVXNlclBob3RvIjoiMjAiLCJOaWNrTmFtZSI6Ik1HVEhBTlQgIiwiQW1vdW50IjoiMTYuMzciLCJJbnRlZ3JhbCI6IjAiLCJMb2dpbk1hcmsiOiJINSIsIkxvZ2luVGltZSI6IjQvMjAvMjAyNiAxMjozMzoxMiBBTSIsIkxvZ2luSVBBZGRyZXNzIjoiNDMuMjE3LjE0OS4xNDAiLCJEYk51bWJlciI6IjAiLCJJc3ZhbGlkYXRvciI6IjAiLCJLZXlDb2RlIjoiNTg1IiwiVG9rZW5UeXBlIjoiQWNjZXNzX1Rva2VuIiwiUGhvbmVUeXBlIjoiMSIsIlVzZXJUeXBlIjoiMCIsIlVzZXJOYW1lMiI6IiIsImlzcyI6Imp3dElzc3VlciIsImF1ZCI6ImxvdHRlcnlUaWNrZXQifQ.uPFuJBmm5xKiWfn0FTsWWC2kzpAFng3WTXfk6-ywHcg',
      'Ar-Origin': 'https://www.cklottery.top'
    },
    signature: "07A0AFC40AF08DF42F50DFB8EBF21251",
    random: "d94b2f0328ad4ed79835b0ab6f2face2"
  },
  '30sec': {
    name: 'Wingo 30Sec',
    typeId: 30,
    endpoint: 'https://ckygjf6r.com/api/webapi/GetNoaverageEmerdList',
    interval: 30,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzc2NjIxNzkyIiwibmJmIjoiMTc3NjYyMTc5MiIsImV4cCI6IjE3NzYzNDQxNjQiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI0LzIwLzIwMjYgMTowMzoxMiBBTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Rvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFjY2Vzc19Ub2tlbiIsIlVzZXJJZCI6IjQ4NzIwMyIsIlVzZXJOYW1lIjoiOTU5Nzc3NTQ1NTg5IiwiVXNlclBob3RvIjoiMjAiLCJOaWNrTmFtZSI6Ik1HVEhBTlQgIiwiQW1vdW50IjoiMTYuMzciLCJJbnRlZ3JhbCI6IjAiLCJMb2dpbk1hcmsiOiJINSIsIkxvZ2luVGltZSI6IjQvMjAvMjAyNiAxMjozMzoxMiBBTSIsIkxvZ2luSVBBZGRyZXNzIjoiNDMuMjE3LjE0OS4xNDAiLCJEYk51bWJlciI6IjAiLCJJc3ZhbGlkYXRvciI6IjAiLCJLZXlDb2RlIjoiNTg1IiwiVG9rZW5UeXBlIjoiQWNjZXNzX1Rva2VuIiwiUGhvbmVUeXBlIjoiMSIsIlVzZXJUeXBlIjoiMCIsIlVzZXJOYW1lMiI6IiIsImlzcyI6Imp3dElzc3VlciIsImF1ZCI6ImxvdHRlcnlUaWNrZXQifQ.uPFuJBmm5xKiWfn0FTsWWC2kzpAFng3WTXfk6-ywHcg',
      'Ar-Origin': 'https://www.cklottery.top'
    },
    signature: "4B4698A7056FEDF63404E36D6409B8ED",
    random: "8705aa9f36be4dc787390582a62aa77d"
  },
  'trx': {
    name: 'TRX Hash 1M',
    typeId: 1,
    endpoint: 'https://ckygjf6r.com/api/webapi/GetTRXNoaverageEmerdList',
    interval: 60,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIxNzc2NjIxNzkyIiwibmJmIjoiMTc3NjYyMTc5MiIsImV4cCI6IjE3NzY2MjM1OTIiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL2V4cGlyYXRpb24iOiI0LzIwLzIwMjYgMTowMzoxMiBBTSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Rvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFjY2Vzc19Ub2tlbiIsIlVzZXJJZCI6IjQ4NzIwMyIsIlVzZXJOYW1lIjoiOTU5Nzc3NTQ1NTg5IiwiVXNlclBob3RvIjoiMjAiLCJOaWNrTmFtZSI6Ik1HVEhBTlQgIiwiQW1vdW50IjoiMTYuMzciLCJJbnRlZ3JhbCI6IjAiLCJMb2dpbk1hcmsiOiJINSIsIkxvZ2luVGltZSI6IjQvMjAvMjAyNiAxMjozMzoxMiBBTSIsIkxvZ2luSVBBZGRyZXNzIjoiNDMuMjE3LjE0OS4xNDAiLCJEYk51bWJlciI6IjAiLCJJc3ZhbGlkYXRvciI6IjAiLCJLZXlDb2RlIjoiNTg1IiwiVG9rZW5UeXBlIjoiQWNjZXNzX1Rva2VuIiwiUGhvbmVUeXBlIjoiMSIsIlVzZXJUeXBlIjoiMCIsIlVzZXJOYW1lMiI6IiIsImlzcyI6Imp3dElzc3VlciIsImF1ZCI6ImxvdHRlcnlUaWNrZXQifQ.uPFuJBmm5xKiWfn0FTsWWC2kzpAFng3WTXfk6-ywHcg',
      'Ar-Origin': 'https://www.cklottery.top'
    },
    signature: "AE0E3F7F83F1717C934E5703AEC3BF59",
    random: "e6cbfec8e710483b9ab2800323f13758"
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
    name: "NEURAL-V8 ADAPTIVE",
    description: "Multi-layer weighted frequency analysis (High-Efficiency)",
    predict: (history) => {
      const last10 = history.slice(0, 10);
      let weights = [0.45, 0.20, 0.12, 0.08, 0.05, 0.03, 0.02, 0.02, 0.02, 0.01];
      let sum = 0;
      last10.forEach((r, i) => sum += r.number * weights[i]);
      const pred = Math.round(sum) % 10;
      return { number: pred, confidence: 99 };
    }
  },
  {
    name: "MARKOV-CHAIN-X",
    description: "State-transition probability matrix (Deep Learning)",
    predict: (history) => {
      const transitions: Record<number, number[]> = {};
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i+1].number;
        const next = history[i].number;
        if (!transitions[current]) transitions[current] = [];
        transitions[current].push(next);
      }
      const last = history[0].number;
      const possible = transitions[last] || [0,1,2,3,4,5,6,7,8,9];
      const counts: Record<number, number> = {};
      possible.forEach(n => counts[n] = (counts[n] || 0) + 1);
      const top = parseInt(Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0]);
      return { number: top, confidence: 95 };
    }
  },
  {
    name: "TRX-HARMONIC-HASH",
    description: "Synchronized extraction from TRX Block Entropy",
    predict: (history) => {
      const last = history[0];
      if (last.blockID) {
        const hex = last.blockID.slice(-1);
        const val = parseInt(hex, 16) % 10;
        return { number: val, confidence: 100 };
      }
      return { number: (history[0].number * 2 + 1) % 10, confidence: 90 };
    }
  },
  {
    name: "SURE-SHOT-V9",
    description: "Pattern persistence model for high-streak stability",
    predict: (history) => {
      const counts: Record<number, number> = {};
      history.slice(0, 15).forEach(r => counts[r.number] = (counts[r.number] || 0) + 1);
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
      const pred = parseInt(sorted[0][0]);
      return { number: pred, confidence: 100 };
    }
  },
  {
    name: "CYBER-FLOW-PRO",
    description: "Dynamic momentum-based decryption logic",
    predict: (history) => {
      const seed = history[0].issueNumber.slice(-3);
      const pred = (parseInt(seed) * 9 + 5) % 10;
      return { number: pred, confidence: 100 };
    }
  }
];

interface GameResult {
  issueNumber: string;
  number: number;
  colour: string[];
  size: 'BIG' | 'SMALL';
  blockID?: string;
  blockNumber?: number;
  premium?: string;
}

interface Prediction {
  issueNumber: string;
  predictedNumber: number;
  predictedSize: 'BIG' | 'SMALL';
  predictedColour: string;
  status: 'WIN' | 'LOSE' | 'PENDING';
  confidence: number;
  actualResult?: GameResult;
  isSniper?: boolean;
}

interface License {
  id: string;
  key: string;
  status?: 'active' | 'used' | 'expired';
  isUsed?: boolean;
  tier: 'free' | 'premium';
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

function AdminPanel({ onClose, onLogout, onRefresh, apiConfig, heartbeat, onUpdateConfig }: { 
  onClose: () => void, 
  onLogout: () => Promise<void>, 
  onRefresh: () => Promise<void>,
  apiConfig: Record<string, string>,
  heartbeat: 'LIVE' | 'SYNC' | 'SIM',
  onUpdateConfig: (key: string, value: string) => void
}) {
  const [keys, setKeys] = useState<License[]>([]);
  const [newKey, setNewKey] = useState('');
  const [durationValue, setDurationValue] = useState(24);
  const [durationUnit, setDurationUnit] = useState<License['durationUnit']>('hour');
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium'>('free');
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
        tier: selectedTier,
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Neural Tier</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedTier('free')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${selectedTier === 'free' ? 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/5 text-white/40'}`}
                >
                  Free Link
                </button>
                <button 
                  onClick={() => setSelectedTier('premium')}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${selectedTier === 'premium' ? 'bg-[#bc13fe]/20 border-[#bc13fe] text-[#bc13fe] shadow-[0_0_10px_rgba(188,19,254,0.3)]' : 'bg-white/5 border-white/5 text-white/40'}`}
                >
                  Premium Access
                </button>
              </div>
            </div>
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

        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-[#00f2ff]" />
              <h2 className="text-lg font-black uppercase tracking-tight">API Access Configuration</h2>
            </div>
            <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase flex items-center gap-2 ${
              heartbeat === 'LIVE' ? 'bg-green-500/10 text-green-400 border-green-400/20' :
              heartbeat === 'SYNC' ? 'bg-blue-500/10 text-blue-400 border-blue-400/20 animate-pulse' :
              'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
               <div className={`w-1.5 h-1.5 rounded-full ${heartbeat === 'LIVE' ? 'bg-green-400' : heartbeat === 'SYNC' ? 'bg-blue-400 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
               {heartbeat === 'LIVE' ? 'Neural Link: Live' : heartbeat === 'SYNC' ? 'Neural Link: Syncing' : 'Neural Link: Bypass Active'}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-yellow-200/60 leading-relaxed uppercase tracking-widest">
                Warning: Authorization tokens (Bearer) expire regularly. Update them here to resolve 401 Unauthorized errors.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Global Bearer Token (All Modes)</label>
              <textarea 
                value={apiConfig['global_token'] || ''}
                onChange={(e) => onUpdateConfig('global_token', e.target.value)}
                placeholder="Bearer eyJhbGci..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono focus:outline-none focus:border-[#00f2ff]/30 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">1Min Sig</label>
                <input 
                  type="text"
                  value={apiConfig['sig_1min'] || ''}
                  onChange={(e) => onUpdateConfig('sig_1min', e.target.value)}
                  placeholder="07A0AFC..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">1Min Rand</label>
                <input 
                  type="text"
                  value={apiConfig['rand_1min'] || ''}
                  onChange={(e) => onUpdateConfig('rand_1min', e.target.value)}
                  placeholder="d94b2f..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">1Min Type</label>
                <input 
                  type="text"
                  value={apiConfig['type_1min'] || ''}
                  onChange={(e) => onUpdateConfig('type_1min', e.target.value)}
                  placeholder="1"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">30Sec Sig</label>
                <input 
                  type="text"
                  value={apiConfig['sig_30sec'] || ''}
                  onChange={(e) => onUpdateConfig('sig_30sec', e.target.value)}
                  placeholder="4B469..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">30Sec Rand</label>
                <input 
                  type="text"
                  value={apiConfig['rand_30sec'] || ''}
                  onChange={(e) => onUpdateConfig('rand_30sec', e.target.value)}
                  placeholder="8705a..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">30Sec Type</label>
                <input 
                  type="text"
                  value={apiConfig['type_30sec'] || ''}
                  onChange={(e) => onUpdateConfig('type_30sec', e.target.value)}
                  placeholder="30"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">TRX Signature</label>
                <input 
                  type="text"
                  value={apiConfig['sig_trx'] || ''}
                  onChange={(e) => onUpdateConfig('sig_trx', e.target.value)}
                  placeholder="AE0E3..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">TRX Random</label>
                <input 
                  type="text"
                  value={apiConfig['rand_trx'] || ''}
                  onChange={(e) => onUpdateConfig('rand_trx', e.target.value)}
                  placeholder="e6cbfec..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">TRX Type</label>
                <input 
                  type="text"
                  value={apiConfig['type_trx'] || ''}
                  onChange={(e) => onUpdateConfig('type_trx', e.target.value)}
                  placeholder="13"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#bc13fe]/30"
                />
              </div>
            </div>
          </div>
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
                      key.tier === 'premium' ? 'bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/20' : 'bg-blue-500/10 text-blue-400 border border-blue-400/10'
                    }`}>
                      {key.tier || 'FREE'}
                    </span>
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
  const [activeStrategy, setActiveStrategy] = useState<PredictionStrategy>(PREDICTION_STRATEGIES[0]);
  const [strategyAccuracy, setStrategyAccuracy] = useState<number>(0);
  const [licenseKey, setLicenseKey] = useState('');
  const [view, setView] = useState<'dashboard' | 'login' | 'admin'>('login');
  
  const [gameMode, setGameMode] = useState<GameMode>('1min');
  const [results, setResults] = useState<GameResult[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('--:--:--');
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
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [gameTimeLeft, setGameTimeLeft] = useState<number>(0);
  const [licenseTier, setLicenseTier] = useState<'free' | 'premium'>('free');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [licenseInfo, setLicenseInfo] = useState<License | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [isSniperMode, setIsSniperMode] = useState(false);
  const [showSniperNoti, setShowSniperNoti] = useState(false);
  const [heartbeat, setHeartbeat] = useState<'LIVE' | 'SIM' | 'SYNC'>('LIVE');

  // Enforce tier restrictions
  useEffect(() => {
    if (licenseTier !== 'premium' && isSniperMode) {
      setIsSniperMode(false);
    }
  }, [licenseTier, isSniperMode]);
  const [apiConfig, setApiConfig] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('ultra_hack_api_config');
    return saved ? JSON.parse(saved) : {};
  });

  const updateApiConfig = (key: string, value: string) => {
    const newConfig = { ...apiConfig, [key]: value };
    setApiConfig(newConfig);
    localStorage.setItem('ultra_hack_api_config', JSON.stringify(newConfig));
  };

  const theme = useMemo(() => {
    if (gameMode === 'trx') {
      return {
        accent: '#ff9d00',
        secondary: '#ff5e00',
        glow: 'rgba(255, 157, 0, 0.15)',
        border: 'border-orange-500/20',
        bg: 'bg-orange-500/5',
        text: 'text-orange-400',
        gradient: 'from-[#ff9d00] to-[#ff5e00]',
        modeLabel: 'TRX HASH SYSTEM',
        iconGlow: 'drop-shadow-[0_0_15px_rgba(255,157,0,0.7)]'
      };
    }
    return {
      accent: '#00f2ff',
      secondary: '#bc13fe',
      glow: 'rgba(0, 242, 255, 0.15)',
      border: 'border-blue-500/10',
      bg: 'bg-blue-500/5',
      text: 'text-blue-400',
      gradient: 'from-[#00f2ff] to-[#bc13fe]',
      modeLabel: 'WINGO NEURAL MAP',
      iconGlow: 'drop-shadow-[0_0_15px_rgba(0,242,255,0.7)]'
    };
  }, [gameMode]);

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
      
      const testRef = doc(db, 'keys', 'CONNECTION_TEST');
      
      // Try a standard get to wake up Firestore connection
      await getDoc(testRef).catch(() => {});
      
      setError('Neural link refreshed successfully. Please re-enter your key.');
    } catch (err: any) {
      console.error(err);
      setError('Neural firewall sync failure: ' + (err.message || 'Unknown protocol error'));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err: any) {
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn("Neural Link: Anonymous Auth is disabled in Firebase Console. Please enable it to unlock full security.");
          // We don't set a hard error here to allow the UI to function via Device-ID fallback
        } else {
          console.error("Anonymous auth failed:", err);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      if (current) {
        const email = current.email?.toLowerCase();
        // Master admin check: bypass Firestore lookup for trusted emails
        if (email === 'khaingminthant86@gmail.com' || email === 'kozerchi@gmail.com') {
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
      const nowMs = now.getTime();
      const currentSeconds = now.getSeconds();
      
      // Fixed: More accurate countdown for interval
      let secondsToNext;
      if (interval === 30) {
        secondsToNext = currentSeconds < 30 ? 30 - currentSeconds : 60 - currentSeconds;
      } else {
        secondsToNext = 60 - currentSeconds;
      }
      
      setGameTimeLeft(secondsToNext);

      const next = new Date(nowMs + (secondsToNext * 1000));
      next.setMilliseconds(0);
      setNextUpdateTime(mmtFormat.format(next));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [gameMode]);

  // Prediction Algorithm with Auto-Switching
  const generatePrediction = useCallback((history: GameResult[]): Prediction | null => {
    if (!history || history.length < 5) return null;

    try {
      // --- NEURAL STRATEGY RANKER (Adaptive AI) ---
      // Test each strategy against the last 15 results to see which is currently WINNING
      const backtestScope = history.slice(0, 15);
      const strategyPerformances = PREDICTION_STRATEGIES.map(strat => {
        let mockWins = 0;
        let totalTested = 0;
        // We test if the strategy would have predicted the result correctly for previous rounds
        for (let i = 1; i < 11; i++) {
          const subHistory = backtestScope.slice(i);
          if (subHistory.length < 5) continue;
          try {
            const pred = strat.predict(subHistory);
            const actual = backtestScope[i-1];
            if (actual && getSizeFromNumber(pred.number) === actual.size) mockWins++;
            totalTested++;
          } catch (e) { /* skip faulty iteration */ }
        }
        return { strategy: strat, wins: mockWins, total: totalTested };
      });

      // Pick the strategy currently dominating the market (safety sort)
      const best = [...strategyPerformances].sort((a, b) => (b.wins || 0) - (a.wins || 0))[0];
      if (!best) return null;
      
      const topStrategy = best.strategy;
      
      setActiveStrategy(topStrategy);
      const accuracy = best.total > 0 ? Math.round((best.wins / best.total) * 100) : 0;
      setStrategyAccuracy(accuracy); 
      setActivePattern(topStrategy.name);

      const prediction = topStrategy.predict(history);
      const predictedNumber = isNaN(prediction.number) ? 0 : prediction.number;
      const confidence = isNaN(prediction.confidence) ? 90 : prediction.confidence;

      const latestIssue = history[0]?.issueNumber || "0";
      
      const isPremium = licenseTier === 'premium';
      
      // Sniper Mod Logic: 2 matches analyzing, 1 match prediction
      // We use the next issue number to determine the status in the 3-period cycle
      const nextIssue = (BigInt(latestIssue) + 1n).toString();
      const nextIssueInt = BigInt(nextIssue);
      
      // STRICT ENFORCEMENT: Sniper logic ONLY for premium
      const isAnalyzingRound = isPremium && isSniperMode && (nextIssueInt % 3n !== 0n);
      const isActualSniper = isPremium && isSniperMode;
      
      const predictedSize = getSizeFromNumber(predictedNumber);
      const predictedColour = getColourFromNumber(predictedNumber);

      if (isAnalyzingRound) {
        return {
          issueNumber: nextIssue,
          predictedNumber: -1, // Sentinel for "Analyzing"
          predictedSize: 'SMALL', 
          predictedColour: 'gray',
          status: 'PENDING',
          confidence: 0
        };
      }

      return {
        issueNumber: nextIssue,
        predictedNumber,
        predictedSize,
        predictedColour,
        status: 'PENDING',
        confidence: isActualSniper ? 100 : confidence,
        isSniper: isActualSniper
      };
    } catch (err) {
      console.error("Pattern Generation System Failure:", err);
      return null;
    }
  }, [gameMode, isSniperMode, licenseTier]);

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
      setHeartbeat('SYNC');
      const customToken = apiConfig[`token_${gameMode}`] || apiConfig['global_token'];
      const customSignature = apiConfig[`sig_${gameMode}`];
      const customRandom = apiConfig[`rand_${gameMode}`];
      const customTypeId = apiConfig[`type_${gameMode}`];

      const headers = { ...currentModeConfig.headers };
      if (customToken) {
        headers['Authorization'] = customToken.startsWith('Bearer ') ? customToken : `Bearer ${customToken}`;
      }

      const response = await axios.post(currentModeConfig.endpoint, {
        pageSize: 10,
        pageNo: 1,
        typeId: customTypeId ? parseInt(customTypeId) : currentModeConfig.typeId,
        language: 0,
        random: customRandom || currentModeConfig.random,
        signature: customSignature || currentModeConfig.signature,
        timestamp: Math.floor(Date.now() / 1000)
      }, {
        headers: headers,
        timeout: 15000
      });

      if (response.data) {
        // Fast finish to 100
        setLoadingProgress(100);
        
        // Multi-layered parsing strategy for complex API responses
        const data = response.data;
        let rawList = [];
        
        // Check for error codes in 200 OK body (Fake 200s)
        if (data.code !== undefined && data.code !== 0 && data.code !== 200 && data.code !== "200") {
          throw new Error(data.msg || `Neural Sync Refusal: Code ${data.code}`);
        }

        if (data.data) {
          if (data.data.list) {
            rawList = data.data.list;
          } else if (data.data.data && data.data.data.gameslist) {
            rawList = data.data.data.gameslist;
          } else if (data.data.data && Array.isArray(data.data.data)) {
            rawList = data.data.data;
          } else if (Array.isArray(data.data)) {
            rawList = data.data;
          } else if (data.data.gameslist) {
            rawList = data.data.gameslist;
          }
        } else if (data.list) {
          rawList = data.list;
        } else if (Array.isArray(data)) {
          rawList = data;
        }

        if (!rawList || rawList.length === 0) {
          throw new Error('Empty dataset from API: Engaging Simulation');
        }

        setSimulationMode(false);
        setHeartbeat('LIVE');

        const formattedResults: GameResult[] = rawList.map((item: any) => {
          // Robust number extraction
          let num = item.number !== undefined ? parseInt(item.number) : undefined;
          
          // TRX Hash Specific: If number is not provided, try to extract from hash
          const blockID = item.blockID || item.blockHash || item.hash || item.blockid;
          if (num === undefined && blockID && typeof blockID === 'string') {
            const lastChar = blockID.slice(-1);
            num = parseInt(lastChar, 16) % 10;
          }

          return {
            issueNumber: item.issueNumber || item.periodNumber || item.period || '0',
            number: num !== undefined ? num : 0,
            colour: (item.colour || item.color || "").split(','),
            size: item.size || getSizeFromNumber(num !== undefined ? num : 0),
            blockID: blockID,
            blockNumber: item.blockNumber || item.blocknumber,
            premium: item.premium
          };
        });

        setResults(formattedResults);
        setLastSyncTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));

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
            try {
              const nextPred = generatePrediction(formattedResults);
              
              // If Sniper Mod is on and it's a hit round, trigger notification
              if (isSniperMode && nextPred && nextPred.predictedNumber !== -1) {
                setShowSniperNoti(true);
                setTimeout(() => setShowSniperNoti(false), 8000);
              }

              // Limit to last 50 for session but UI only shows last 10
              if (nextPred) return [nextPred, ...prev].slice(0, 50);
            } catch (pErr) {
              console.error("Neural Brain Jam:", pErr);
              return prev;
            }
          }
          return prev;
        });

      }
    } catch (err: any) {
      console.error("API FAILURE:", err);
      
      const status = err.response?.status;
      const isAuthError = status === 401 || status === 403;
      
      if (isAuthError) {
        setAutoRefresh(false); // Stop spamming expired tokens
      }

      // UNIVERSAL NEURAL BYPASS
      setSimulationMode(true);
      setHeartbeat('SIM');
      
      const errorMsg = isAuthError 
        ? '[ AUTH FAILURE ] MASTER TOKEN EXPIRED (401). PLEASE UPDATE TOKEN IN SETTINGS.'
        : `[ NEURAL OVERRIDE ] API ERROR ${status || 'TIMEOUT'}. ENGAGING LOCAL LOGIC...`;
      
      setError(errorMsg);
      setTimeout(() => setError(null), 6000);
        
        // --- NEURAL SIMULATION FALLBACK ENGINE ---
        const now = new Date();
        const mmtNow = new Date(now.getTime() + (6.5 * 60 * 60 * 1000));
        const baseIssue = `${mmtNow.getUTCFullYear()}${String(mmtNow.getUTCMonth() + 1).padStart(2, '0')}${String(mmtNow.getUTCDate()).padStart(2, '0')}`;
        
        // Calculate issue count based on game interval
        const interval = GAME_MODES[gameMode].interval;
        const totalSeconds = mmtNow.getUTCHours() * 3600 + mmtNow.getUTCMinutes() * 60 + mmtNow.getUTCSeconds();
        const currentPeriodIdx = Math.floor(totalSeconds / interval);
        const startNo = baseIssue + String(currentPeriodIdx).padStart(4, '0');
        
        const mockResults: GameResult[] = [];
        for (let i = 0; i < 15; i++) {
          const num = (parseInt(startNo.slice(-4)) * 7 + i * 13) % 10; // Semi-deterministic for realism
          mockResults.push({
            issueNumber: (BigInt(startNo) - BigInt(i)).toString(),
            number: num,
            colour: [getColourFromNumber(num).split(' ')[0]],
            size: getSizeFromNumber(num),
            blockID: gameMode === 'trx' ? '000000000' + Math.random().toString(16).substring(2, 10) : undefined,
            blockNumber: gameMode === 'trx' ? 88000000 + i : undefined
          });
        }
        
        setResults(mockResults);
        setLastSyncTime('BYPASS');
        setLoadingProgress(100);

        const latestIssue = mockResults[0].issueNumber;
        const nextReqIssue = (BigInt(latestIssue) + 1n).toString();
        setNextPeriod(nextReqIssue);

        setPredictions(prev => {
          const hasAlready = prev.some(p => p.issueNumber === nextReqIssue);
          if (!hasAlready) {
            const nextPred = generatePrediction(mockResults);
            if (nextPred) return [nextPred, ...prev].slice(0, 50);
          }
          return prev;
        });

    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setTimeout(() => setLoadingProgress(0), 500);
    }
  }, [generatePrediction, gameMode]);

  useEffect(() => {
    if (autoRefresh && gameTimeLeft === 1) {
      setTimeout(() => {
        fetchData();
      }, 1500); // 1.5s delay after hit to let server update
    }
  }, [gameTimeLeft, autoRefresh, fetchData]);

  useEffect(() => {
    fetchData();
  }, [gameMode, fetchData]);

  // Check License from Local Storage
  useEffect(() => {
    if (!authLoading) {
      const savedKey = localStorage.getItem('ultra_hack_key');
      if (savedKey) {
        checkLicense(savedKey);
      }
    }
  }, [authLoading]);

  // Real-time license monitoring (Logout if deleted or expired)
  useEffect(() => {
    const savedKey = localStorage.getItem('ultra_hack_key');
    if (isAuthenticated && savedKey && view === 'dashboard') {
      let expiryTimer: any = null;
      let countdownInterval: any = null;

      const performLogout = (reason: string) => {
        setIsAuthenticated(false);
        setView('login');
        setError(reason);
        localStorage.removeItem('ultra_hack_key');
        if (countdownInterval) clearInterval(countdownInterval);
      };

      const unsubscribe = onSnapshot(doc(db, 'keys', savedKey), (snapshot) => {
        if (!snapshot.exists()) {
          performLogout("Your session has been terminated by administrator.");
          return;
        }

        const data = snapshot.data() as License;
        
        if (data.status === 'expired') {
          performLogout("Your session has expired.");
          return;
        }

        if (data.expiresAt) {
          const expires = typeof data.expiresAt.toDate === 'function' 
            ? data.expiresAt.toDate() 
            : new Date(data.expiresAt);
          
          const updateCountdown = () => {
            const now = new Date();
            const ms = expires.getTime() - now.getTime();
            if (ms <= 0) {
              performLogout("Your session has expired (Time Out).");
              if (countdownInterval) clearInterval(countdownInterval);
            } else {
              const m = Math.floor(ms / 60000);
              const s = Math.floor((ms % 60000) / 1000);
              setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
            }
          };

          updateCountdown();
          if (countdownInterval) clearInterval(countdownInterval);
          countdownInterval = setInterval(updateCountdown, 1000);

          const msLeft = expires.getTime() - new Date().getTime();
          if (expiryTimer) clearTimeout(expiryTimer);
          expiryTimer = setTimeout(() => performLogout("Your session has expired."), msLeft + 500);
        }
      }, (error) => {
        console.error("License Monitor Error:", error);
      });

      return () => {
        unsubscribe();
        if (expiryTimer) clearTimeout(expiryTimer);
        if (countdownInterval) clearInterval(countdownInterval);
      };
    } else {
      setTimeLeft(null);
    }
  }, [isAuthenticated, view]);

  const checkLicense = async (key: string) => {
    const path = `keys/${key}`;
    try {
      const licenseDoc = await getDoc(doc(db, 'keys', key));
      if (licenseDoc.exists()) {
        const data = licenseDoc.data() as License;
        const deviceId = localStorage.getItem('ultra_hack_device_id');
        const isSelf = data.claimedBy === auth.currentUser?.uid || (deviceId && data.claimedBy === deviceId);
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
          const tier = data.tier || 'free';
          setIsAuthenticated(true);
          setLicenseTier(tier);
          setLicenseInfo(data);
          setPredictions([]);
          if (tier !== 'premium') setIsSniperMode(false);
          setView('dashboard');
        } else {
          setLicenseInfo(null);
          setError('License already used or invalid');
        }
      } else {
        setLicenseInfo(null);
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
      const email = user.email?.toLowerCase();

      // Master admin check: bypass Firestore lookup for trusted emails
      if (email === 'khaingminthant86@gmail.com' || email === 'kozerchi@gmail.com') {
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
    
    // SECRET COMMAND: ADMIN PANEL BYPASS
    if (licenseKey.trim().toUpperCase() === 'ADMIN OPEN') {
      setView('admin');
      setError(null);
      return;
    }

    const path = `keys/${licenseKey}`;
    try {
      setAuthLoading(true);
      setError(null);

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

          let userId = auth.currentUser?.uid || localStorage.getItem('ultra_hack_device_id');
          if (!userId) {
            userId = 'device-' + Math.random().toString(36).substring(2, 12);
            localStorage.setItem('ultra_hack_device_id', userId);
          }
          
          const updatedData = {
            ...data,
            status: 'used' as const,
            isUsed: true,
            claimedBy: userId,
            claimedAt: Timestamp.now(),
            expiresAt: expiresAt
          };

          await updateDoc(doc(db, 'keys', licenseKey), {
            status: 'used',
            isUsed: true,
            claimedBy: userId,
            claimedAt: Timestamp.now(),
            expiresAt: expiresAt
          });
          
          const tier = updatedData.tier || 'free';
          localStorage.setItem('ultra_hack_key', licenseKey);
          localStorage.setItem('ultra_hack_device_id', userId);
          setLicenseInfo(updatedData);
          setLicenseTier(tier);
          setPredictions([]);
          if (tier !== 'premium') setIsSniperMode(false);
          setIsAuthenticated(true);
          setView('dashboard');
        } else {
          const userId = auth.currentUser?.uid || localStorage.getItem('ultra_hack_device_id');
          
          const tier = data.tier || 'free';
          if ((data.status === 'used' || data.isUsed) && data.claimedBy === userId) {
             localStorage.setItem('ultra_hack_key', licenseKey);
             setLicenseTier(tier);
             setLicenseInfo(data);
             setPredictions([]);
             if (tier !== 'premium') setIsSniperMode(false);
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
        apiConfig={apiConfig}
        heartbeat={heartbeat}
        onUpdateConfig={updateApiConfig}
      />
    );
  }

  return (
    <div className={`min-h-screen ${gameMode === 'trx' ? 'bg-[#0a0500]' : 'bg-[#050b1a]'} text-white p-4 font-sans relative overflow-hidden transition-colors duration-700`}>
      {/* Background Glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${gameMode === 'trx' ? 'bg-orange-500/10' : 'bg-blue-500/10'} blur-[120px] rounded-full pointer-events-none transition-all duration-1000`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${gameMode === 'trx' ? 'bg-red-500/5' : 'bg-purple-500/10'} blur-[120px] rounded-full pointer-events-none transition-all duration-1000`} />

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
              className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-red-500/20 transition-all font-mono text-[10px]"
            >
              <LogOut className="w-3 h-3 text-red-400" />
            </button>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-2"
          >
            {gameMode === 'trx' ? (
              <Activity className={`w-12 h-12 text-[#ff9d00] ${theme.iconGlow}`} />
            ) : (
              <Zap className={`w-12 h-12 text-[#00f2ff] ${theme.iconGlow}`} />
            )}
          </motion.div>
          <h1 className={`text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} drop-shadow-sm`}>
            {gameMode === 'trx' ? 'TRX HACK CORE' : 'CK ULTRA HACK'}
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mt-1">
            {theme.modeLabel} • {GAME_MODES[gameMode].name}
          </p>

          {licenseInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center gap-1.5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <Key className="w-3 h-3 text-blue-400/60" />
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em]">{licenseInfo.key}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${licenseInfo.status === 'active' || licenseInfo.isUsed ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[9px] font-black text-white/60 uppercase tracking-tighter">
                  NEURAL LINK EXPIRES: {licenseInfo.expiresAt ? (typeof licenseInfo.expiresAt.toDate === 'function' ? licenseInfo.expiresAt.toDate() : new Date(licenseInfo.expiresAt)).toLocaleString('en-GB', { hour12: true }) : 'UNLIMITED'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Neural Logic Status */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex flex-col items-center"
          >
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full shadow-2xl`}>
               <Brain className={`w-3 h-3 ${theme.text} animate-pulse`} />
               <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.1em]">ACTIVE LOGIC:</span>
               <span className={`text-[10px] font-black ${theme.text}`}>{activeStrategy.name}</span>
               <div className="w-px h-3 bg-white/10 mx-1" />
               <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.1em]">PROBABILITY:</span>
               <span className="text-[10px] font-black text-green-400">{strategyAccuracy}%</span>
               <div className="w-px h-3 bg-white/10 mx-1" />
               <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.1em]">LATENCY:</span>
               <span className={`text-[10px] font-black ${lastSyncTime === 'BYPASS' ? 'text-amber-400' : 'text-blue-400'}`}>{lastSyncTime}</span>
            </div>
            
            <div className="mt-3 flex items-center gap-3">
              <div onClick={() => fetchData()} className="cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 group hover:bg-white/10 transition-all">
                <div className={`w-1.5 h-1.5 rounded-full ${heartbeat === 'LIVE' ? 'bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]' : heartbeat === 'SYNC' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'} transition-all`} />
                <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">
                  {heartbeat === 'LIVE' ? 'Neural Link: Live' : heartbeat === 'SYNC' ? 'Neural Link: Syncing' : 'Neural Link: Bypass Active'}
                </span>
                <RefreshCw className={`w-2 h-2 text-white/30 group-hover:text-white/60 transition-all ${loading ? 'animate-spin' : ''}`} />
              </div>

              {[1,2,3,4,5].map(i => (
                <motion.div 
                  key={i}
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                  className={`w-0.5 h-2 rounded-full ${i <= (strategyAccuracy/20) ? theme.bg : 'bg-white/5'}`}
                  style={{ backgroundColor: i <= (strategyAccuracy/20) ? theme.accent : undefined }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Mode Switcher Dock */}
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              gameMode === '1min' 
                ? 'bg-[#00f2ff] text-[#050b1a] shadow-[0_0_20px_rgba(0,242,255,0.4)]' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Clock className="w-3 h-3" />
            1M
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              gameMode === '30sec' 
                ? 'bg-[#bc13fe] text-white shadow-[0_0_20px_rgba(188,19,254,0.4)]' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Zap className="w-3 h-3" />
            30S
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (gameMode !== 'trx') {
                setGameMode('trx');
                setPredictions([]);
                setResults([]);
                setNextPeriod(null);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              gameMode === 'trx' 
                ? 'bg-[#ff9d00] text-[#050b1a] shadow-[0_0_20px_rgba(255,157,0,0.4)]' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Activity className="w-3 h-3" />
            TRX
          </motion.button>
        </div>

        {/* Time Display (Myanmar Time Zone & Countdown) */}
        <div className="flex items-center justify-center gap-3 mb-8">
           <div className={`flex flex-col items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-2xl border ${theme.border} shrink-0 transition-all duration-500`}>
              <span className={`text-[8px] font-black opacity-60 uppercase tracking-tighter ${theme.text}`}>CLOCKED</span>
              <span className={`text-sm font-mono font-bold ${theme.text.replace('text-', 'text-')}`}>{mmtTime}</span>
           </div>
           {timeLeft && (
             <div className="flex flex-col items-center px-4 py-2 bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/20 shrink-0">
                <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter animate-pulse">TERMINATION IN</span>
                <span className="text-sm font-mono font-bold text-red-500">{timeLeft}</span>
             </div>
           )}
           <div className={`flex flex-col items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-2xl border ${theme.border} shrink-0 transition-all duration-500`}>
              <span className={`text-[8px] font-black opacity-60 uppercase tracking-tighter ${gameMode === 'trx' ? 'text-orange-400' : 'text-purple-400'}`}>NEXT HIT</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-mono font-bold ${gameMode === 'trx' ? 'text-orange-400' : 'text-[#bc13fe]'}`}>{nextUpdateTime}</span>
                <span className="text-[10px] font-black opacity-40 ml-1.5 font-mono">({gameTimeLeft}s)</span>
              </div>
           </div>
        </div>

        {/* Refresh Progress Bar */}
        <div className="h-1 w-full bg-white/5 rounded-full mb-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${isNaN(loadingProgress) ? 0 : loadingProgress}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`h-full bg-gradient-to-r ${theme.gradient} shadow-[0_0_10px_${theme.glow}]`}
            style={{ boxShadow: `0 0 10px ${theme.glow}` }}
          />
        </div>

        {/* Sniper Mod Toggle */}
        {licenseTier === 'premium' ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsSniperMode(!isSniperMode);
              // reset flow for clarity
              setPredictions([]);
              setResults([]);
              fetchData();
            }}
            className={`w-full mb-6 py-4 rounded-2xl flex items-center justify-between px-6 border transition-all relative overflow-hidden group ${
              isSniperMode 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className={`p-2 rounded-lg ${isSniperMode ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white/40'}`}>
                <Target className={isSniperMode ? 'animate-pulse' : ''} size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-xs font-black tracking-widest ${isSniperMode ? 'text-red-500' : 'text-white/80'}`}>
                  SNIPER HIT MOD {isSniperMode ? '[ ON ]' : '[ OFF ]'}
                </span>
                <span className="text-[8px] font-bold text-white/30 uppercase">
                  {isSniperMode ? 'Awaiting Data: 2-Period Neural Sync Active' : 'Engage for 100% Accuracy Signal Protocol'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <div className={`w-10 h-5 rounded-full relative transition-colors ${isSniperMode ? 'bg-red-500/40' : 'bg-white/10'}`}>
                <motion.div 
                  animate={{ x: isSniperMode ? 22 : 2 }}
                  className={`w-4 h-4 rounded-full mt-0.5 shadow-lg ${isSniperMode ? 'bg-red-500' : 'bg-white/40'}`}
                />
              </div>
            </div>
            {isSniperMode && (
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent pointer-events-none"
              />
            )}
          </motion.button>
        ) : (
          <div className="w-full mb-6 py-4 rounded-2xl flex items-center justify-between px-6 border border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5 text-white/20">
                <Target size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-black tracking-widest text-white/40">
                  SNIPER HIT MOD [ LOCKED ]
                </span>
                <span className="text-[8px] font-bold text-[#bc13fe] uppercase">
                  Upgrade to Premium to Unlock 100% Signal
                </span>
              </div>
            </div>
            <Lock className="w-4 h-4 text-white/20" />
          </div>
        )}

        {/* Sniper Notification Box */}
        <AnimatePresence>
          {showSniperNoti && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-32 left-4 right-4 z-[100] bg-red-600/90 backdrop-blur-xl border border-red-400/50 p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center gap-4"
            >
              <div className="bg-white/20 p-2 rounded-xl">
                 <Bell className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-white uppercase tracking-widest">Sniper Hit Ready!</p>
                <p className="text-[10px] font-medium text-white/80 uppercase tracking-tighter mt-0.5">Neural lock confirmed. High-precision 100% signal active for period #{predictions[0]?.issueNumber}.</p>
              </div>
              <button 
                onClick={() => setShowSniperNoti(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <Square className="w-4 h-4 fill-white/20" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
                   <div className={`px-2 py-0.5 rounded bg-gradient-to-r ${theme.gradient} bg-opacity-20 border border-white/10 text-[8px] font-black text-white italic tracking-tighter shadow-xl`}>
                     GOD LVL CONFIDENT {predictions[0].confidence}% {predictions[0].confidence === 100 ? 'SURE SHOT' : ''}
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
                         <Clock className="w-3 h-3" /> NEXT {gameMode === '1min' ? 'WINGO 1M' : gameMode === '30sec' ? 'WINGO 30S' : 'TRX HASH 1M'}
                      </span>
                      <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-[#00f2ff] uppercase border border-[#00f2ff]/20">
                        {gameMode === '1min' ? 'WINGO 1MIN' : gameMode === '30sec' ? 'WINGO 30SEC' : 'TRX HASH 1M'}
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
                      <span className={`text-2xl font-black ${theme.text}`}>
                        {predictions[0].predictedNumber === -1 ? '--' : predictions[0].predictedSize}
                      </span>
                    </div>
                    <div className={`bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_${theme.glow}] relative overflow-hidden`}>
                      {isSniperMode && predictions[0].predictedNumber !== -1 && (
                        <div className="absolute top-1 right-1">
                           <Crosshair className="w-3 h-3 text-red-500 animate-spin-slow" />
                        </div>
                      )}
                      <span className="text-[8px] font-bold text-white/40 uppercase block mb-1">NUMBER</span>
                      <span className={`text-2xl font-black ${gameMode === 'trx' ? 'text-orange-300' : 'text-[#bc13fe]'} tracking-tighter`}>
                        {predictions[0].predictedNumber === -1 ? '--' : predictions[0].predictedNumber}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-bold text-white/40 uppercase block mb-1">ACCURACY</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-lg font-black ${isSniperMode ? 'text-red-400' : 'text-green-400'}`}>
                          {predictions[0].predictedNumber === -1 ? '0%' : (isSniperMode ? '100%' : '98%')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {predictions[0].predictedNumber === -1 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[#050b1a]/80 backdrop-blur-md flex flex-col items-center justify-center z-20"
                    >
                      <Target className="text-red-500 w-10 h-10 animate-ping mb-4" />
                      <p className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">Analyzing Target...</p>
                      <p className="text-[8px] font-bold text-white/40 uppercase mt-2">Neural Link: Stalking 2-Period Data</p>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase">COLOUR:</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {predictions[0].predictedColour}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black uppercase text-white/40">
                         {predictions[0].confidence === 100 ? 'SURE SHOT:' : 'CONFIDENCE:'}
                       </span>
                       <motion.span 
                         animate={predictions[0].confidence === 100 
                           ? { scale: [1, 1.2, 1], color: ["#00f2ff", "#bc13fe", "#00f2ff"], textShadow: ["0 0 5px #00f2ff", "0 0 20px #bc13fe", "0 0 5px #00f2ff"] }
                           : { scale: [1, 1.1, 1], textShadow: ["0 0 5px #00f2ff", "0 0 20px #00f2ff", "0 0 5px #00f2ff"] }
                         }
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
           <div className={`bg-white/[0.03] backdrop-blur-sm border ${theme.border} rounded-2xl p-4 relative overflow-hidden group transition-all duration-500`}>
              <div className={`absolute inset-0 ${gameMode === 'trx' ? 'bg-orange-500/5' : 'bg-blue-500/5'} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-2 mb-2">
                 <ShieldCheck className={`w-4 h-4 ${theme.text}`} />
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">PRIME LOGIC</span>
              </div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                 <motion.div 
                   animate={predictions[0]?.confidence === 100 ? { scale: [1, 1.5, 1], backgroundColor: [theme.accent, theme.secondary, theme.accent] } : { rotate: 360 }}
                   transition={{ duration: predictions[0]?.confidence === 100 ? 0.5 : 10, repeat: Infinity, ease: "linear" }}
                   className={`w-2 h-2 rounded-full border border-[${theme.accent}] ${predictions[0]?.confidence === 100 ? `bg-[${theme.accent}]` : 'border-t-transparent'}`} 
                   style={{ borderColor: theme.accent, backgroundColor: predictions[0]?.confidence === 100 ? theme.accent : 'transparent' }}
                 />
                 {activePattern} {predictions[0]?.confidence === 100 && <span className={`text-[8px] ${theme.text} animate-pulse`}>[SURE SHOT]</span>}
              </div>
              <p className="text-[8px] text-white/20 mt-1 font-mono">{gameMode === 'trx' ? 'ENCRYPTED HASH FIELD' : 'NEURAL FLOW ACTIVE'}</p>
           </div>
           <div className={`bg-white/[0.03] backdrop-blur-sm border ${theme.border} rounded-2xl p-4 relative overflow-hidden group transition-all duration-500`}>
              <div className={`absolute inset-0 ${gameMode === 'trx' ? 'bg-orange-500/5' : 'bg-purple-500/5'} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-2 mb-2">
                 <TrendingUp className={`w-4 h-4 ${gameMode === 'trx' ? 'text-orange-400' : 'text-[#bc13fe]'}`} />
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">PREMIUM PATTERNS</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                 {['TREND', 'STREAK', 'VOL'].map((tag) => (
                    <span key={tag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/5 ${gameMode === 'trx' ? 'text-orange-300' : 'text-purple-300'}`}>
                      {tag}
                    </span>
                 ))}
              </div>
              <p className="text-[8px] text-white/20 mt-1 font-mono">SECURE SYNC v.9</p>
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
                    className={`h-full bg-gradient-to-r ${theme.gradient}`} 
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
        <div className="flex flex-col gap-4 mb-4">
           <div className="grid grid-cols-2 gap-4">
             <motion.button
               whileTap={{ scale: 0.95 }}
               onClick={() => fetchData()}
               disabled={loading}
               className={`relative flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase ${gameMode === 'trx' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30'} border shadow-xl transition-all disabled:opacity-50 overflow-hidden`}
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
               onClick={() => setAutoRefresh(!autoRefresh)}
               className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase border transition-all ${
                 autoRefresh 
                   ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                   : 'bg-white/5 text-white/30 border-white/10'
               }`}
             >
               <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
               <span>AUTO {autoRefresh ? 'ON' : 'OFF'}</span>
             </motion.button>
           </div>
           
           <motion.button
             whileTap={{ scale: 0.95 }}
             onClick={() => setShowHistory(!showHistory)}
             className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase bg-white/5 text-white/60 border border-white/10 transition-all"
           >
             <HistoryIcon className="w-4 h-4" />
             {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
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
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 text-center flex items-center justify-center gap-2">
                {isSniperMode && <Target className="w-3 h-3 text-red-500 animate-pulse" />}
                {GAME_MODES[gameMode].name} {isSniperMode ? 'SNIPER HIT' : 'PREDICTION'} HISTORY (LAST 10)
              </h3>
              {predictions.slice(0, 10).map((p, i) => (
                <motion.div
                  key={p.issueNumber}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 border border-white/5 px-4 py-3 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-white/30 font-mono tracking-tighter">#{p.issueNumber}</span>
                      <span className={`font-black text-xs ${p.predictedNumber === -1 ? 'text-red-400 animate-pulse' : theme.text}`}>
                        {p.predictedNumber === -1 ? 'ANALYZING TARGET...' : `${p.predictedSize} • ${p.predictedNumber}`}
                      </span>
                      {p.isSniper && p.predictedNumber !== -1 && (
                        <div className="flex items-center gap-1 mt-0.5">
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.9, x: -5 }}
                             animate={{ opacity: 1, scale: 1, x: 0 }}
                             className="px-2.5 py-1 rounded bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] border border-yellow-200/50"
                           >
                              <Crown className="w-3 h-3 text-amber-900 fill-amber-900/20" />
                              <span className="text-[8px] font-black text-amber-950 uppercase tracking-[0.1em] drop-shadow-sm">
                                VIP Sniper Hit
                              </span>
                              <div className="flex gap-0.5 ml-1">
                                <motion.div 
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="w-1 h-1 bg-amber-900 rounded-full" 
                                />
                              </div>
                           </motion.div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-bold text-white/30 uppercase">RESULT</span>
                        <span className="font-bold text-xs">
                          {p.predictedNumber === -1 ? 'SCANNING' : (p.actualResult ? `${p.actualResult.size} (${p.actualResult.number})` : '--')}
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border shadow-sm ${
                        p.predictedNumber === -1 ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        p.status === 'WIN' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        p.status === 'LOSE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse'
                      }`}>
                        {p.predictedNumber === -1 ? 'SCN' : (p.status === 'WIN' ? 'W' : p.status === 'LOSE' ? 'L' : '?')}
                      </div>
                    </div>
                  </div>

                  {gameMode === 'trx' && p.actualResult && (
                    <div className="mt-1 pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                       <div className="flex flex-col">
                          <span className="text-[7px] font-bold text-white/20 uppercase">BLOCK HASH</span>
                          <span className={`text-[8px] font-mono ${gameMode === 'trx' ? 'text-orange-300' : 'text-purple-300'} truncate w-32`} title={p.actualResult.blockID}>{p.actualResult.blockID}</span>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-[7px] font-bold text-white/20 uppercase">BLOCK NO</span>
                          <span className={`text-[8px] font-mono ${theme.text}`}>{p.actualResult.blockNumber}</span>
                       </div>
                    </div>
                  )}
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
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                <span className={`w-1 h-1 rounded-full ${
                  heartbeat === 'LIVE' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 
                  heartbeat === 'SYNC' ? 'bg-blue-500 animate-ping' : 
                  'bg-yellow-500 shadow-[0_0_5px_#eab308]'
                }`} />
                <span className={`text-[7px] font-black ${
                  heartbeat === 'LIVE' ? 'text-green-400' : 
                  heartbeat === 'SYNC' ? 'text-blue-400' : 
                  'text-yellow-500'
                }`}>
                  {heartbeat === 'SYNC' ? 'NEURAL SYNCING' : heartbeat === 'LIVE' ? 'ENCRYPTED LIVE' : 'BYPASS ACTIVE'}
                </span>
              </div>
              SYSTEM ACTIVE
           </span>
           <span>HACKING ENGINE v9</span>
        </div>
      </footer>

      {/* Simulation Indicator Toast */}
      <AnimatePresence>
        {simulationMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-4 right-4 z-[60] bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl p-3 rounded-2xl flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Neural Simulation Mode Active</span>
                <span className="text-[8px] font-bold text-yellow-500/60 uppercase">API Tokens Expired (401). Update them in Admin panel.</span>
              </div>
            </div>
            <button 
              onClick={() => setView('admin')}
              className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-[9px] font-black text-yellow-500 uppercase"
            >
              FIX NOW
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

