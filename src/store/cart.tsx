import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { products, type Product } from "../data/products";

export interface CartItem {
  id: string;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (id: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  detailed: Array<CartItem & { product: Product }>;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "switch_cart_v1";
const MAX_ITEM_QTY = 20;

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "string" &&
    products.some((product) => product.id === item.id) &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    item.qty <= MAX_ITEM_QTY
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const persistenceAvailable = useRef(true);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch {
      persistenceAvailable.current = false;
    }

    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        setItems(Array.isArray(parsed) ? parsed.filter(isValidCartItem) : []);
      } catch {
        // Ignore malformed stored data; a valid cart will replace it after hydration.
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !persistenceAvailable.current) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      persistenceAvailable.current = false;
    }
  }, [hydrated, items]);

  const add = (id: string) =>
    setItems((prev) => {
      const ex = prev.find((item) => item.id === id);
      if (ex) {
        return prev.map((item) =>
          item.id === id
            ? { ...item, qty: Math.min(item.qty + 1, MAX_ITEM_QTY) }
            : item,
        );
      }
      return [...prev, { id, qty: 1 }];
    });
  const remove = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) =>
            item.id === id
              ? { ...item, qty: Math.min(qty, MAX_ITEM_QTY) }
              : item,
          ),
    );
  const clear = () => setItems([]);

  const detailed = items
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.id);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as Array<CartItem & { product: Product }>;

  const total = detailed.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0,
  );
  const count = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Ctx.Provider
      value={{ items, add, remove, setQty, clear, count, total, detailed }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
