import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.js';
import { ICart } from '../../../shared/types.js';

interface CartContextType {
  cart: ICart | null;
  spendingGuard: any;
  secondOpinion: any;
  policySummary: any;
  itemCount: number;
  loading: boolean;
  addToCart: (
    productId: string,
    quantity?: number
  ) => Promise<{ success: boolean; error?: string; violations?: string[]; suggestedFixes?: string[] }>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  error: string | null;
  lastBlock: { message: string; violations: string[]; suggestedFixes: string[] } | null;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<ICart | null>(null);
  const [spendingGuard, setSpendingGuard] = useState<any>(null);
  const [secondOpinion, setSecondOpinion] = useState<any>(null);
  const [policySummary, setPolicySummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<{
    message: string;
    violations: string[];
    suggestedFixes: string[];
  } | null>(null);

  useEffect(() => {
    if (user) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [user]);

  const refreshCart = async () => {
    try {
      setLoading(true);
      const data = await api.getCart();
      setCart(data.cart);
      setSpendingGuard(data.spendingGuard);
      setSecondOpinion(data.secondOpinion);
      setPolicySummary(data.policySummary);
    } catch (err: any) {
      console.warn('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (
    productId: string,
    quantity = 1
  ): Promise<{ success: boolean; error?: string; violations?: string[]; suggestedFixes?: string[] }> => {
    try {
      setError(null);
      setLastBlock(null);
      const data = await api.addToCart(productId, quantity);
      setCart(data.cart);
      await refreshCart();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Failed to add item to cart';
      const violations = err.violations || [msg];
      const suggestedFixes = err.suggestedFixes || [];

      setError(msg);
      setLastBlock({
        message: msg,
        violations,
        suggestedFixes
      });

      return {
        success: false,
        error: msg,
        violations,
        suggestedFixes
      };
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      setError(null);
      const data = await api.updateCartQuantity(productId, quantity);
      setCart(data.cart);
      await refreshCart();
    } catch (err: any) {
      setError(err.message || 'Failed to update quantity');
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      setError(null);
      const data = await api.removeFromCart(productId);
      setCart(data.cart);
      await refreshCart();
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      setError(null);
      const data = await api.clearCart();
      setCart(data.cart);
      await refreshCart();
    } catch (err: any) {
      setError(err.message || 'Failed to clear cart');
    }
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        spendingGuard,
        secondOpinion,
        policySummary,
        itemCount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        error,
        lastBlock,
        clearError: () => {
          setError(null);
          setLastBlock(null);
        }
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

