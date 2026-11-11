import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  Bot,
  Compass,
  FileCheck2,
  AlertOctagon,
  CreditCard,
  Sun,
  Moon,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { Badge } from './ui/Badge.js';

interface NavbarProps {
  cartItemCount?: number;
  killSwitchActive?: boolean;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItemCount: propCartCount,
  killSwitchActive = false,
  isAdmin: propIsAdmin,
  onToggleAdmin
}) => {
  const location = useLocation();
  const { user, isAdmin: authIsAdmin } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { theme, toggleTheme } = useTheme();

  const effectiveCartCount = propCartCount !== undefined ? propCartCount : cartCount;
  const effectiveIsAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;

  const isActive = (path: string) => location.pathname === path;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'JD';

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md text-text border-b border-border shadow-soft-sm transition-colors">
      {/* Top Engine & Security Bar */}
      <div className="bg-bg-subtle px-4 py-1.5 border-b border-border text-[11px] text-text-muted flex items-center justify-between font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-text font-bold">PAYPAL AEGIS ENGINE:</span>
          <span className="hidden sm:inline">Deterministic Tool Gateway • HMAC-SHA256 Mandates • Red Team Shield</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-text-muted text-[10px]">PAYPAL SANDBOX:</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue font-bold text-[10px] border border-brand-blue/20">
              Orders v2 REST Ready
            </span>
          </div>

          {killSwitchActive && (
            <div className="flex items-center text-status-danger font-bold text-[10px] animate-pulse">
              <AlertOctagon className="w-3 h-3 mr-1" />
              EMERGENCY KILL SWITCH ENGAGED
            </div>
          )}

          {onToggleAdmin && (
            <button
              onClick={onToggleAdmin}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                effectiveIsAdmin
                  ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-border font-bold'
                  : 'bg-surface text-text-muted hover:text-text border border-border'
              }`}
            >
              {effectiveIsAdmin ? 'ADMIN DEMO MODE' : 'SWITCH TO ADMIN'}
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-violet p-0.5 shadow-soft group-hover:scale-105 transition-transform flex-shrink-0">
              <div className="w-full h-full bg-brand-navy rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-brand-blue" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-text font-sans">
                  SHOPMATE<span className="text-brand-blue font-black">.AI</span>
                </span>
                <span className="bg-brand-violet/10 text-brand-violet text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border border-brand-violet/25">
                  AEGIS POWERED
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-medium hidden sm:block">
                Discover Smarter. Shop Better. Stay in Control.
              </p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 text-xs font-semibold">
            <Link
              to="/workspace"
              className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                isActive('/workspace')
                  ? 'bg-brand-blue text-white shadow-soft'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Workspace</span>
            </Link>

            <Link
              to="/missions"
              className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                isActive('/missions')
                  ? 'bg-brand-blue text-white shadow-soft'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Missions</span>
            </Link>

            <Link
              to="/passport"
              className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                isActive('/passport')
                  ? 'bg-brand-violet text-white shadow-soft'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Purchase Passport</span>
            </Link>

            <Link
              to="/security"
              className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                isActive('/security')
                  ? 'bg-status-success text-white shadow-soft'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>AEGIS Security</span>
            </Link>

            <Link
              to="/orders"
              className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 ${
                isActive('/orders')
                  ? 'bg-brand-blue text-white shadow-soft'
                  : 'text-text-muted hover:text-text hover:bg-bg-subtle'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Orders & Tracker</span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-bg-subtle border border-border transition"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-brand-violet" />
              ) : (
                <Sun className="w-4 h-4 text-status-warning" />
              )}
            </button>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative p-2 rounded-xl text-text-muted hover:text-text bg-surface hover:bg-bg-subtle border border-border transition"
              title="View Cart"
              aria-label={`Shopping cart with ${effectiveCartCount} items`}
            >
              <ShoppingBag className="w-4 h-4 text-text" />
              {effectiveCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-blue text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-soft">
                  {effectiveCartCount}
                </span>
              )}
            </Link>

            {/* User Profile or Sign In */}
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-surface hover:bg-bg-subtle border border-border text-xs font-semibold text-text transition"
                aria-label="User Dashboard"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-violet flex items-center justify-center font-bold text-white text-[10px] shadow-soft">
                  {initials}
                </div>
                <span className="hidden sm:inline font-medium">{user.name}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-600 text-white text-xs font-semibold transition shadow-soft"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
