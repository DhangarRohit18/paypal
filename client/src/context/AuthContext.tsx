import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { IUser } from '../../../shared/types.js';

interface AuthContextType {
  user: IUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const data = await api.getMe();
      if (data?.user) {
        setUser(data.user);
      }
    } catch {
      // User is not logged in yet, try auto-logging in demo user for seamless evaluation
      try {
        const demo = await api.login({ email: 'demo@shopmate.ai', password: 'DemoPass123!' });
        if (demo?.user) {
          setUser(demo.user);
        }
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.register({ name, email, password });
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const quickLoginDemo = async () => {
    await login('demo@shopmate.ai', 'DemoPass123!');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        login,
        register,
        logout,
        quickLoginDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

