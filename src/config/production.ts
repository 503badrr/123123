const rawSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || "https://swwiitch.com";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");

const PRODUCTION_SUPABASE_URL = "https://slnjgmwckknzwjcmlolj.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_AgmfiyYzkVovCshLTSBEqA_SQ1e6jM3";

export const productionConfig = {
  siteUrl,
  siteHost: siteUrl.replace(/^https?:\/\//, ""),
  apiUrl: import.meta.env.VITE_PUBLIC_API_URL || `${siteUrl}/api`,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@swwiitch.com",
  // Production must never silently connect to a preview or legacy project.
  // The publishable key is designed for public clients; RLS remains the data boundary.
  supabaseUrl: import.meta.env.PROD
    ? PRODUCTION_SUPABASE_URL
    : import.meta.env.VITE_SUPABASE_URL || PRODUCTION_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.PROD
    ? PRODUCTION_SUPABASE_PUBLISHABLE_KEY
    : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
} as const;

export function absoluteUrl(path = "/"): string {
  return `${productionConfig.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
