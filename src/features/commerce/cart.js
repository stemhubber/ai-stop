import { useEffect, useMemo, useState } from "react";

export function checkoutEligible(offer) {
  return Boolean(
    offer &&
    offer.pricingMode === "fixed" &&
    Number(offer.price) > 0 &&
    !offer.fulfilmentMethods?.includes("booking") &&
    !offer.fulfilmentMethods?.includes("quote")
  );
}

export function commonFulfilment(items) {
  if (!items.length) return [];
  return items.reduce((methods, item, index) => {
    const available = (item.fulfilmentMethods || []).filter((method) =>
      ["pickup", "delivery", "digital"].includes(method)
    );
    return index === 0
      ? available
      : methods.filter((method) => available.includes(method));
  }, []);
}

function storedCart(slug) {
  try {
    const value = JSON.parse(window.localStorage.getItem(`webilo.cart.${slug}`) || "[]");
    return Array.isArray(value) ? value.filter(checkoutEligible).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function cartItem(offer) {
  return {
    key: offer.key,
    sourceResource: offer.sourceResource,
    sourceId: offer.sourceId,
    name: offer.name,
    price: Number(offer.price || 0),
    currency: offer.currency || "ZAR",
    fulfilmentMethods: offer.fulfilmentMethods || [],
    quantity: 1,
  };
}

export function useCommerceCart(slug) {
  const [items, setItems] = useState(() => storedCart(slug));
  useEffect(() => {
    setItems(storedCart(slug));
  }, [slug]);
  useEffect(() => {
    try {
      window.localStorage.setItem(`webilo.cart.${slug}`, JSON.stringify(items));
    } catch {
      // Checkout still works when storage is blocked.
    }
  }, [items, slug]);

  const api = useMemo(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    fulfilmentMethods: commonFulfilment(items),
    add(offer) {
      if (!checkoutEligible(offer)) return false;
      setItems((current) => {
        const existing = current.find((item) => item.key === offer.key);
        if (existing) {
          return current.map((item) => item.key === offer.key
            ? { ...item, quantity: Math.min(99, item.quantity + 1) }
            : item);
        }
        return [...current, cartItem(offer)].slice(0, 20);
      });
      return true;
    },
    remove(key) {
      setItems((current) => current.filter((item) => item.key !== key));
    },
    setQuantity(key, value) {
      const quantity = Math.max(1, Math.min(99, Number(value || 1)));
      setItems((current) => current.map((item) => item.key === key ? { ...item, quantity } : item));
    },
    clear() {
      setItems([]);
    },
  }), [items]);
  return api;
}
