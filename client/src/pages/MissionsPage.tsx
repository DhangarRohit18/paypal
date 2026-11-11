import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  Monitor,
  Headphones,
  ShoppingBag,
  Info
} from 'lucide-react';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.js';
import { IBundlePlan, IMission } from '../../../shared/types.js';

export const MissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const [goal, setGoal] = useState('AI Development Workstation under $1,500');
  const [targetBudget, setTargetBudget] = useState(1500);
  const [loading, setLoading] = useState(false);
  const [mission, setMission] = useState<IMission | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [presets, setPresets] = useState<any[]>([]);

  useEffect(() => {
    loadPresetsAndInitialMission();
  }, []);

  const loadPresetsAndInitialMission = async () => {
    try {
      const presetsData = await api.getMissionPresets();
      setPresets(presetsData.presets);

      // Auto-trigger default mission
      await runMissionOptimization('AI Development Workstation under $1,500', 1500);
    } catch (err) {
      console.warn('Failed to load mission presets:', err);
    }
  };

  const runMissionOptimization = async (customGoal: string, budget: number) => {
    setLoading(true);
    try {
      const data = await api.createMission({
        goal: customGoal,
        targetBudget: budget
      });
      setMission(data.mission);
    } catch (err: any) {
      alert(`Optimization failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!mission) return;
    setSelectedPlanId(planId);
    try {
      await api.selectMissionPlan(mission.id, planId);
      await refreshCart();
      navigate('/cart');
    } catch (err: any) {
      alert(`Failed to build cart: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-shopblue/10 border border-shopblue/30 text-shopblue text-xs font-mono font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>P0-1 MISSION-BASED SHOPPING</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
            Deterministic Bundle Optimizer
          </h1>
          <p className="text-sm text-slate-400">
            Define your hardware goal and budget constraint. The backend knapsack solver generates three verified, compatible hardware bundles. The LLM only explains results — it never does arithmetic.
          </p>
        </div>

        {/* Mission Input Form */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 mb-12 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-6">
              <label className="text-xs font-mono font-semibold text-slate-300 block mb-2">
                Mission Goal or Outcome
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. AI development workstation, 4K gaming setup, home office"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-shopblue transition"
              />
            </div>

            <div className="md:col-span-3">
              <div className="flex justify-between text-xs font-mono font-semibold text-slate-300 mb-2">
                <span>Budget Ceiling</span>
                <span className="text-emerald-400 font-bold">${targetBudget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="400"
                max="3000"
                step="50"
                value={targetBudget}
                onChange={(e) => setTargetBudget(Number(e.target.value))}
                className="w-full accent-shopblue"
              />
            </div>

            <div className="md:col-span-3">
              <button
                onClick={() => runMissionOptimization(goal, targetBudget)}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-shopblue hover:bg-shopblue-600 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-shopblue/20"
              >
                {loading ? (
                  <span>Solving Constraints...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Bundle Optimizer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-mono mr-2">Presets:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setGoal(p.goal);
                  setTargetBudget(p.targetBudget);
                  runMissionOptimization(p.goal, p.targetBudget);
                }}
                className="text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700/80 transition"
              >
                {p.goal}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Plans Showcase */}
        {mission && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Three Optimized Architecture Plans</h2>
                <p className="text-xs text-slate-400 font-mono">
                  All components verified with 100% FitCheck hardware compatibility
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                Deterministic Solver Validated
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {mission.plans.map((plan: IBundlePlan) => {
                const isBestValue = plan.planId === 'best_value';
                return (
                  <div
                    key={plan.planId}
                    className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                      isBestValue
                        ? 'bg-gradient-to-b from-shopnavy to-slate-900 border-2 border-shopblue shadow-2xl shadow-shopblue/10 relative'
                        : 'bg-shopnavy border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isBestValue && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-shopblue text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                        Architect Recommended
                      </span>
                    )}

                    <div>
                      {/* Plan Header */}
                      <div className="mb-4">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block mb-1">
                          {plan.planId.replace('_', ' ')}
                        </span>
                        <h3 className="text-xl font-bold text-white mb-1.5">{plan.name}</h3>
                        <p className="text-xs text-slate-400">{plan.tagline}</p>
                      </div>

                      {/* Price & Savings */}
                      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-6">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-2xl font-black font-mono text-white">
                            ${plan.totalCost.toFixed(2)}
                          </span>
                          <span className="text-xs font-mono text-emerald-400 font-bold">
                            Save ${plan.savingsVsBudget.toFixed(2)} vs budget
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Includes estimated tax & single-cable compatibility
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3 mb-6">
                        <span className="text-xs font-mono font-bold text-slate-300 block">
                          Included Line Items ({plan.items.length}):
                        </span>
                        {plan.items.map((item, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="pr-2">
                              <span className="font-semibold text-slate-200 line-clamp-1">
                                {item.product.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.product.category} • {item.product.brand}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-white whitespace-nowrap">
                              ${item.product.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Explanation & Tradeoff */}
                      <div className="space-y-3 pt-4 border-t border-slate-800 text-xs mb-6">
                        <div>
                          <strong className="text-slate-300 font-mono block mb-1">Architect Rationale:</strong>
                          <p className="text-slate-400 leading-relaxed">{plan.explanation}</p>
                        </div>
                        <div>
                          <strong className="text-amber-400 font-mono block mb-1">Trade-off Analysis:</strong>
                          <p className="text-slate-400 leading-relaxed">{plan.tradeOffSummary}</p>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan.planId)}
                      disabled={selectedPlanId === plan.planId}
                      className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
                        isBestValue
                          ? 'bg-shopblue hover:bg-shopblue-600 text-white shadow-lg'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{selectedPlanId === plan.planId ? 'Building Cart...' : 'Select Plan & Build Cart'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

