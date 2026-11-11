import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  Layers,
  Database,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users
} from 'lucide-react';
import { api } from '../services/api.js';

export const AdminConsole: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [agentEvents, setAgentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [healthData, agentData] = await Promise.all([
        api.getHealth(),
        api.getAgentEvents()
      ]);
      setHealth(healthData);
      setAgentEvents(agentData.events);
    } catch (err: any) {
      console.warn('Failed to load admin diagnostic data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center font-mono space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-shopblue mx-auto" />
          <p className="text-sm text-slate-400">Loading AEGIS Orchestrator Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-400 text-xs font-mono font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ADMINISTRATOR AUDIT CONSOLE</span>
            </div>
            <h1 className="text-3xl font-black text-white">AEGIS Platform Orchestration</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Multi-Agent Telemetry, Catalog Health, and Tool Gateway Ledger
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-2 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-shopnavy border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-mono text-slate-400 block mb-1">Architecture Status</span>
            <div className="text-xl font-bold text-emerald-400 font-mono flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{health?.engine || 'AEGIS ACTIVE'}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-2 block">
              {health?.architecture || '4-Layer Coordinated'}
            </span>
          </div>

          <div className="bg-shopnavy border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-mono text-slate-400 block mb-1">Verified Catalog</span>
            <div className="text-xl font-bold text-white font-mono">
              {health?.catalogueStats?.verifiedProductsCount || 69} Products
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-2 block">
              {health?.catalogueStats?.merchantsCount || 4} Verified Merchants
            </span>
          </div>

          <div className="bg-shopnavy border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-mono text-slate-400 block mb-1">Red Team Quarantined</span>
            <div className="text-xl font-bold text-rose-400 font-mono">
              {health?.catalogueStats?.redTeamQuarantinedAssets || 1} Asset Isolated
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-2 block">
              Untrusted prompt injections blocked
            </span>
          </div>

          <div className="bg-shopnavy border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-mono text-slate-400 block mb-1">PayPal Sandbox Link</span>
            <div className="text-xl font-bold text-shopblue font-mono">
              {health?.paypalSandbox?.configured ? 'LIVE REST API' : 'OFFLINE SIMULATION'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-2 block">
              Orders v2 REST Ready
            </span>
          </div>
        </div>

        {/* Agent Activity Trace Ledger */}
        <div className="bg-shopnavy border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">AEGIS Tool Gateway Activity Ledger</h2>
              <p className="text-xs text-slate-400 font-mono">
                Every tool execution by BUYWISE agents is cryptographically audited and permission-checked
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {agentEvents.length} Actions Logged
            </span>
          </div>

          {agentEvents.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500">
              No recent tool events logged. Send a request in the AI Shopping Workspace to view live trace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 pr-4 font-semibold">Timestamp</th>
                    <th className="pb-3 pr-4 font-semibold">Agent ID</th>
                    <th className="pb-3 pr-4 font-semibold">Action</th>
                    <th className="pb-3 pr-4 font-semibold">Tool Called</th>
                    <th className="pb-3 pr-4 font-semibold">Permission</th>
                    <th className="pb-3 font-semibold">Output Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agentEvents.slice(0, 15).map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 pr-4 font-bold text-shopviolet whitespace-nowrap">
                        {evt.agentId.toUpperCase()}
                      </td>
                      <td className="py-3 pr-4 text-white whitespace-nowrap">
                        {evt.action}
                      </td>
                      <td className="py-3 pr-4 text-shopblue font-bold whitespace-nowrap">
                        {evt.toolName || 'none'}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          {evt.permissionCheck}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 max-w-sm truncate">
                        {evt.outputSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

