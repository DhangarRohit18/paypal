import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, quickLoginDemo } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@shopmate.ai');
  const [password, setPassword] = useState('DemoPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await quickLoginDemo();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-bg text-text flex items-center justify-center p-4 sm:p-6 transition-colors">
      <Card className="max-w-md w-full p-8 shadow-soft-xl border border-border">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-violet p-0.5 mx-auto mb-3.5 shadow-soft">
            <div className="w-full h-full bg-brand-navy rounded-[14px] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-brand-blue" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-text tracking-tight">
            {isRegister ? 'Create Your Account' : 'Sign in to SHOPMATE.AI'}
          </h1>
          <p className="text-xs text-text-muted mt-1 font-mono">
            Powered by PAYPAL AEGIS Trust & Verification Engine
          </p>
        </div>

        {error && (
          <div className="bg-status-danger-bg border border-status-danger-border rounded-xl p-3 text-xs text-status-danger-text font-mono mb-5 text-center">
            {error}
          </div>
        )}

        {/* Quick Demo Button */}
        <Button
          onClick={handleDemoLogin}
          disabled={loading}
          variant="success"
          size="md"
          className="w-full mb-5 font-semibold text-xs"
          icon={<UserCheck className="w-4 h-4" />}
        >
          One-Click Demo Sign-in (Jane Doe)
        </Button>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-text-subtle text-[11px] font-mono">
            OR USE CREDENTIALS
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-bg-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-brand-blue transition"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-text-muted block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@shopmate.ai"
              className="w-full bg-bg-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-brand-blue transition font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-text-muted block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-bg-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-brand-blue transition font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="md"
            className="w-full mt-2 font-bold"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-brand-blue hover:underline font-mono font-medium"
          >
            {isRegister
              ? 'Already have an account? Sign in instead'
              : "Don't have an account? Create Account"}
          </button>
        </div>
      </Card>
    </div>
  );
};
