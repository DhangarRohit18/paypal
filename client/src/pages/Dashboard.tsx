import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bot,
  Compass,
  ShoppingBag,
  FileCheck2,
  CreditCard,
  ShieldCheck,
  Bookmark,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  Package,
  Layers,
  Zap,
  Activity,
  AlertOctagon
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { BudgetMeter } from '../components/ui/BudgetMeter.js';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboardSummary();
  }, []);

  const loadDashboardSummary = async () => {
    try {
      setLoading(true);
      const summary = await api.request<any>('/dashboard/summary');
      setData(summary);
    } catch (err) {
      console.warn('Dashboard summary load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/workspace?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/workspace');
    }
  };

  const handleQuickAdd = async (product: any) => {
    const success = await addToCart(product.id, 1);
    if (success) {
      setAddedItemIds(prev => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedItemIds(prev => ({ ...prev, [product.id]: false })), 2000);
      loadDashboardSummary();
    }
  };

  const handleToggleSave = async (productId: string) => {
    try {
      await api.request<any>('/dashboard/saved-products/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      loadDashboardSummary();
    } catch (err: any) {
      alert(`Could not toggle saved product: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center font-mono">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
          <p className="text-xs text-text-muted">Loading AEGIS Dashboard Telemetry...</p>
        </div>
      </div>
    );
  }

  const {
    recentMissions = [],
    activeAgents = [],
    recommendations = [],
    savedProducts = [],
    spendingSummary = {},
    pendingApprovals = [],
    recentOrders = [],
    securityNotifications = []
  } = data || {};

  const totalBudget = spendingSummary.totalBudget || 2500;
  const currentCartValue = spendingSummary.currentCartValue || 0;
  const remainingBudget = spendingSummary.remainingBudget !== undefined ? spendingSummary.remainingBudget : totalBudget - currentCartValue;
  const totalSpentAllTime = spendingSummary.totalSpentAllTime || 0;

  // Chart data from real backend metrics
  const chartData = [
    { name: 'Policy Cap', amount: totalBudget },
    { name: 'Cart Value', amount: currentCartValue },
    { name: 'Historical Spent', amount: totalSpentAllTime },
    { name: 'Safe Headroom', amount: Math.max(remainingBudget, 0) },
  ];

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8 space-y-8 transition-colors">
      {/* 1. Header & Personalized Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[11px] font-mono text-brand-blue uppercase tracking-widest font-bold">
              SHOPMATE INTELLIGENT COMMERCE
            </span>
            <Badge variant="brand" size="sm">AEGIS v3.0 ACTIVE</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-text tracking-tight">
            Welcome back, {user?.name || 'Shopper'}
          </h1>
          <p className="text-xs text-text-muted font-mono mt-1">
            Deterministic Spending Guard Armed • HMAC-SHA256 Mandates Enforced
          </p>
        </div>

        {/* Global Search Bar routing to AI Workspace */}
        <form onSubmit={handleSearchSubmit} className="max-w-md w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask SHOPMATE or search catalogue (e.g. 4K monitor, AI laptop)..."
            className="w-full bg-surface border border-border text-text placeholder:text-text-subtle text-xs rounded-xl pl-10 pr-24 py-2.5 h-10 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition shadow-soft-sm"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="absolute right-1.5 top-1.5 h-7 px-3 text-xs"
          >
            Search
          </Button>
        </form>
      </div>

      {/* 2. BENTO ROW 1: SPENDING TELEMETRY & CHARTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-text-muted">Total Policy Budget</span>
            <div className="w-7 h-7 rounded-lg bg-status-success-bg text-status-success flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-text tabular-nums">
            ${totalBudget.toFixed(2)}
          </div>
          <span className="text-[11px] text-text-subtle font-mono mt-1 block">
            Max Cart Limit: ${spendingSummary.maxCartValue?.toFixed(2) || '2,500.00'}
          </span>
        </Card>

        {/* Metric 2 */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-text-muted">Current Cart Value</span>
            <div className="w-7 h-7 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-text tabular-nums">
            ${currentCartValue.toFixed(2)}
          </div>
          <span className="text-[11px] text-status-success font-mono font-semibold mt-1 block">
            ${remainingBudget.toFixed(2)} safe headroom left
          </span>
        </Card>

        {/* Metric 3 */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-text-muted">Orders Settled</span>
            <div className="w-7 h-7 rounded-lg bg-brand-violet/10 text-brand-violet flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-text tabular-nums">
            ${totalSpentAllTime.toFixed(2)}
          </div>
          <span className="text-[11px] text-text-subtle font-mono mt-1 block">
            Across {recentOrders.length} placed order{recentOrders.length === 1 ? '' : 's'}
          </span>
        </Card>

        {/* Metric 4 */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-text-muted">AEGIS Kill Switch</span>
            <div className="w-7 h-7 rounded-lg bg-status-success-bg text-status-success flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono">
            {spendingSummary.killSwitchActive ? (
              <span className="text-status-danger animate-pulse">ENGAGED (HALTED)</span>
            ) : (
              <span className="text-status-success font-semibold">DISENGAGED (ACTIVE)</span>
            )}
          </div>
          <span className="text-[11px] text-text-subtle font-mono mt-1 block">
            Hardware circuit breaker active
          </span>
        </Card>
      </div>

      {/* 3. BENTO ROW 2: SPENDING UTILIZATION SPARKLINE & ACTIVE AGENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending Allocation Sparkline Card (col-span-7) */}
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <CardTitle>Spending Guard Telemetry & Real Allocation</CardTitle>
              <CardDescription>Live budget utilization verified against backend database records</CardDescription>
            </div>
            <Badge variant="brand" size="sm">
              Minor Units (Cents)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="sm:col-span-1 flex flex-col justify-center items-center p-3 bg-bg-subtle rounded-xl border border-border">
              <BudgetMeter
                current={currentCartValue}
                limit={totalBudget}
                variant="ring"
                size="md"
                showLabels={true}
              />
            </div>

            <div className="sm:col-span-2 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#246BFD" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7657FF" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#93A0BC" fontSize={10} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: 'var(--color-text)'
                    }}
                    formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Amount']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#246BFD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#spendingGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Active Agents Card (col-span-5) */}
        <Card className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-brand-blue" />
              <CardTitle>Active Shopping Agents (DB Records)</CardTitle>
            </div>
            <Badge variant="success" size="sm">
              {activeAgents.length} Scoped
            </Badge>
          </div>

          <div className="space-y-3">
            {activeAgents.map((agent: any) => (
              <div
                key={agent.agentId}
                className="bg-bg-subtle border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-text">{agent.name}</span>
                    <Badge variant="success" size="sm">{agent.status}</Badge>
                  </div>
                  <span className="text-[11px] text-text-muted block mt-0.5">{agent.role}</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {agent.scopedPermissions?.map((perm: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono bg-surface text-text-muted px-1.5 py-0.5 rounded border border-border"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                <Link to="/workspace">
                  <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
                    Workspace →
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 4. BENTO ROW 3: RECOMMENDATIONS & PENDING APPROVALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Curated Recommendations (col-span-8) */}
        <Card className="lg:col-span-8 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-brand-violet" />
              <CardTitle>Curated Recommendations (FairPrice Checked)</CardTitle>
            </div>
            <Link to="/workspace" className="text-xs text-brand-blue font-semibold hover:underline">
              Explore All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendations.slice(0, 4).map((prod: any) => (
              <div
                key={prod.id}
                className="bg-bg-subtle border border-border rounded-card p-4 flex flex-col justify-between hover:border-brand-blue/50 transition-all duration-150"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface text-text-muted font-bold border border-border">
                      {prod.category}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Badge variant="sample" size="sm">Sample</Badge>
                      <button
                        onClick={() => handleToggleSave(prod.id)}
                        className="text-text-muted hover:text-status-warning p-1 transition"
                        title="Save product"
                        aria-label="Save product"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-text line-clamp-1 mb-1">{prod.title}</h4>
                  <p className="text-xs text-text-muted line-clamp-2 mb-3">{prod.description}</p>

                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="text-lg font-black font-mono text-text tabular-nums">
                      ${prod.price.toFixed(2)}
                    </span>
                    {prod.fairPrice?.verdict && (
                      <Badge variant="success" size="sm">
                        {prod.fairPrice.verdict}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleQuickAdd(prod)}
                  variant="primary"
                  size="sm"
                  className="w-full"
                  icon={addedItemIds[prod.id] ? <CheckCircle2 className="w-4 h-4 text-status-success" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                >
                  {addedItemIds[prod.id] ? 'Added to Cart!' : 'Add to Cart'}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Approvals & Passports (col-span-4) */}
        <Card className="lg:col-span-4 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-status-warning" />
              <CardTitle>Pending Passports</CardTitle>
            </div>
            <Link to="/passport" className="text-xs text-brand-blue font-semibold hover:underline">
              View All →
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-text-muted bg-bg-subtle rounded-xl border border-border">
              <FileCheck2 className="w-8 h-8 text-text-subtle mx-auto mb-2" />
              <span>No pending Purchase Passports awaiting signature. Add items to cart to generate one.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((pass: any) => (
                <div
                  key={pass.passportId}
                  className="p-3.5 bg-bg-subtle rounded-xl border border-border space-y-2"
                >
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="font-bold text-text truncate max-w-[150px]">{pass.passportId}</span>
                    <Badge variant="warning" size="sm">{pass.approvalStatus}</Badge>
                  </div>
                  <div className="flex justify-between text-xs font-mono text-text-muted">
                    <span>Total:</span>
                    <span className="text-status-success font-black tabular-nums">
                      ${pass.priceBreakdown?.finalTotal?.toFixed(2) || '0.00'} USD
                    </span>
                  </div>
                  <Link to={`/passport?id=${pass.passportId}`}>
                    <Button variant="secondary" size="sm" className="w-full text-xs mt-1">
                      Review & Approve Mandate →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Saved Products Bookmarks */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text flex items-center space-x-1.5">
                <Bookmark className="w-3.5 h-3.5 text-status-warning" />
                <span>Saved Bookmarks ({savedProducts.length})</span>
              </span>
            </div>
            {savedProducts.length === 0 ? (
              <p className="text-[11px] text-text-subtle font-mono">No bookmarked products yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {savedProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-bg-subtle border border-border">
                    <span className="truncate max-w-[140px] text-text">{p.title}</span>
                    <span className="font-mono font-bold text-status-success tabular-nums">${p.price.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 5. BENTO ROW 4: RECENT MISSIONS, ORDERS & AEGIS SECURITY LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Hardware Missions (col-span-4) */}
        <Card className="lg:col-span-4 p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-brand-blue" />
              <CardTitle>Recent Missions</CardTitle>
            </div>
            <Link to="/missions" className="text-xs text-brand-blue font-semibold hover:underline">
              Launch →
            </Link>
          </div>

          {recentMissions.length === 0 ? (
            <div className="p-5 text-center text-xs font-mono text-text-muted bg-bg-subtle rounded-xl border border-border">
              <span>No missions launched yet.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentMissions.slice(0, 3).map((m: any) => (
                <div key={m.id} className="p-3 bg-bg-subtle rounded-xl border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-text block truncate max-w-[170px]">{m.goal}</span>
                    <span className="text-[10px] text-text-muted font-mono">Budget: ${m.targetBudget}</span>
                  </div>
                  <Link to="/missions">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">Plans</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Orders & PayPal Captures (col-span-4) */}
        <Card className="lg:col-span-4 p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-status-success" />
              <CardTitle>Recent Orders</CardTitle>
            </div>
            <Link to="/orders" className="text-xs text-brand-blue font-semibold hover:underline">
              All Orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-5 text-center text-xs font-mono text-text-muted bg-bg-subtle rounded-xl border border-border">
              <span>No PayPal orders captured yet.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.slice(0, 3).map((ord: any) => (
                <div key={ord.orderId} className="p-3 bg-bg-subtle rounded-xl border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-text font-mono block">{ord.orderId}</span>
                    <span className="text-[10px] text-text-muted font-mono">{ord.status}</span>
                  </div>
                  <span className="font-mono font-bold text-status-success tabular-nums">
                    ${ord.totalAmount?.toFixed(2)} USD
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AEGIS Security Ledger Alert Stream (col-span-4) */}
        <Card className="lg:col-span-4 p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-status-success" />
              <CardTitle>AEGIS Security Stream</CardTitle>
            </div>
            <Link to="/security" className="text-xs text-brand-blue font-semibold hover:underline">
              Center →
            </Link>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {securityNotifications.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-text-muted bg-bg-subtle rounded-xl border border-border">
                <span>All operations nominal. Zero security intercepts.</span>
              </div>
            ) : (
              securityNotifications.slice(0, 4).map((sec: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-bg-subtle rounded-xl border border-border text-[11px] font-mono flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-text block truncate">{sec.eventType}</span>
                    <span className="text-text-muted block text-[10px] truncate">{sec.description || sec.actionTaken}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
