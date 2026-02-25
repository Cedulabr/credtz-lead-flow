import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "./useUserCompany";
import { SmsTemplate, SmsContactList, SmsCampaign, SmsHistoryRecord } from "../types";

export function useSmsData() {
  const { user } = useAuth();
  const { companyId, isAdmin, loading: companyLoading } = useUserCompany();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [contactLists, setContactLists] = useState<SmsContactList[]>([]);
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [history, setHistory] = useState<SmsHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setTemplates((data as any[]) || []);
  }, []);

  const fetchContactLists = useCallback(async () => {
    const { data } = await supabase
      .from("sms_contact_lists")
      .select("*")
      .order("created_at", { ascending: false });
    setContactLists((data as any[]) || []);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from("sms_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((data as any[]) || []);
  }, []);

  const fetchHistory = useCallback(async () => {
    let query = supabase
      .from("sms_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    // Filter by company for non-admins
    if (!isAdmin && companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query;
    setHistory((data as any[]) || []);
  }, [isAdmin, companyId]);

  const fetchAll = useCallback(async () => {
    if (companyLoading) return;
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchContactLists(), fetchCampaigns(), fetchHistory()]);
    setLoading(false);
  }, [fetchTemplates, fetchContactLists, fetchCampaigns, fetchHistory, companyLoading]);

  useEffect(() => {
    if (user?.id && !companyLoading) fetchAll();
  }, [user?.id, fetchAll, companyLoading]);

  return {
    templates,
    contactLists,
    campaigns,
    history,
    loading,
    refresh: fetchAll,
    refreshTemplates: fetchTemplates,
    refreshContactLists: fetchContactLists,
    refreshCampaigns: fetchCampaigns,
    refreshHistory: fetchHistory,
  };
}
