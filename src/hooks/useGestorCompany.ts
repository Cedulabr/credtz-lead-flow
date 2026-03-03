import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GestorCompanyResult {
  companyId: string | null;
  companyName: string | null;
  isGestor: boolean;
  isAdmin: boolean;
  loading: boolean;
  companyUserIds: string[];
}

export function useGestorCompany(): GestorCompanyResult {
  const { user, profile } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [companyUserIds, setCompanyUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (isAdmin) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Check if user is gestor
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id, company_role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (ucData?.company_role === "gestor") {
          setIsGestor(true);
          setCompanyId(ucData.company_id);

          // Get company name
          const { data: companyData } = await supabase
            .from("companies")
            .select("name")
            .eq("id", ucData.company_id)
            .single();
          setCompanyName(companyData?.name || null);

          // Get all user IDs in this company
          const { data: usersData } = await supabase
            .from("user_companies")
            .select("user_id")
            .eq("company_id", ucData.company_id)
            .eq("is_active", true);
          setCompanyUserIds(usersData?.map((u) => u.user_id) || []);
        }
      } catch (e) {
        console.error("Error loading gestor company:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, isAdmin]);

  return { companyId, companyName, isGestor, isAdmin, loading, companyUserIds };
}
