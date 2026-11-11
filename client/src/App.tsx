import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider, useCart } from './context/CartContext.js';
import { ThemeProvider } from './context/ThemeContext.js';

import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { SidebarNav } from './components/SidebarNav.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

import { LandingPage } from './pages/LandingPage.js';
import { Dashboard } from './pages/Dashboard.js';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { MissionsPage } from './pages/MissionsPage.js';
import { CartPage } from './pages/CartPage.js';
import { PassportPage } from './pages/PassportPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { SecurityCenter } from './pages/SecurityCenter.js';
import { LoginPage } from './pages/LoginPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AdminConsole } from './pages/AdminConsole.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Layout wrapper for authenticated dashboard views with Sidebar
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SidebarNav />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { itemCount, policySummary } = useCart();
  const [adminMode, setAdminMode] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-shopblue/20">
      <Navbar
        cartItemCount={itemCount}
        killSwitchActive={policySummary?.killSwitchActive || false}
        isAdmin={adminMode || isAdmin}
        onToggleAdmin={() => setAdminMode(!adminMode)}
      />

      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />

          {/* Authenticated Dashboard Shell Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <MissionsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CartPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/passport"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PassportPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <AppShell>
                  <OrdersPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SecurityCenter />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SettingsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AppShell>
                  <AdminConsole />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <CartProvider>
              <MainLayout />
            </CartProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
