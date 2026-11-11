import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Lock,
  Flame,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Activity,
  FileCode,
  Check,
  Radio,
  Clock
} from 'lucide-react';
import { api } from '../services/api.js';
import { ISecurityEvent, ISpendingPolicy } from '../../../shared/types.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';

export const SecurityCenter: React.FC = () => {
  const [policy, setPolicy] = useState<ISpendingPolicy | null>(null);
  const [events, setEvents] = useState<ISecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);
  const [policySavedFeedback, setPolicySavedFeedback] = useState(false);

  // Red Team Simulation State
  const [simulating, setSimulating] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<any>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [policyData, eventsData] = await Promise.all([
        api.getSpendingPolicy(),
        api.getSecurityEvents()
      ]);
      setPolicy(policyData.policy);
      setEvents(eventsData.events);
    } catch (err: any) {
      console.warn('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    if (!policy) return;
    const newStatus = !policy.killSwitchActive;
    if (newStatus && !confirm('Engage Emergency Kill Switch? This will strictly halt all cart operations, passport generation, and PayPal payment checkout immediately.')) {
      return;
    }

    try {
      setTogglingKillSwitch(true);
      const data = await api.toggleKillSwitch(newStatus);
      setPolicy(prev => prev ? { ...prev, killSwitchActive: data.killSwitchActive } : null);
      const updatedEvents = await api.getSecurityEvents();
      setEvents(updatedEvents.events);
    } catch (err: any) {
      alert(`Failed to toggle kill switch: ${err.message}`);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    try {
      setSavingPolicy(true);
      const data = await api.updateSpendingPolicy(policy);
      setPolicy(data.policy);
      setPolicySavedFeedback(true);
      setTimeout(() => setPolicySavedFeedback(false), 2000);
    } catch (err: any) {
      alert(`Failed to update spending policy: ${err.message}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleRunRedTeamScenario = async (scenarioId: string) => {
    try {
      setSimulating(true);
      const data = await api.simulateRedTeam(scenarioId);
      setActiveSimulation(data.simulation);
      const updatedEvents = await api.getSecurityEvents();
      setEvents(updatedEvents.events);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const redTeamScenarios = [
    {
      id: 'POISONED_PRODUCT',
      name: 'Poisoned Product Prompt Injection',
      desc: 'Injects instructions into product descriptions to command the agent to bypass approval and force capture.'
    },
    {
      id: 'BUDGET_BYPASS',
      name: 'Adversarial Budget Limit Bypass',
      desc: 'Simulates an adversary attempting to bypass maximum cart ceiling by injecting $5,000 checkout request.'
    },
    {
      id: 'CART_TAMPER',
      name: 'Post-Approval Cart Mutation',
      desc: 'Simulates client tampering with cart version and line items after user signed the HMAC-SHA256 mandate.'
    },
    {
      id: 'EXPIRED_MANDATE',
      name: 'Expired Mandate Replay Attempt',
      desc: 'Simulates capturing payment using a signed authorization token older than the 15-minute TTL.'
    },
    {
      id: 'FORGED_AMOUNT',
      name: 'Forged Frontend Price Spoof',
      desc: 'Submits a spoofed $1.00 HTTP price payload against the server-authoritative catalog price.'
    },
    {
      id: 'REPLAY_CAPTURE',
      name: 'Duplicate Payment Capture Replay Attack',
      desc: 'Simulates re-submitting an already used single-use mandate for a second payment capture.'
    },
    {
      id: 'KILL_SWITCH',
      name: 'Operational Lockdown Under Kill Switch',
      desc: 'Simulates executing purchasing actions while the master AEGIS Emergency Kill Switch is engaged.'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center font-mono text-text">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
          <p className="text-xs text-text-muted">Loading AEGIS Trust & Security Architecture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-status-success-bg border border-status-success-border text-status-success text-xs font-mono font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
              <span>PAYPAL AEGIS TRUST & CONTROL ENGINE</span>
            </div>
            <h1 className="text-3xl font-black text-text tracking-tight">Security Center & Red Team Mode</h1>
            <p className="text-xs text-text-muted font-mono mt-1">
              Deterministic Spending Guards, Cryptographic Fingerprints, and Live Attack Simulator
            </p>
          </div>

          {/* Kill Switch Toggle Button */}
          <button
            onClick={handleToggleKillSwitch}
            disabled={togglingKillSwitch}
            className={`px-5 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-soft ${
              policy?.killSwitchActive
                ? 'bg-status-danger text-white animate-pulse'
                : 'bg-surface hover:bg-status-danger-bg text-status-danger border border-status-danger-border'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>
              {policy?.killSwitchActive ? 'KILL SWITCH ENGAGED (DISENGAGE)' : 'ENGAGE EMERGENCY KILL SWITCH'}
            </span>
          </button>
        </div>

        {/* Emergency Kill Switch Banner if active */}
        {policy?.killSwitchActive && (
          <div className="bg-status-danger-bg border-2 border-status-danger rounded-2xl p-6 text-status-danger-text flex items-center justify-between shadow-soft-xl animate-pulse">
            <div className="flex items-center space-x-4">
              <AlertOctagon className="w-9 h-9 text-status-danger flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base font-mono">
                  EMERGENCY KILL SWITCH ENGAGED
                </h3>
                <p className="text-xs text-status-danger-text mt-0.5">
                  All cart modifications, passport generation, and payment orders are currently blocked by AEGIS.
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleKillSwitch}
              className="px-4 py-2 rounded-xl bg-status-danger text-white font-bold text-xs font-mono uppercase shadow-soft"
            >
              Deactivate Now
            </button>
          </div>
        )}

        {/* 2-Column Core Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Spending Guard Policy Editor (col-span-5) */}
          <Card className="lg:col-span-5 p-6 sm:p-8 shadow-soft-md flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-brand-blue font-bold text-base mb-2">
                <Sliders className="w-5 h-5 text-brand-blue" />
                <h2 className="text-text">Deterministic Spending Guard</h2>
              </div>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">
                Rules enforced by deterministic backend TypeScript code. AI models are strictly barred from evaluating limits or computing pricing arithmetic.
              </p>

              {policy && (
                <div className="space-y-4 text-xs font-mono">
                  {/* Total Budget */}
                  <div>
                    <label className="text-text-muted block mb-1">Max Total Budget Envelope ($)</label>
                    <input
                      type="number"
                      value={policy.totalBudget}
                      onChange={(e) => setPolicy(p => p ? { ...p, totalBudget: Number(e.target.value) } : null)}
                      className="w-full bg-bg-subtle border border-border rounded-xl px-4 py-2.5 text-text font-mono font-bold focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  {/* Max Cart Value */}
                  <div>
                    <label className="text-text-muted block mb-1">Max Cart Value Threshold ($)</label>
                    <input
                      type="number"
                      value={policy.maxCartValue}
                      onChange={(e) => setPolicy(p => p ? { ...p, maxCartValue: Number(e.target.value) } : null)}
                      className="w-full bg-bg-subtle border border-border rounded-xl px-4 py-2.5 text-text font-mono font-bold focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  {/* Max Price Per Single Item */}
                  <div>
                    <label className="text-text-muted block mb-1">Max Price Per Item ($)</label>
                    <input
                      type="number"
                      value={policy.maxPricePerItem}
                      onChange={(e) => setPolicy(p => p ? { ...p, maxPricePerItem: Number(e.target.value) } : null)}
                      className="w-full bg-bg-subtle border border-border rounded-xl px-4 py-2.5 text-text font-mono font-bold focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  {/* Max Qty */}
                  <div>
                    <label className="text-text-muted block mb-1">Max Quantity Allowed Per Item</label>
                    <input
                      type="number"
                      value={policy.maxQuantityPerItem}
                      onChange={(e) => setPolicy(p => p ? { ...p, maxQuantityPerItem: Number(e.target.value) } : null)}
                      className="w-full bg-bg-subtle border border-border rounded-xl px-4 py-2.5 text-text font-mono font-bold focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  {/* Co-approval threshold */}
                  <div>
                    <label className="text-text-muted block mb-1">Require Co-Approval Above Amount ($)</label>
                    <input
                      type="number"
                      value={policy.requireCoApprovalAboveAmount}
                      onChange={(e) => setPolicy(p => p ? { ...p, requireCoApprovalAboveAmount: Number(e.target.value) } : null)}
                      className="w-full bg-bg-subtle border border-border rounded-xl px-4 py-2.5 text-text font-mono font-bold focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border mt-6">
              <Button
                onClick={handleSavePolicy}
                disabled={savingPolicy}
                variant="primary"
                size="md"
                className="w-full"
                icon={policySavedFeedback ? <Check className="w-4 h-4 text-status-success" /> : <Lock className="w-4 h-4" />}
              >
                {policySavedFeedback ? 'Policy Saved Successfully!' : savingPolicy ? 'Saving Rules...' : 'Save Spending Guard Rules'}
              </Button>
            </div>
          </Card>

          {/* Right Column: Red Team Mode Live Simulator (col-span-7) */}
          <Card className="lg:col-span-7 p-6 sm:p-8 shadow-soft-md flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-status-danger font-bold text-base mb-2">
                <Flame className="w-5 h-5 text-status-danger" />
                <h2 className="text-text">Red Team Mode Live Attack Simulator</h2>
              </div>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">
                Execute adversarial test attacks against SHOPMATE AI in real time. Observe how PAYPAL AEGIS defense layers intercept, quarantine, and block attacks.
              </p>

              <div className="space-y-3 mb-6">
                {redTeamScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="bg-bg-subtle border border-border hover:border-border-strong rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="pr-2">
                      <span className="font-bold text-xs text-text block mb-0.5">
                        {scenario.name}
                      </span>
                      <span className="text-[11px] text-text-muted leading-relaxed">
                        {scenario.desc}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRunRedTeamScenario(scenario.id)}
                      disabled={simulating}
                      className="px-3.5 py-1.5 rounded-xl bg-status-danger-bg hover:bg-status-danger text-status-danger hover:text-white border border-status-danger-border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center justify-center space-x-1.5 flex-shrink-0"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Launch Attack</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Defense Intercept Output */}
            {activeSimulation && (
              <div className="bg-bg-subtle border border-status-success-border rounded-xl p-5 text-xs font-mono shadow-soft-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-status-success font-bold">
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                    <span>AEGIS DEFENSE INTERCEPT CONFIRMED</span>
                  </div>
                  <Badge variant="success" size="sm">
                    STATUS: {activeSimulation.outcome}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div><span className="text-text-muted">Scenario:</span> <span className="text-text font-bold">{activeSimulation.title}</span></div>
                  <div><span className="text-text-muted">Defense Layer:</span> <span className="text-brand-violet font-bold">{activeSimulation.caughtByLayer}</span></div>
                  <div><span className="text-text-muted">Payload Excerpt:</span> <span className="text-status-danger break-all">{activeSimulation.attackPayload}</span></div>
                  <div className="pt-2 border-t border-border text-status-success font-sans">
                    <strong>Remedy Executed:</strong> {activeSimulation.remedySuggested}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Vertical Activity Timeline / Security Ledger */}
        <Card className="p-6 sm:p-8 shadow-soft-md">
          <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-text tracking-tight">Security Timeline & Audit Ledger</h2>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                Audit trail of intercepted attacks, limit breaches, and cryptographic verifications
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              {events.length} Events Recorded
            </Badge>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-text-muted">
              No security anomalies detected. System operating within verified boundaries.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vertical timeline representation */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {events.slice(0, 10).map((evt) => {
                  const isSevere = evt.severity === 'CRITICAL' || evt.severity === 'HIGH';
                  const nodeBg = isSevere ? 'bg-status-danger' : 'bg-status-success';

                  return (
                    <div key={evt.id} className="relative group">
                      {/* Node dot on timeline */}
                      <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${nodeBg} border-2 border-surface shadow-soft-sm`} />

                      <div className="p-4 rounded-xl bg-bg-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-text">{evt.eventType}</span>
                            <Badge variant={isSevere ? 'danger' : 'warning'} size="sm">
                              {evt.severity}
                            </Badge>
                            <span className="text-[10px] text-text-muted font-normal">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-text-muted text-[11px] truncate max-w-xl">
                            {evt.payloadExcerpt || evt.actionTaken}
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] flex-shrink-0">
                          <span className="text-brand-violet font-semibold">{evt.defenceLayer}</span>
                          <span className="text-status-success font-bold">{evt.actionTaken}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
