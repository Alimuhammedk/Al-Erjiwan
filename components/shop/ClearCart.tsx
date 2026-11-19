"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartProvider";

// Shown on the confirmation page: the order is placed, so the cart is emptied.
export function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
