import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "../components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error || !user) {
      throw redirect({ to: "/auth", search: { redirect: "/admin" } });
    }

    // Use the database role function as the source of truth instead of a stale generated type.
    // The live Supabase schema exposes public.is_admin(), which checks owner/admin/staff roles.
    const { data: isAdmin, error: roleError } = await (supabase as any).rpc("is_admin");

    if (roleError || !isAdmin) {
      throw redirect({ to: "/" });
    }

    return { user, isAdmin: true };
  },
  component: AdminLayout,
});
