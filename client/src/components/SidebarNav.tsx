import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Compass,
  ShoppingBag,
  FileCheck2,
  CreditCard,
  ShieldCheck,
  Settings,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useTheme } from '../context/ThemeContext.js';

export const SidebarNav: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/workspace', label: 'AI Workspace', icon: Bot },
    { to: '/missions', label: 'Missions', icon: Compass },
    { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: itemCount > 0 ? itemCount : null },
    { to: '/passport', label: 'Passports', icon: FileCheck2 },
    { to: '/orders', label: 'Orders & Payments', icon: CreditCard },
    { to: '/security', label: 'AEGIS Security', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Console', icon: ShieldAlert }] : [])
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'JD';

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border text-text">
        <NavLink to="/dashboard" className="flex items-center space-x-2 font-extrabold text-base tracking-tight">
          <span>SHOPMATE<span className="text-brand-blue font-black">.AI</span></span>
        </NavLink>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-bg-subtle transition"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-violet" /> : <Sun className="w-4 h-4 text-status-warning" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-bg-subtle text-text hover:bg-border transition"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex">
          <div className="w-64 bg-surface border-r border-border p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
                <span className="font-extrabold text-base text-text">
                  SHOPMATE<span className="text-brand-blue font-black">.AI</span>
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-text-muted hover:text-text p-1"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-brand-blue text-white shadow-soft'
                            : 'text-text-muted hover:text-text hover:bg-bg-subtle'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-violet text-white text-[10px] font-mono font-bold tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-text-muted hover:text-text hover:bg-bg-subtle transition"
              >
                <span>Theme ({theme})</span>
                {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-violet" /> : <Sun className="w-4 h-4 text-status-warning" />}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-status-danger hover:bg-status-danger/10 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-border bg-surface p-4 flex-shrink-0 min-h-[calc(100vh-4.25rem)]">
        <div>
          {/* User profile card */}
          {user && (
            <div className="bg-bg-subtle border border-border rounded-xl p-3 mb-5 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-violet flex items-center justify-center font-bold text-white text-xs shadow-soft flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs text-text block truncate">{user.name}</span>
                <span className="text-[10px] text-text-muted font-mono block truncate">{user.email}</span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-soft'
                        : 'text-text-muted hover:text-text hover:bg-bg-subtle'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-violet text-white text-[10px] font-mono font-bold tabular-nums shadow-soft-sm">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer actions: Theme & Logout */}
        <div className="pt-4 border-t border-border space-y-1 text-xs">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-bg-subtle transition font-medium"
          >
            <span>Theme ({theme})</span>
            {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-violet" /> : <Sun className="w-4 h-4 text-status-warning" />}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-status-danger hover:bg-status-danger/10 transition font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          <div className="pt-2 px-3 text-[10px] font-mono text-text-subtle text-center">
            AEGIS ENGINE • COMMERCIAL FINTECH
          </div>
        </div>
      </aside>
    </>
  );
};
