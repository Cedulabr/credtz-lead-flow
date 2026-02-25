import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SmsTemplate, SmsContactList, SmsCampaign, SmsHistoryRecord } from "../types";

export function useSmsData() {
  const { user } = useAuth();
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
    const { data } = await supabase
      .from("sms_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setHistory((data as any[]) || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchContactLists(), fetchCampaigns(), fetchHistory()]);
    setLoading(false);
  }, [fetchTemplates, fetchContactLists, fetchCampaigns, fetchHistory]);

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user?.id, fetchAll]);

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
