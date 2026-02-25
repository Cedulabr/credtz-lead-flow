import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserCompany() {
  const { user, profile } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    if (isAdmin) { setCompanyId(null); setLoading(false); return; }

    (async () => {
      const { data } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();
      setCompanyId(data?.company_id || null);
      setLoading(false);
    })();
  }, [user?.id, isAdmin]);

  return { companyId, isAdmin, loading };
}
