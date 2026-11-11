import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  Sliders,
  DollarSign,
  Brain,
  Check,
  RefreshCw,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);

  // States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [policy, setPolicy] = useState<any>({
    totalBudget: 2500,
    maxPricePerItem: 1500,
    maxCartValue: 2500,
    maxQuantityPerItem: 4,
    requireCoApprovalAboveAmount: 1000,
    restrictedCategories: []
  });
  const [policySuccess, setPolicySuccess] = useState(false);

  const [memory, setMemory] = useState<any>({
    personalizationEnabled: false,
    preferredCategories: [],
    brandAffinities: []
  });
  const [memorySuccess, setMemorySuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.request<any>('/settings');
      if (data.profile) {
        setName(data.profile.name);
        setEmail(data.profile.email);
      }
      if (data.spendingPolicy) {
        setPolicy(data.spendingPolicy);
      }
      if (data.memoryProfile) {
        setMemory(data.memoryProfile);
      }
    } catch (err: any) {
      console.warn('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.request<any>('/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch (err: any) {
      alert(`Profile update failed: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPolicy(true);
      await api.request<any>('/settings/policy', {
        method: 'PUT',
        body: JSON.stringify(policy)
      });
      setPolicySuccess(true);
      setTimeout(() => setPolicySuccess(false), 2000);
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSaveMemory = async () => {
    try {
      setSavingMemory(true);
      await api.request<any>('/settings/memory', {
        method: 'PUT',
        body: JSON.stringify(memory)
      });
      setMemorySuccess(true);
      setTimeout(() => setMemorySuccess(false), 2000);
    } catch (err: any) {
      alert(`Memory settings update failed: ${err.message}`);
    } finally {
      setSavingMemory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-shopblue mx-auto" />
          <p className="text-sm text-slate-400">Loading Configuration Profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-black text-white">Platform Settings & Controls</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Personal Profile, AEGIS Spending Guard Rules, and Privacy Memory Controls
          </p>
        </div>

        {/* 1. Profile Edit Form */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-2 text-shopblue font-bold text-base mb-2">
            <User className="w-5 h-5 text-shopblue" />
            <h2 className="text-white">Shopper Profile</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Manage your personal details and identity name used across Purchase Passports.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Email address is locked to your cryptographic session.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2.5 px-6 rounded-xl bg-shopblue hover:bg-shopblue-600 text-white font-bold text-xs transition flex items-center space-x-1.5"
            >
              {profileSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Profile Saved</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </form>
        </div>

        {/* 2. Spending Policy Form (Saved to backend and enforced server-side) */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base mb-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white">Deterministic Spending Guard Rules</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            These thresholds are mathematically enforced by server-side code prior to cart checkout.
          </p>

          <form onSubmit={handleSavePolicy} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Total Budget Envelope ($)</label>
              <input
                type="number"
                value={policy.totalBudget}
                onChange={(e) => setPolicy({ ...policy, totalBudget: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Max Cart Ceiling Value ($)</label>
              <input
                type="number"
                value={policy.maxCartValue}
                onChange={(e) => setPolicy({ ...policy, maxCartValue: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Max Price Per Item ($)</label>
              <input
                type="number"
                value={policy.maxPricePerItem}
                onChange={(e) => setPolicy({ ...policy, maxPricePerItem: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Require Co-Approval Above ($)</label>
              <input
                type="number"
                value={policy.requireCoApprovalAboveAmount}
                onChange={(e) => setPolicy({ ...policy, requireCoApprovalAboveAmount: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
              />
            </div>

            <div className="sm:col-span-2 pt-4">
              <button
                type="submit"
                disabled={savingPolicy}
                className="py-3 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow"
              >
                {policySuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Spending Guard Rules Saved</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Update Server Spending Guard</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. ShopMate Memory Profile (Personalization OFF by default) */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-2 text-shopviolet font-bold text-base mb-2">
            <Brain className="w-5 h-5 text-shopviolet" />
            <h2 className="text-white">ShopMate Memory & Privacy</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Privacy-first design. Autonomous cross-session memory is disabled by default.
          </p>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-sm text-white block">
                Personalized Assistant Memory
              </span>
              <span className="text-xs text-slate-400 font-sans mt-0.5 block">
                When enabled, BUYWISE remembers hardware form factors and preferred brands between sessions.
              </span>
            </div>

            <button
              onClick={() => {
                setMemory({ ...memory, personalizationEnabled: !memory.personalizationEnabled });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition ${
                memory.personalizationEnabled
                  ? 'bg-shopviolet text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {memory.personalizationEnabled ? 'ENABLED' : 'DISABLED (DEFAULT)'}
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveMemory}
              disabled={savingMemory}
              className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition"
            >
              {memorySuccess ? 'Memory Preferences Saved!' : 'Save Memory Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

