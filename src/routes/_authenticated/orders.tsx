import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "طلباتي | Switch" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const q = useQuery({ queryKey: ["me", "orders"], queryFn: () => getMyOrders() });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-black text-white">طلباتي</h1>
      <div className="mt-5 rounded-3xl glass-strong p-5">
        {(q.data ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-cyan-100/60">لا توجد طلبات. <Link to="/catalog" className="text-cyan-300 hover:underline">ابدأ التسوّق</Link></p>
        ) : (
          <ul className="divide-y divide-white/5">
            {q.data!.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-bold text-white">{o.order_number}</div>
                  <div className="text-[11px] text-cyan-100/60">{new Date(o.created_at).toLocaleString("ar-SA")}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-white">{o.total} ر.س</div>
                  <div className="text-[11px] text-cyan-100/70">{o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
