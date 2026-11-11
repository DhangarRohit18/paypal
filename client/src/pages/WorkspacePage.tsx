import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Scale,
  Search,
  Lock,
  History,
  Activity,
  Tag,
  Info,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api.js';
import { useCart } from '../context/CartContext.js';
import { IProduct, IUnderstoodRequirements, IConversation } from '../../../shared/types.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { BudgetMeter } from '../components/ui/BudgetMeter.js';
import { Dialog } from '../components/ui/Dialog.js';

interface ChatMessageView {
  id: string;
  sender: 'user' | 'assistant' | 'aegis';
  text: string;
  products?: IProduct[];
  agentMode?: string;
  timestamp: string;
  securityBlocked?: boolean;
}

export const WorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, addToCart, refreshCart } = useCart();
  const initialQuery = searchParams.get('q');

  // Conversations state
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Cart action & spending alert states
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [spendingAlert, setSpendingAlert] = useState<{
    message: string;
    violations: string[];
    suggestedFixes: string[];
  } | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessageView[]>([
    {
      id: 'welcome-0',
      sender: 'assistant',
      text: 'Hello! I am SHOPMATE AI powered by PAYPAL AEGIS. Tell me your shopping goal, budget envelope, or hardware requirements (e.g. "I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD").',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentStatusText, setAgentStatusText] = useState<string | null>(null);

  // System Execution Mode (Offline rule-based mode vs AI agent mode)
  const [systemMode, setSystemMode] = useState<'ai_llm' | 'offline_rule_based'>('offline_rule_based');

  // Understood Requirements state (Right Panel)
  const [requirements, setRequirements] = useState<IUnderstoodRequirements>({
    categories: ['laptops'],
    category: 'laptops',
    budget: { amount: 1500, currency: 'USD' },
    budgetLimit: 1500,
    specs: { ram: 16, storage: 1000 },
    requiredSpecs: { ram: 16, storage: 1000 },
    brandsInclude: [],
    preferredBrands: [],
    brandsExclude: [],
    excludedBrands: [],
    intendedUse: 'Software development and programming',
    targetUse: 'Software development and programming',
    excludedProducts: [],
    missingInfo: [],
    mustHaveFeatures: ['16GB RAM', '1TB SSD'],
    clarifyingQuestion: null
  });

  // Comparison State (up to 3 products)
  const [comparedProducts, setComparedProducts] = useState<IProduct[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);

  // Live Agent Activity Feed state
  const [agentEvents, setAgentEvents] = useState<any[]>([]);

  // Brand input state for right panel
  const [newBrandInclude, setNewBrandInclude] = useState('');
  const [newBrandExclude, setNewBrandExclude] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatusText]);

  // Load conversation list and initial query on mount
  useEffect(() => {
    loadConversations();
    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      if (data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    }
  };

  // Start a new clean session
  const handleNewMission = () => {
    setActiveConversationId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'New shopping mission initialized. What hardware setup, component bundle, or tech goal can I research for you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setRequirements({
      categories: ['laptops'],
      category: 'laptops',
      budget: { amount: 1500, currency: 'USD' },
      budgetLimit: 1500,
      specs: {},
      requiredSpecs: {},
      brandsInclude: [],
      preferredBrands: [],
      brandsExclude: [],
      excludedBrands: [],
      intendedUse: 'General computing',
      targetUse: 'General computing',
      excludedProducts: [],
      missingInfo: [],
      mustHaveFeatures: [],
      clarifyingQuestion: null
    });
  };

  // Switch active conversation
  const handleSelectConversation = async (conv: IConversation) => {
    try {
      setActiveConversationId(conv.conversationId);
      const data = await api.getConversation(conv.conversationId);
      if (data?.conversation) {
        if (data.conversation.understoodRequirements) {
          setRequirements(data.conversation.understoodRequirements);
        }
        if (data.conversation.messages && data.conversation.messages.length > 0) {
          const formatted: ChatMessageView[] = data.conversation.messages.map((m: any) => ({
            id: m.id || String(Math.random()),
            sender: m.role === 'assistant' ? 'assistant' : 'user',
            text: m.content,
            products: m.renderedCards,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
        }
      }
    } catch (err) {
      console.warn('Error selecting conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.conversationId !== id));
      if (activeConversationId === id) {
        handleNewMission();
      }
    } catch (err) {
      console.warn('Error deleting conversation:', err);
    }
  };

  // SSE Streaming Turn Handler
  const handleSendMessage = async (textToSend?: string, reqsOverride?: Partial<IUnderstoodRequirements>) => {
    const query = (textToSend || inputText).trim();
    if (!query && !reqsOverride) return;

    // 1. Add User Message
    if (query) {
      const userMsg: ChatMessageView = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
    }

    setLoading(true);
    setAgentStatusText('Analyzing shopping intent...');

    // 2. Prepare Assistant Message Placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessageView = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      products: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      let accumulatedText = '';
      let deliveredProducts: IProduct[] = [];
      let detectedMode = 'offline_rule_based';

      await api.chatStream(
        {
          message: query || 'Update search criteria based on requirements',
          conversationId: activeConversationId || undefined,
          updatedRequirements: reqsOverride || undefined
        },
        (chunk) => {
          // Parse SSE stream chunks
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();
              if (rawData === '[DONE]') continue;

              try {
                const event = JSON.parse(rawData);

                if (event.type === 'agent_status') {
                  const statusMap: Record<string, string> = {
                    analyzing_intent: 'Analyzing shopping goal & specifications...',
                    searching_catalogue: 'Searching verified merchant catalogue...',
                    filtering_specs: 'Evaluating hardware constraints & compatibility...',
                    evaluating_fit: 'Running AEGIS FitCheck rules...'
                  };
                  setAgentStatusText(statusMap[event.status] || event.status);
                } else if (event.type === 'mode_switch') {
                  detectedMode = event.mode;
                  setSystemMode(event.mode === 'ai_llm' ? 'ai_llm' : 'offline_rule_based');
                } else if (event.type === 'token') {
                  accumulatedText += event.token;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, text: accumulatedText, agentMode: detectedMode }
                        : m
                    )
                  );
                } else if (event.type === 'requirements_updated') {
                  if (event.requirements) {
                    setRequirements(event.requirements);
                  }
                } else if (event.type === 'products') {
                  deliveredProducts = event.products || [];
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, products: deliveredProducts } : m
                    )
                  );
                } else if (event.type === 'agent_event') {
                  if (event.event) {
                    setAgentEvents((prev) => [event.event, ...prev.slice(0, 9)]);
                  }
                } else if (event.type === 'conversation_id') {
                  setActiveConversationId(event.conversationId);
                  loadConversations();
                } else if (event.type === 'done') {
                  setLoading(false);
                  setAgentStatusText(null);
                }
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        }
      );
    } catch (err: any) {
      console.error('Chat stream failed:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: `⚠️ Connection error: ${err.message || 'Could not communicate with SHOPMATE server.'}`
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setAgentStatusText(null);
    }
  };

  // Right Panel: Apply Requirements Button
  const handleApplyRequirements = () => {
    const summary = `Updated constraints: Category ${requirements.category || requirements.categories[0]}, Budget $${requirements.budget.amount}`;
    handleSendMessage(summary, requirements);
  };

  // Add to cart with Spending Guard interception alert
  const handleAddToCart = async (product: IProduct) => {
    try {
      const res = await addToCart(product.id, 1);
      if (!res.success) {
        setSpendingAlert({
          message: res.error || 'Spending Guard Policy Violation',
          violations: res.violations || [res.error || 'Spending limit exceeded'],
          suggestedFixes: res.suggestedFixes || []
        });
      } else {
        setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
        setTimeout(() => setAddedItemIds((prev) => ({ ...prev, [product.id]: false })), 2000);
      }
    } catch (err: any) {
      setSpendingAlert({
        message: err.message || 'Action blocked by AEGIS',
        violations: err.violations || [err.message],
        suggestedFixes: err.suggestedFixes || []
      });
    }
  };

  // Toggle Product Comparison
  const handleToggleCompare = (product: IProduct) => {
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 products at a time.');
        return prev;
      }
      return [...prev, product];
    });
    setShowCompareDrawer(true);
  };

  const quickPrompts = [
    'I need a laptop for programming and AI development, budget $1,000, 16GB RAM, 1TB SSD',
    'Find wireless headphones under $100 with noise cancellation',
    '4K productivity monitor with USB-C under $400',
    'Mechanical keyboard and wireless mouse bundle under $200'
  ];

  return (
    <div className="min-h-[calc(100vh-4.25rem)] bg-bg text-text flex flex-col font-sans transition-colors">
      {/* Top Banner: AEGIS Status & Mode Badge */}
      <div className="bg-surface border-b border-border px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-3">
          <span className="flex items-center text-status-success font-mono font-semibold">
            <ShieldCheck className="w-4 h-4 mr-1 text-status-success" />
            AEGIS AGENT GATEWAY: ACTIVE
          </span>
          <span className="text-text-subtle hidden sm:inline">•</span>
          <span className="text-text-muted font-mono hidden sm:inline">DETERMINISTIC VERIFICATION ACTIVE</span>
        </div>

        {/* Execution Mode Badge */}
        <div className="flex items-center space-x-3">
          <Badge
            variant={systemMode === 'ai_llm' ? 'brand' : 'warning'}
            size="md"
            dot
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {systemMode === 'ai_llm' ? 'AI agent mode (OpenAI/Gemini)' : 'Offline rule-based mode'}
          </Badge>

          <div className="text-text-muted font-mono hidden md:block">
            Budget Ceiling:{' '}
            <strong className="text-status-success font-mono tabular-nums">
              ${requirements.budget.amount.toLocaleString()} USD
            </strong>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Conversation History & Quick Starters (col-span-3) */}
        <div className="lg:col-span-3 border-r border-border bg-surface p-4 flex flex-col justify-between hidden md:flex overflow-y-auto">
          <div>
            <Button
              onClick={handleNewMission}
              variant="primary"
              size="md"
              className="w-full mb-4"
              icon={<Plus className="w-4 h-4" />}
            >
              New Shopping Mission
            </Button>

            {/* Conversation History */}
            <div className="mb-6">
              <div className="flex items-center space-x-1.5 text-xs font-mono uppercase text-text-muted font-semibold mb-2.5 px-1">
                <History className="w-3.5 h-3.5 text-brand-blue" />
                <span>Conversation History</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {conversations.length === 0 ? (
                  <p className="text-[11px] text-text-subtle italic px-2 py-1">No prior missions yet</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.conversationId}
                      onClick={() => handleSelectConversation(conv)}
                      className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition border ${
                        activeConversationId === conv.conversationId
                          ? 'bg-bg-subtle border-brand-blue text-text font-semibold'
                          : 'bg-surface border-border text-text-muted hover:text-text hover:bg-bg-subtle'
                      }`}
                    >
                      <span className="line-clamp-1 pr-2">{conv.title || 'Shopping mission'}</span>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.conversationId, e)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-danger p-1 transition"
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-1.5 mb-6">
              <span className="text-[11px] uppercase font-mono font-bold text-text-muted tracking-wider px-1 block mb-1">
                Suggested Starters
              </span>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left text-xs bg-bg-subtle hover:bg-border/50 text-text-muted hover:text-text p-2.5 rounded-xl border border-border transition flex items-center justify-between group"
                >
                  <span className="line-clamp-2 pr-2">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-brand-blue flex-shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border text-[11px] text-text-subtle font-mono flex items-center justify-between">
            <span>AEGIS CORE v3.0</span>
            <span className="text-status-success font-semibold">SAFE SLICE</span>
          </div>
        </div>

        {/* Center Column: Streaming Chat Area & Product Cards (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col bg-bg h-[calc(100vh-6.75rem)] relative">
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-2 mb-1 px-1">
                  <span className="text-[11px] font-mono text-text-muted font-medium">
                    {msg.sender === 'user'
                      ? 'You (Jane Doe)'
                      : msg.sender === 'aegis'
                      ? 'AEGIS Security Intercept'
                      : 'SHOPMATE AI Assistant'}
                  </span>
                  <span className="text-[10px] text-text-subtle font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-brand-blue text-white rounded-tr-none shadow-soft'
                      : msg.sender === 'aegis'
                      ? 'bg-status-danger-bg text-status-danger-text border border-status-danger-border rounded-tl-none font-mono text-xs'
                      : 'bg-surface text-text border border-border rounded-tl-none shadow-soft'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Blinking streaming cursor when generating */}
                  {loading && msg.sender === 'assistant' && msg.id === messages[messages.length - 1].id && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-brand-blue animate-pulse align-middle" />
                  )}

                  {msg.agentMode && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>Execution Mode: AEGIS {msg.agentMode === 'ai_llm' ? 'LLM Fast Track' : 'Offline Rule-Based'}</span>
                    </div>
                  )}
                </div>

                {/* Delivered Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {msg.products.map((product) => (
                        <div
                          key={product.id}
                          className={`bg-surface border rounded-card p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-soft-lg transition-all duration-200 group ${
                            product.isMaliciousSample
                              ? 'border-status-danger/70 bg-status-danger-bg/20'
                              : 'border-border hover:border-brand-blue/50'
                          }`}
                        >
                          <div>
                            {/* Card Header & Sample Data Badge */}
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <span className="bg-brand-violet/10 text-brand-violet border border-brand-violet/25 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded">
                                Sample data
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bg-subtle text-text-muted font-bold border border-border">
                                {product.category}
                              </span>
                            </div>

                            {/* Product Image */}
                            <div className="w-full h-32 bg-bg-subtle rounded-xl overflow-hidden mb-2.5 relative border border-border">
                              <img
                                src={product.imageUrl || (product.images && product.images[0]) || '/placeholder.png'}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60';
                                }}
                              />
                              {product.isMaliciousSample && (
                                <div className="absolute inset-0 bg-status-danger-bg/95 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center text-status-danger-text">
                                  <AlertTriangle className="w-6 h-6 text-status-danger mb-1" />
                                  <span className="text-[10px] font-mono font-bold leading-tight">
                                    RED TEAM TEST FIXTURE (ISOLATED)
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Title & Brand */}
                            <h4 className="font-bold text-sm text-text line-clamp-1 mb-1 group-hover:text-brand-blue transition">
                              {product.title}
                            </h4>

                            <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">
                              {product.description}
                            </p>

                            {/* Specs Highlights */}
                            {product.specs && Object.keys(product.specs).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2.5">
                                {Object.entries(product.specs)
                                  .slice(0, 3)
                                  .map(([key, val]) => (
                                    <span
                                      key={key}
                                      className="text-[10px] bg-bg-subtle text-text-muted font-mono px-1.5 py-0.5 rounded border border-border"
                                    >
                                      {key}: {String(val)}
                                    </span>
                                  ))}
                              </div>
                            )}

                            {/* Price & Merchant Trust */}
                            <div className="flex items-baseline justify-between mb-2">
                              <span className="text-base font-black font-mono text-text tabular-nums">
                                ${product.price.toFixed(2)} USD
                              </span>
                              <span className="text-[11px] text-status-success font-mono flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-0.5 text-status-success" />
                                {product.merchantName || 'Verified Store'}
                              </span>
                            </div>

                            {/* Warranty & Return Policy */}
                            <div className="text-[10px] text-text-subtle font-mono flex items-center justify-between pb-2 mb-2 border-b border-border">
                              <span>{product.warrantyMonths} mo warranty</span>
                              <span>{product.returnPolicyDays} day returns</span>
                            </div>
                          </div>

                          {/* 4 Card Actions */}
                          <div className="space-y-1.5 pt-1">
                            <div className="grid grid-cols-2 gap-1.5">
                              {/* 1. Add to cart */}
                              <button
                                onClick={() => handleAddToCart(product)}
                                className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition shadow-soft ${
                                  addedItemIds[product.id]
                                    ? 'bg-status-success text-white'
                                    : 'bg-brand-blue hover:bg-brand-blue-600 text-white'
                                }`}
                              >
                                {addedItemIds[product.id] ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>Add to Cart</span>
                                  </>
                                )}
                              </button>

                              {/* 2. Compare */}
                              <button
                                onClick={() => handleToggleCompare(product)}
                                className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition border ${
                                  comparedProducts.some((p) => p.id === product.id)
                                    ? 'bg-brand-blue text-white border-brand-blue'
                                    : 'bg-surface hover:bg-bg-subtle text-text border-border'
                                }`}
                              >
                                <Scale className="w-3.5 h-3.5" />
                                <span>
                                  {comparedProducts.some((p) => p.id === product.id)
                                    ? 'Comparing'
                                    : 'Compare'}
                                </span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              {/* 3. Explain */}
                              <div className="relative group/btn">
                                <button
                                  disabled
                                  className="w-full py-1.5 rounded-lg text-xs font-semibold bg-bg-subtle text-text-subtle opacity-60 cursor-not-allowed flex items-center justify-center space-x-1"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                  <span>Explain</span>
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/btn:block bg-surface text-status-warning text-[10px] px-2 py-1 rounded shadow-soft border border-border whitespace-nowrap z-20 font-mono">
                                  Evidence Explanations (Phase 6)
                                </div>
                              </div>

                              {/* 4. Find alternative */}
                              <button
                                onClick={() =>
                                  handleSendMessage(
                                    `Find a cheaper or similar alternative to ${product.title}`
                                  )
                                }
                                className="w-full py-1.5 rounded-lg text-xs font-semibold bg-bg-subtle hover:bg-border text-text-muted hover:text-text border border-border transition flex items-center justify-center space-x-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Alternative</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Agent Status Pill */}
            {loading && agentStatusText && (
              <div className="flex items-center space-x-2 text-xs font-mono text-text-muted bg-surface px-3 py-1.5 rounded-full border border-border w-fit shadow-soft-sm animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-blue" />
                <span>{agentStatusText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-4 bg-surface border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='Ask SHOPMATE AI (e.g. I need a laptop for programming, budget $1,000, 16GB RAM, 1TB SSD)...'
                  disabled={loading}
                  className="w-full bg-bg-subtle text-text placeholder:text-text-subtle text-xs rounded-xl pl-4 pr-10 py-3 border border-border focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition disabled:opacity-50"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !inputText.trim()}
                variant="primary"
                size="md"
                icon={<Send className="w-4 h-4" />}
              >
                Send
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Understood Requirements Panel (col-span-3) */}
        <div className="lg:col-span-3 border-l border-border bg-surface p-4 flex flex-col justify-between overflow-y-auto hidden lg:flex">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-brand-blue" />
                <h3 className="font-extrabold text-xs uppercase font-mono tracking-wider text-text">
                  UNDERSTOOD REQUIREMENTS
                </h3>
              </div>
              <Badge variant="brand" size="sm">LIVE</Badge>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed mb-4">
              Fine-tune requirements without restarting chat. Click Apply to re-search.
            </p>

            <div className="space-y-4 text-xs font-mono">
              {/* Target Use */}
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Target Use</label>
                <input
                  type="text"
                  value={requirements.targetUse || requirements.intendedUse || ''}
                  onChange={(e) =>
                    setRequirements((r) => ({
                      ...r,
                      targetUse: e.target.value,
                      intendedUse: e.target.value
                    }))
                  }
                  className="w-full bg-bg-subtle border border-border rounded-xl px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Budget Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-text-muted">Budget Limit</span>
                  <span className="text-status-success font-bold tabular-nums">
                    ${requirements.budget.amount} USD
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="3500"
                  step="10"
                  value={requirements.budget.amount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setRequirements((r) => ({
                      ...r,
                      budget: { ...r.budget, amount: amt },
                      budgetLimit: amt
                    }));
                  }}
                  className="w-full accent-brand-blue h-1.5 bg-border rounded-lg cursor-pointer"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Category</label>
                <select
                  value={requirements.category || (requirements.categories && requirements.categories[0]) || ''}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setRequirements((r) => ({
                      ...r,
                      category: cat,
                      categories: cat ? [cat] : []
                    }));
                  }}
                  className="w-full bg-bg-subtle border border-border rounded-xl px-2 py-1.5 text-xs text-text focus:outline-none focus:border-brand-blue"
                >
                  <option value="">All Categories</option>
                  <option value="laptops">Laptops</option>
                  <option value="monitors">Monitors</option>
                  <option value="headphones">Headphones</option>
                  <option value="keyboards">Keyboards</option>
                  <option value="mice">Mice</option>
                  <option value="smartphones">Smartphones</option>
                  <option value="cameras">Cameras</option>
                  <option value="gaming_accessories">Gaming & Desk Gear</option>
                  <option value="smart_home">Smart Home</option>
                </select>
              </div>

              {/* Preferred Brands */}
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Preferred Brands</label>
                <div className="flex space-x-1 mb-1.5">
                  <input
                    type="text"
                    value={newBrandInclude}
                    onChange={(e) => setNewBrandInclude(e.target.value)}
                    placeholder="Add brand (e.g. Asus)"
                    className="flex-1 bg-bg-subtle border border-border rounded-lg px-2 py-1 text-xs text-text"
                  />
                  <Button
                    onClick={() => {
                      if (newBrandInclude.trim()) {
                        setRequirements((r) => ({
                          ...r,
                          brandsInclude: [...(r.brandsInclude || []), newBrandInclude.trim()],
                          preferredBrands: [...(r.preferredBrands || []), newBrandInclude.trim()]
                        }));
                        setNewBrandInclude('');
                      }
                    }}
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(requirements.brandsInclude || []).map((b, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue rounded text-[10px] flex items-center space-x-1"
                    >
                      <span>{b}</span>
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setRequirements((r) => ({
                            ...r,
                            brandsInclude: (r.brandsInclude || []).filter((_, idx) => idx !== i)
                          }))
                        }
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Excluded Brands */}
              <div>
                <label className="text-[11px] text-text-muted block mb-1">Excluded Brands</label>
                <div className="flex space-x-1 mb-1.5">
                  <input
                    type="text"
                    value={newBrandExclude}
                    onChange={(e) => setNewBrandExclude(e.target.value)}
                    placeholder="Exclude brand (e.g. Dell)"
                    className="flex-1 bg-bg-subtle border border-border rounded-lg px-2 py-1 text-xs text-text"
                  />
                  <Button
                    onClick={() => {
                      if (newBrandExclude.trim()) {
                        setRequirements((r) => ({
                          ...r,
                          brandsExclude: [...(r.brandsExclude || []), newBrandExclude.trim()],
                          excludedBrands: [...(r.excludedBrands || []), newBrandExclude.trim()]
                        }));
                        setNewBrandExclude('');
                      }
                    }}
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2"
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(requirements.brandsExclude || []).map((b, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-status-danger-bg border border-status-danger-border text-status-danger-text rounded text-[10px] flex items-center space-x-1"
                    >
                      <span>{b}</span>
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() =>
                          setRequirements((r) => ({
                            ...r,
                            brandsExclude: (r.brandsExclude || []).filter((_, idx) => idx !== i)
                          }))
                        }
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Required Specs */}
              {requirements.specs && Object.keys(requirements.specs).length > 0 && (
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Required Specs</label>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(requirements.specs).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-1.5 py-0.5 bg-bg-subtle border border-border text-text-muted rounded text-[10px]"
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Apply & Re-search Button */}
            <Button
              onClick={handleApplyRequirements}
              variant="secondary"
              size="md"
              className="mt-4 w-full"
              icon={<RefreshCw className="w-3.5 h-3.5 text-brand-blue" />}
            >
              Apply & Re-search
            </Button>

            {/* Budget Utilization Meter */}
            <div className="mt-5 p-3 rounded-xl bg-bg-subtle border border-border">
              <div className="flex justify-between text-[11px] font-mono mb-1.5">
                <span className="text-text-muted">Budget Envelope</span>
                <span className="text-status-success font-bold tabular-nums">
                  ${requirements.budget.amount} USD
                </span>
              </div>
              <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-blue to-status-success w-full" />
              </div>
            </div>

            {/* Cart Live Summary */}
            <div className="mt-5 p-3.5 rounded-2xl bg-bg-subtle border border-border">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-text">
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-blue" />
                  <span>CART SUMMARY ({cart?.items.reduce((s, i) => s + i.quantity, 0) || 0})</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">v{cart?.version || 1}</span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[11px] text-text-muted font-mono">Current Total</span>
                <span className="text-base font-black font-mono text-status-success tabular-nums">
                  ${cart?.total.toFixed(2) || '0.00'} USD
                </span>
              </div>
              {cart && cart.items.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto mb-3 pr-1 text-[10px] font-mono">
                  {cart.items.map((it) => (
                    <div key={it.productId} className="flex justify-between text-text">
                      <span className="truncate max-w-[140px]">{it.productSnapshot.title}</span>
                      <span className="text-text-muted font-bold tabular-nums">{it.quantity}x ${it.unitPrice.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-text-subtle font-mono italic mb-3">Cart is empty</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full py-1.5 rounded-lg bg-surface hover:bg-bg text-text font-mono text-[11px] font-semibold border border-border transition text-center"
                >
                  View Cart
                </button>
                <button
                  onClick={async () => {
                    try {
                      const psp = await api.generatePassport();
                      if (psp.passport?.passportId) {
                        navigate(`/passport?id=${psp.passport.passportId}`);
                      }
                    } catch (err: any) {
                      alert(err.message || 'Cannot generate passport with empty cart.');
                    }
                  }}
                  disabled={!cart || cart.items.length === 0}
                  className="w-full py-1.5 rounded-lg bg-brand-violet hover:bg-brand-violet-600 disabled:opacity-40 text-white font-mono text-[11px] font-semibold transition text-center"
                >
                  Passport →
                </button>
              </div>
            </div>

            {/* Live AEGIS Agent Activity Feed */}
            <div className="mt-5">
              <div className="flex items-center space-x-1.5 text-xs font-mono uppercase text-text-muted font-semibold mb-2">
                <Activity className="w-3.5 h-3.5 text-status-success" />
                <span>Live AEGIS Activity Feed</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {agentEvents.length === 0 ? (
                  <p className="text-[10px] text-text-subtle italic">No tool executions logged yet</p>
                ) : (
                  agentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-1.5 bg-surface border border-border rounded-lg text-[10px] font-mono"
                    >
                      <div className="flex justify-between text-text-muted">
                        <span className="text-brand-blue font-semibold">{evt.toolName || evt.action}</span>
                        <span className="text-status-success">{evt.permissionCheck}</span>
                      </div>
                      <p className="text-text-subtle truncate">{evt.outputSummary || evt.inputSummary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Comparison Drawer */}
      {showCompareDrawer && comparedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t-2 border-brand-blue shadow-soft-xl p-4 transition-transform duration-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-brand-blue" />
                <span className="font-bold text-xs uppercase font-mono text-text">
                  Side-by-Side Comparison ({comparedProducts.length}/3 products)
                </span>
              </div>
              <button
                onClick={() => setShowCompareDrawer(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {comparedProducts.map((p) => (
                <div key={p.id} className="p-3 bg-bg-subtle rounded-xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-text line-clamp-1">{p.title}</span>
                    <button
                      onClick={() => handleToggleCompare(p)}
                      className="text-text-muted hover:text-status-danger p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-mono text-status-success font-black text-sm tabular-nums">
                    ${p.price.toFixed(2)} USD
                  </div>
                  <div className="space-y-1 text-[11px] text-text-muted font-mono">
                    <div>Warranty: {p.warrantyMonths}m</div>
                    <div>Return window: {p.returnPolicyDays}d</div>
                    {p.specs && (
                      <div className="line-clamp-2">
                        {Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAddToCart(p)}
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                  >
                    Add this to Cart
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spending Guard Intercept Alert Modal (Required Phase 4) */}
      {spendingAlert && (
        <Dialog
          open={!!spendingAlert}
          onClose={() => setSpendingAlert(null)}
          title="AEGIS SPENDING GUARD: BLOCKED"
          description="Action blocked: Cart addition breaches your authorized spending policy rules."
          footer={
            <>
              <Button
                onClick={() => setSpendingAlert(null)}
                variant="secondary"
                size="sm"
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  setSpendingAlert(null);
                  navigate('/settings');
                }}
                variant="danger"
                size="sm"
              >
                Adjust Policy Limits
              </Button>
            </>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger-border text-status-danger-text space-y-1">
              {spendingAlert.violations.map((v, i) => (
                <div key={i}>• {v}</div>
              ))}
            </div>

            {spendingAlert.suggestedFixes.length > 0 && (
              <div className="p-3 rounded-xl bg-bg-subtle border border-border text-text space-y-1">
                <span className="text-status-success font-bold block">💡 Actionable Fix:</span>
                <p className="text-text-muted text-[11px] leading-relaxed">
                  {spendingAlert.suggestedFixes.join(' ')}
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};
