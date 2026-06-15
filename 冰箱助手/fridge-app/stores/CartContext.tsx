import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CartItem {
  name: string;
  category: string;
  reason: string;
  shelf_hint: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'unit' | 'checked'>) => void;
  removeItem: (name: string) => void;
  toggleItem: (name: string) => void;
  updateQuantity: (name: string, quantity: number) => void;
  updateUnit: (name: string, unit: string) => void;
  clearAll: () => void;
  hasItem: (name: string) => boolean;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  toggleItem: () => {},
  updateQuantity: () => {},
  updateUnit: () => {},
  clearAll: () => {},
  hasItem: () => false,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity' | 'unit' | 'checked'>) => {
    setItems((prev) => {
      if (prev.find((i) => i.name === item.name)) return prev;
      return [...prev, { ...item, quantity: 1, unit: '件', checked: false }];
    });
  }, []);

  const removeItem = useCallback((name: string) => {
    setItems((prev) => prev.filter((i) => i.name !== name));
  }, []);

  const toggleItem = useCallback((name: string) => {
    setItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, checked: !i.checked } : i))
    );
  }, []);

  const updateQuantity = useCallback((name: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, quantity: Math.max(0.5, quantity) } : i))
    );
  }, []);

  const updateUnit = useCallback((name: string, unit: string) => {
    setItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, unit } : i))
    );
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const hasItem = useCallback((name: string) => items.some((i) => i.name === name), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, toggleItem, updateQuantity, updateUnit, clearAll, hasItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
