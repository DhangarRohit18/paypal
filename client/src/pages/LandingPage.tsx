import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  ShieldCheck,
  Lock,
  ArrowRight,
  Bot,
  Compass,
  FileCheck2,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Layers,
  Cpu,
  TrendingDown,
  HelpCircle,
  Terminal,
  ExternalLink,
  QrCode,
  Sparkles,
  Zap,
  Sliders,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';

export const LandingPage: React.FC = () => {
  const [activeWorkflowStep, setActiveWorkflowStep] = React.useState<number>(1);
  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* 1. HERO SECTION WITH SIGNATURE ACCENT & FLOATING MOCKUPS */}
      <section className="relative bg-radial-mesh bg-grid-subtle pt-16 pb-24 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Engine Pill */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-violet/10 border border-brand-violet/25 text-brand-violet text-xs font-mono font-bold tracking-wide"
            >
              <span className="w-2 h-2 rounded-full bg-brand-violet animate-pulse" />
              <span>POWERED BY PAYPAL AEGIS • TRUST, SECURITY & PAYMENT CONTROL</span>
            </motion.div>

            {/* Headline with Signature Gradient */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tightest leading-tight text-text"
            >
              Discover Smarter. Shop Better.{' '}
              <span className="bg-gradient-to-r from-brand-blue to-brand-violet bg-clip-text text-transparent">
                Stay in Control.
              </span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl mx-auto font-normal"
            >
              Your autonomous fintech shopping agent. Discover verified products, optimize hardware bundles with deterministic algorithms, lock pre-checkout <strong>Purchase Passports</strong>, and approve payments via real <strong>PayPal Sandbox</strong>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
            >
              <Link to="/workspace">
                <Button
                  variant="gradient"
                  size="lg"
                  icon={<ShoppingBag className="w-4 h-4" />}
                >
                  <span>Launch AI Workspace</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>

              <Link to="/missions">
                <Button variant="secondary" size="lg" icon={<Compass className="w-4 h-4" />}>
                  Explore Mission Builder
                </Button>
              </Link>

              <Link to="/security?tab=redteam">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-mono text-xs"
                  icon={<Terminal className="w-4 h-4 text-status-success" />}
                >
                  AEGIS Red Team Demo
                </Button>
              </Link>
            </motion.div>

            {/* Trust Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pt-6 max-w-2xl mx-auto"
            >
              <div className="p-3.5 bg-surface/80 backdrop-blur-md rounded-2xl border border-border shadow-soft flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted font-mono">
                <div className="flex items-center space-x-1.5 text-status-success font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secured Checkout with PayPal Sandbox</span>
                </div>
                <span>•</span>
                <span className="text-text font-medium">api-m.sandbox.paypal.com</span>
                <span>•</span>
                <Badge variant="sample" size="sm">
                  Independent Prototype • Sample Data
                </Badge>
              </div>
            </motion.div>
          </div>

          {/* FLOATING PRODUCT CARD & PURCHASE PASSPORT PREVIEW MOCKUPS */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            {/* Left Mockup: Real Product Card Component */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="lg:col-span-5"
            >
              <div className="p-1 rounded-card-lg bg-gradient-to-tr from-brand-blue/30 via-border to-brand-violet/30 shadow-soft-xl">
                <Card className="overflow-hidden border-0 bg-surface">
                  <div className="p-4 bg-bg-subtle/70 border-b border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-status-danger" />
                      <div className="w-2.5 h-2.5 rounded-full bg-status-warning" />
                      <div className="w-2.5 h-2.5 rounded-full bg-status-success" />
                      <span className="text-[11px] font-mono text-text-muted ml-2">Catalogue Verification</span>
                    </div>
                    <Badge variant="sample" size="sm">Sample data</Badge>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bg-subtle text-text-muted font-bold">
                          Laptops
                        </span>
                        <h3 className="font-bold text-text text-base mt-1">
                          Dell XPS 15 9530 OLED Workstation
                        </h3>
                        <p className="text-xs text-text-muted font-mono mt-0.5">
                          Sold by NovaTech Enterprise Direct (Trust Rating 98%)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black font-mono text-text tabular-nums block">
                          $1,849.00
                        </span>
                        <span className="text-[10px] text-status-success font-semibold">In Stock</span>
                      </div>
                    </div>

                    {/* Spec Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-bg-subtle text-text-muted text-[11px] font-mono">
                        RAM: 32GB DDR5
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-bg-subtle text-text-muted text-[11px] font-mono">
                        Storage: 1TB NVMe
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-bg-subtle text-text-muted text-[11px] font-mono">
                        GPU: RTX 4060
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-status-success-bg text-status-success-text text-[11px] font-mono font-semibold">
                        FitCheck: PASS
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-xs font-mono text-text-muted">18m warranty • 30d return</span>
                      <Button variant="primary" size="sm" icon={<ShoppingBag className="w-3.5 h-3.5" />}>
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>

            {/* Center Connection Glyph */}
            <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center space-y-2 text-text-muted font-mono text-xs">
              <span className="w-8 h-[1px] bg-border" />
              <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-brand-blue shadow-soft">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-text-subtle">
                AEGIS LOCK
              </span>
              <span className="w-8 h-[1px] bg-border" />
            </div>

            {/* Right Mockup: Boarding-Pass Purchase Passport Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="lg:col-span-5"
            >
              <div className="rounded-card-lg bg-surface border border-border shadow-soft-xl overflow-hidden relative">
                {/* Header Band */}
                <div className="bg-gradient-to-r from-brand-navy to-surface-raised p-4 text-white flex items-center justify-between border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <FileCheck2 className="w-5 h-5 text-brand-violet" />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-brand-violet font-bold block">
                        PAYPAL AEGIS MANDATE
                      </span>
                      <span className="font-bold text-sm text-white">Purchase Passport</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" dot>
                    HMAC-SHA256 AUTHORIZED
                  </Badge>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-text-muted">Passport ID</span>
                    <span className="text-text font-bold">psp-9f4a-81bc</span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-text-muted">Cart Version & Single-Use TTL</span>
                    <span className="text-text">v2 • 14:59 remaining</span>
                  </div>

                  {/* Perforated Boarding Pass Divider */}
                  <div className="perforated-divider my-2" />

                  {/* Financial Breakdown with Large Tabular Numerals */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-text-muted">
                      <span>Subtotal (1 item)</span>
                      <span className="tabular-nums">$1,849.00 USD</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Shipping (Over $100)</span>
                      <span className="text-status-success font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Estimated Tax (8%)</span>
                      <span className="tabular-nums">$147.92 USD</span>
                    </div>
                    <div className="flex justify-between text-text pt-2 border-t border-border items-baseline">
                      <span className="font-bold">Authoritative Total</span>
                      <span className="text-2xl font-black font-mono text-status-success tabular-nums">
                        $1,996.92 USD
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Order Fingerprint */}
                  <div className="p-2.5 rounded-xl bg-bg-subtle border border-border flex items-center justify-between font-mono text-[11px] text-text-muted">
                    <div className="flex items-center space-x-2 truncate">
                      <QrCode className="w-4 h-4 text-brand-blue flex-shrink-0" />
                      <span className="truncate">HMAC: 8a7f...e319 (Signed)</span>
                    </div>
                    <span className="text-[10px] text-status-success font-bold flex-shrink-0">
                      Orders v2 Ready
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. THE 4-STAGE PIPELINE: INTERACTIVE PRODUCT WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="brand" size="md">
            LIVE INTERACTIVE WORKFLOW
          </Badge>
          <h2 className="text-3xl font-extrabold text-text tracking-tight mt-3">
            From Natural Language Intent to Confirmed PayPal Sandbox Order
          </h2>
          <p className="text-sm text-text-muted mt-2">
            Click each step below to inspect how PAYPAL AEGIS validates, locks, and executes every transaction state.
          </p>
        </div>

        {/* Step Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {[
            { step: 1, title: '01. Intent Ingestion', desc: 'Natural Query → Specs' },
            { step: 2, title: '02. Discovery & FitCheck', desc: 'Hardware Matrix Audit' },
            { step: 3, title: '03. Purchase Passport', desc: 'HMAC-SHA256 Mandate' },
            { step: 4, title: '04. PayPal Sandbox', desc: 'Server-Side Capture' }
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setActiveWorkflowStep(item.step)}
              className={`p-4 rounded-2xl text-left border transition-all ${
                activeWorkflowStep === item.step
                  ? 'bg-surface border-brand-blue shadow-soft-lg ring-2 ring-brand-blue/20'
                  : 'bg-bg-subtle border-border hover:border-border-strong opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-bold ${
                    activeWorkflowStep === item.step ? 'text-brand-blue' : 'text-text-muted'
                  }`}
                >
                  {item.title}
                </span>
                {activeWorkflowStep === item.step && (
                  <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                )}
              </div>
              <span className="text-[11px] text-text-muted block font-sans">{item.desc}</span>
            </button>
          ))}
        </div>

        {/* Interactive Step Preview Console */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8 bg-surface border-border shadow-soft-xl overflow-hidden">
            {activeWorkflowStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-brand-blue" />
                    <span className="font-bold text-sm text-text">Step 1: BUYWISE Intent Normalization</span>
                  </div>
                  <Badge variant="blue" size="sm">Rule-Based / OpenAI / Gemini</Badge>
                </div>
                <div className="bg-bg-subtle p-3.5 rounded-xl border border-border font-mono text-xs">
                  <span className="text-text-muted block text-[10px] uppercase font-bold mb-1">Raw User Input:</span>
                  <p className="text-text font-semibold">"Need a high-refresh monitor and wireless mouse for competitive gaming under $500 total."</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-bg-subtle rounded-xl border border-border">
                    <span className="text-text-muted text-[10px] block uppercase font-bold">Categories Extracted</span>
                    <span className="text-brand-blue font-bold">['monitors', 'mice']</span>
                  </div>
                  <div className="p-3 bg-bg-subtle rounded-xl border border-border">
                    <span className="text-text-muted text-[10px] block uppercase font-bold">Budget Ceiling</span>
                    <span className="text-status-success font-bold">$500.00 USD</span>
                  </div>
                  <div className="p-3 bg-bg-subtle rounded-xl border border-border">
                    <span className="text-text-muted text-[10px] block uppercase font-bold">Key Specs</span>
                    <span className="text-brand-violet font-bold">refreshRate ≥ 144Hz</span>
                  </div>
                </div>
              </div>
            )}

            {activeWorkflowStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-5 h-5 text-status-success" />
                    <span className="font-bold text-sm text-text">Step 2: Deterministic Discovery & FitCheck</span>
                  </div>
                  <Badge variant="success" size="sm">Zero Hallucinations</Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  The discovery engine queries catalog records directly without LLM price guessing. FitCheck analyzes USB-C PD wattage, DisplayPort alt-mode, and return policies.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-bg-subtle rounded-xl border border-border space-y-1">
                    <span className="font-bold text-text block">PRISM 27" 4K Monitor</span>
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-text-muted">
                      <span>$379.00 USD</span>
                      <span>•</span>
                      <span className="text-status-success font-bold">FairPrice: Good Deal</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-bg-subtle rounded-xl border border-border space-y-1">
                    <span className="font-bold text-text block">Aerolite Pro Wireless Mouse</span>
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-text-muted">
                      <span>$49.99 USD</span>
                      <span>•</span>
                      <span className="text-status-success font-bold">FitCheck: USB-C Pass</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeWorkflowStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <FileCheck2 className="w-5 h-5 text-brand-violet" />
                    <span className="font-bold text-sm text-text">Step 3: Purchase Passport & Signed Mandate</span>
                  </div>
                  <Badge variant="purple" size="sm">15-Min Single-Use TTL</Badge>
                </div>
                <div className="p-4 bg-bg-subtle rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
                  <div>
                    <span className="text-text-muted text-[10px] uppercase font-bold block">Canonical Order Fingerprint</span>
                    <span className="text-status-success font-bold break-all">
                      HMAC-SHA256: d8e29a...f710c4 (Locked to Cart v2)
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-text-muted text-[10px] uppercase font-bold block">Authorized Total</span>
                    <span className="text-lg font-black text-text">$463.31 USD</span>
                  </div>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                  Any attempt to modify cart quantities, add items, or inject prices after this step instantly voids the mandate and triggers the AEGIS tamper defense layer.
                </p>
              </div>
            )}

            {activeWorkflowStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-brand-blue" />
                    <span className="font-bold text-sm text-text">Step 4: PayPal Orders v2 REST API Execution</span>
                  </div>
                  <Badge variant="success" size="sm">COMPLETED (Sandbox)</Badge>
                </div>
                <div className="bg-bg-subtle p-4 rounded-xl border border-border font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-muted">PayPal Order ID:</span>
                    <code className="text-text font-bold">5XR8920194827104</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Server-Side Capture:</span>
                    <code className="text-status-success font-bold">CAP-8920194827104 (COMPLETED)</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Durable Order Ledger:</span>
                    <code className="text-brand-blue font-bold">ORD-2026-X82A</code>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 text-xs font-mono">
                  <span className="text-text-muted">30-day merchant return protection active.</span>
                  <Link to="/workspace" className="text-brand-blue font-bold hover:underline flex items-center space-x-1">
                    <span>Try it in AI Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 3. MISSIONS-BASED SHOPPING SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-8 sm:p-10 space-y-8 bg-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <Badge variant="brand" size="sm">
                SIGNATURE CAPABILITY
              </Badge>
              <h2 className="text-2xl font-bold text-text tracking-tight mt-2">
                Mission-Based Shopping: Solve Real Complex Setup Goals
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Stop browsing dozens of disconnected product pages. Give SHOPMATE an objective and budget ceiling:
              </p>
            </div>

            <Link to="/missions">
              <Button variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                Build Custom Mission
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Preset 1 */}
            <div className="p-5 rounded-card bg-bg-subtle border border-border space-y-3 hover:border-brand-blue transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded border border-brand-blue/20">
                  DEVELOPER RIG
                </span>
                <span className="text-xs font-mono font-bold text-text tabular-nums">Budget: $1,000</span>
              </div>
              <h4 className="font-bold text-text text-sm">AI Development Workstation</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Workstation with dedicated GPU, 32GB RAM, 4K USB-C monitor, and mechanical keyboard.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                <span className="text-status-success font-bold tabular-nums">Plan Total: $949.98</span>
                <Link to="/workspace?preset=ai_workstation" className="text-brand-blue font-bold hover:underline">
                  Load Preset →
                </Link>
              </div>
            </div>

            {/* Preset 2 */}
            <div className="p-5 rounded-card bg-bg-subtle border border-border space-y-3 hover:border-brand-violet transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-brand-violet bg-brand-violet/10 px-2 py-0.5 rounded border border-brand-violet/20">
                  GAMING
                </span>
                <span className="text-xs font-mono font-bold text-text tabular-nums">Budget: $1,500</span>
              </div>
              <h4 className="font-bold text-text text-sm">Ultra High-Refresh Gaming Setup</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                144Hz+ Gaming monitor, wireless ultra-light mouse, mechanical keyboard, and spatial audio headset.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                <span className="text-status-success font-bold tabular-nums">Plan Total: $1,389.96</span>
                <Link to="/workspace?preset=gaming_setup" className="text-brand-violet font-bold hover:underline">
                  Load Preset →
                </Link>
              </div>
            </div>

            {/* Preset 3 */}
            <div className="p-5 rounded-card bg-bg-subtle border border-border space-y-3 hover:border-status-success transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-status-success bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">
                  WORK FROM HOME
                </span>
                <span className="text-xs font-mono font-bold text-text tabular-nums">Budget: $700</span>
              </div>
              <h4 className="font-bold text-text text-sm">Quiet Productivity Home Office</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Ergonomic USB-C hub monitor, active noise-cancelling headphones, silent keyboard, and smart lighting.
              </p>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-mono">
                <span className="text-status-success font-bold tabular-nums">Plan Total: $648.97</span>
                <Link to="/workspace?preset=home_office" className="text-status-success font-bold hover:underline">
                  Load Preset →
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. AEGIS ZERO-HALLUCINATION & SECURITY ARCHITECTURE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="success" size="md">
            ZERO HALLUCINATION PROTOCOL
          </Badge>
          <h2 className="text-3xl font-extrabold text-text tracking-tight mt-3">
            Every Recommendation is Evidence-Linked
          </h2>
          <p className="text-sm text-text-muted mt-2">
            AI language models hallucinate numbers and inventory. PAYPAL AEGIS isolates the LLM to natural language understanding while deterministic code makes all factual checks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hoverable className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-status-success-bg text-status-success flex items-center justify-center border border-status-success-border">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text text-base">FitCheck Hardware Verification</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Rules-based engine checks port compatibility, USB-C Power Delivery wattages, PCIe clearance, and socket standards before purchase.
            </p>
          </Card>

          <Card hoverable className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center border border-brand-blue/20">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text text-base">Second Opinion & Regret Shield</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Independent audit pass warns if you are overpaying for unneeded performance headroom or missing identical refurbished savings.
            </p>
          </Card>

          <Card hoverable className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-violet/10 text-brand-violet flex items-center justify-center border border-brand-violet/20">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text text-base">Spending Guard & Kill Switch</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Hard programmatic spending ceilings prevent agent runaway or cart tampering. Emergency kill switch halts transactions instantly.
            </p>
          </Card>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="neutral" size="md">
            FREQUENTLY ASKED QUESTIONS
          </Badge>
          <h2 className="text-2xl font-bold text-text tracking-tight">
            How SHOPMATE AI and PAYPAL AEGIS Work Together
          </h2>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h4 className="font-bold text-text text-sm">
              Does the AI have access to my credit card or bank account?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed mt-1.5">
              <strong>No.</strong> The AI shopping agent has zero access to payment credentials. Payments execute strictly inside PayPal's secure iframe or redirected checkout page under your explicit biometric or password authorization.
            </p>
          </Card>

          <Card className="p-5">
            <h4 className="font-bold text-text text-sm">
              What prevents the AI from changing items or prices before checkout?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed mt-1.5">
              The <strong>Purchase Passport</strong> locks line item snapshots, version numbers, and financial totals into an <strong>HMAC-SHA256 signature mandate</strong>. Any modification to items or quantities invalidates the mandate immediately.
            </p>
          </Card>

          <Card className="p-5">
            <h4 className="font-bold text-text text-sm">
              Is this real live inventory?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed mt-1.5">
              This is an independent hackathon prototype. All 70 catalogue items and merchant credentials are sample data clearly tagged with a "Sample data" badge. Payments connect to the official PayPal Sandbox.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};
