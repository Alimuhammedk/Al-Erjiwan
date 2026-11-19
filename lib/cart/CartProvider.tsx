"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addItem, cartCount, cartTotal, parseCart, removeItem, setQuantity, type CartItem } from "./cart";

const STORAGE_KEY = "al-erjiwan-cart";

type CartApi = {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Read after mount so server and browser first render the same thing.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage can only be read after mount
      setItems(parseCart(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // storage blocked: start with an empty cart
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage blocked or full: the cart still works until the page closes
    }
  }, [items, loaded]);

  const add = useCallback((item: Omit<CartItem, "key">) => setItems((c) => addItem(c, item)), []);
  const setQty = useCallback((key: string, q: number) => setItems((c) => setQuantity(c, key, q)), []);
  const remove = useCallback((key: string) => setItems((c) => removeItem(c, key)), []);

  const value = useMemo(
    () => ({ items, add, setQty, remove, count: cartCount(items), total: cartTotal(items) }),
    [items, add, setQty, remove],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
