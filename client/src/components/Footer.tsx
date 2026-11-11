import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface text-text-muted text-xs border-t border-border mt-20 transition-colors">
      {/* Top Banner: PayPal AEGIS Trust Statement */}
      <div className="bg-bg-subtle border-b border-border py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-text">
            <ShieldCheck className="w-4 h-4 text-status-success flex-shrink-0" />
            <span className="font-bold text-text">THE LLM SUGGESTS, DETERMINISTIC BACKEND CODE DECIDES:</span>
            <span className="text-text-muted hidden md:inline">
              AI models never perform arithmetic, enforce spending limits, approve, or capture payments.
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-text-subtle font-mono">
            <span>HMAC-SHA256 Fingerprints</span>
            <span>•</span>
            <span>Zero-Trust Delimited Prompt Channels</span>
            <span>•</span>
            <span>Orders v2 REST</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-violet flex items-center justify-center font-bold text-white text-xs shadow-soft-sm">
                SM
              </div>
              <span className="font-extrabold text-text text-base tracking-tight font-sans">
                SHOPMATE<span className="text-brand-blue font-black">.AI</span>
              </span>
            </div>
            <p className="text-text-muted text-[11px] leading-relaxed">
              Autonomous agentic shopping platform powered by PAYPAL AEGIS. Intelligent mission research, deterministic bundle optimization, transparent Purchase Passports, and verified PayPal Sandbox checkout.
            </p>
            <div className="inline-flex items-center px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-[10px] font-mono font-medium">
              PayPal Orders v2 REST Client Active
            </div>
          </div>

          {/* Commerce & Agents */}
          <div className="space-y-2">
            <h4 className="font-bold text-text uppercase text-[11px] tracking-wider">
              Commerce & Agents
            </h4>
            <ul className="space-y-1.5 text-text-muted">
              <li><Link to="/workspace" className="hover:text-text transition-colors">AI Shopping Workspace</Link></li>
              <li><Link to="/missions" className="hover:text-text transition-colors">Mission-Based Shopping</Link></li>
              <li><Link to="/missions" className="hover:text-text transition-colors">Deterministic Bundle Optimizer</Link></li>
              <li><Link to="/cart" className="hover:text-text transition-colors">Shopping Cart & Line Items</Link></li>
              <li><Link to="/passport" className="hover:text-text transition-colors">Purchase Passport</Link></li>
            </ul>
          </div>

          {/* AEGIS Engine */}
          <div className="space-y-2">
            <h4 className="font-bold text-text uppercase text-[11px] tracking-wider">
              AEGIS Security Engine
            </h4>
            <ul className="space-y-1.5 text-text-muted">
              <li><Link to="/security" className="hover:text-text transition-colors">AEGIS Security Center</Link></li>
              <li><Link to="/security?tab=redteam" className="hover:text-text transition-colors">Red Team Attack Mode</Link></li>
              <li><Link to="/security?tab=ledger" className="hover:text-text transition-colors">Activity Ledger & Replay</Link></li>
              <li><Link to="/security?tab=spending" className="hover:text-text transition-colors">Spending Guard & Limits</Link></li>
              <li><Link to="/security?tab=evals" className="hover:text-text transition-colors">Safety Eval Test Suite</Link></li>
            </ul>
          </div>

          {/* Honest Disclaimers (Required) */}
          <div className="space-y-3">
            <div className="p-3.5 bg-bg-subtle rounded-card border border-border space-y-1.5">
              <div className="flex items-center space-x-1.5 text-status-warning-text font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                <span>Honest Claims & Hackathon Notice</span>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed">
                SHOPMATE AI is an independent hackathon prototype. PayPal does not endorse, sponsor, or operate this product. All 60-100 catalogue items and price histories are sample data.
              </p>
              <p className="text-[10px] text-text-subtle pt-1 leading-relaxed">
                Payments execute against the official PayPal Sandbox environment (api-m.sandbox.paypal.com). No live money or cards are charged.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[11px] text-text-subtle font-mono">
          <div>
            © 2026 SHOPMATE AI • Powered by PAYPAL AEGIS • Independent Prototype
          </div>
          <div className="mt-2 sm:mt-0 flex space-x-4">
            <Link to="/security" className="hover:text-text transition-colors">Security Model</Link>
            <Link to="/security?tab=evals" className="hover:text-text transition-colors">Safety Evals</Link>
            <a
              href="https://developer.paypal.com/docs/api/orders/v2/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-text transition-colors flex items-center"
            >
              <span>PayPal Orders v2 Docs</span>
              <ExternalLink className="w-2.5 h-2.5 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
