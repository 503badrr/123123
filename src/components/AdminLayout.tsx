import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Briefcase,
  KeyRound,
  Lock,
  Plug,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const items = [
  { to: "/admin/owner", label: "لوحة المالك", icon: ShieldCheck },
  { to: "/admin/staff", label: "لوحة الموظف", icon: Briefcase },
  { to: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { to: "/admin/finance", label: "المالية", icon: Wallet },
  { to: "/admin/codes", label: "الأكواد الرقمية", icon: KeyRound },
  { to: "/admin/security", label: "الأمان", icon: Lock },
  { to: "/admin/integrations", label: "الربط والتوريد", icon: Plug },
] as const;

const inactiveClass =
  "text-cyan-50/68 hover:border-cyan-100/10 hover:bg-white/[0.05] hover:text-white";
const activeClass =
  "border-cyan-200/15 bg-cyan-200/[0.1] font-black text-white shadow-inner";

export function AdminLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-7">
        <p className="text-xs font-black tracking-wide text-cyan-300">لوحات الإدارة</p>
        <h1 className="mt-1 text-3xl font-black text-white">Switch Console</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-cyan-100/60">
          إدارة المتجر والطلبات والعمليات من مساحة موحّدة وآمنة.
        </p>
      </header>

      <div className="-mx-4 mb-6 overflow-x-auto px-4 lg:hidden">
        <nav
          className="flex min-w-max gap-2 pb-2"
          aria-label="تنقل الإدارة على الجوال"
        >
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border border-transparent px-3.5 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  active ? activeClass : inactiveClass
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="شريط الإدارة الجانبي">
          <nav
            className="switch-surface sticky top-24 grid gap-1.5 rounded-2xl p-2.5"
            aria-label="تنقل الإدارة"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                    active ? activeClass : inactiveClass
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-cyan-200/[0.12] text-cyan-200" : "bg-white/[0.04] text-cyan-100/55"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
