import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ModuleRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  billing_type: "subscription" | "credits" | "hybrid";
  monthly_price_cents: number;
  credit_price_cents: number;
  active: boolean;
  sort_order: number;
}

export interface CompanyModule {
  module_slug: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "inactive";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  grace_period_until: string | null;
  stripe_subscription_id: string | null;
}

export interface WalletRow {
  id: string;
  module_slug: string;
  balance: number;
  total_purchased: number;
  total_consumed: number;
}

export interface CreditPackage {
  id: string;
  module_slug: string;
  name: string;
  credits: number;
  price_cents: number;
  sort_order: number;
}

export function useMarketplace() {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [companyModules, setCompanyModules] = useState<CompanyModule[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [m, cm, w, p] = await Promise.all([
      supabase.from("modules").select("*").eq("active", true).order("sort_order"),
      supabase.from("company_modules").select("module_slug, status, current_period_end, cancel_at_period_end, grace_period_until, stripe_subscription_id"),
      supabase.from("wallets").select("id, module_slug, balance, total_purchased, total_consumed"),
      supabase.from("credit_packages").select("*").eq("active", true).order("sort_order"),
    ]);
    setModules((m.data as any) ?? []);
    setCompanyModules((cm.data as any) ?? []);
    setWallets((w.data as any) ?? []);
    setPackages((p.data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { modules, companyModules, wallets, packages, loading, refresh };
}

export function useModuleAccess(slug: string) {
  const { profile } = useAuth();
  const { companyModules, loading } = useMarketplace();
  const cm = companyModules.find((c) => c.module_slug === slug);
  const isAdmin = profile?.role === "admin";
  const inGrace = cm?.grace_period_until && new Date(cm.grace_period_until) > new Date();
  const hasAccess = isAdmin || cm?.status === "active" || cm?.status === "trialing" || !!inGrace;
  return { hasAccess, status: cm?.status ?? "inactive", loading };
}
