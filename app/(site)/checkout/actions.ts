"use server";

import { redirect } from "next/navigation";
import { ar } from "@/content/ar";
import type { ActionState } from "@/lib/admin/types";
import { createServerClient } from "@/lib/supabase/server";
import { validateCheckout } from "@/lib/shop/checkout";
import { orderErrorMessage, parseOrderItems } from "@/lib/shop/orders";

// Places an order. Only details and ids are sent; the database looks up every price, the delivery fee and the
// stock itself, so nothing in the browser can change what is charged.
export async function placeOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const details = validateCheckout(Object.fromEntries(formData));
  const items = parseOrderItems(String(formData.get("items") ?? ""));
  if (!details.ok || !items.ok) {
    return {
      errors: details.ok ? undefined : details.errors,
      error: items.ok ? undefined : items.errors.items,
    };
  }

  let code: unknown;
  try {
    const db = createServerClient();
    if (!db) return { error: ar.checkout.errors.generic };
    const d = details.value;
    const { data, error } = await db.rpc("place_order", {
      p_name: d.customer_name,
      p_phone: d.phone,
      p_governorate: d.governorate,
      p_city: d.city,
      p_address: d.address,
      p_landmark: d.landmark,
      p_notes: d.notes,
      p_items: items.value,
    });
    if (error) return { error: orderErrorMessage(error.message) };
    code = data;
  } catch {
    return { error: ar.checkout.errors.generic };
  }
  if (typeof code !== "string") return { error: ar.checkout.errors.generic };

  redirect(`/order/${code}`);
}
