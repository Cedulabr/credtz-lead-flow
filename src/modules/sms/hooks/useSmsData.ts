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
  const [companyUserIds, setCompanyUserIds] = useState<string[]>([]);

  // Fetch company user IDs for filtering
  useEffect(() => {
    if (isAdmin || !companyId || companyLoading) {
      setCompanyUserIds([]);
      return;
    }

    const fetchCompanyUsers = async () => {
      const { data } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("is_active", true);
      setCompanyUserIds((data || []).map(u => u.user_id));
    };

    fetchCompanyUsers();
  }, [companyId, isAdmin, companyLoading]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setTemplates((data as any[]) || []);
  }, []);

  const fetchContactLists = useCallback(async () => {
    let query = supabase
      .from("sms_contact_lists")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by company users for non-admins
    if (!isAdmin && companyUserIds.length > 0) {
      query = query.in("created_by", companyUserIds);
    }

    const { data } = await query;
    setContactLists((data as any[]) || []);
  }, [isAdmin, companyUserIds]);

  const fetchCampaigns = useCallback(async () => {
    let query = supabase
      .from("sms_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by company users for non-admins
    if (!isAdmin && companyUserIds.length > 0) {
      query = query.in("created_by", companyUserIds);
    }

    const { data } = await query;
    setCampaigns((data as any[]) || []);
  }, [isAdmin, companyUserIds]);

  const fetchHistory = useCallback(async () => {
    let query = supabase
      .from("sms_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    // Filter by company for non-admins
    if (!isAdmin && companyUserIds.length > 0) {
      // Use company_id if available, otherwise fall back to sent_by user IDs
      if (companyId) {
        query = query.eq("company_id", companyId);
      } else {
        query = query.in("sent_by", companyUserIds);
      }
    }

    const { data } = await query;
    setHistory((data as any[]) || []);
  }, [isAdmin, companyId, companyUserIds]);

  const fetchAll = useCallback(async () => {
    if (companyLoading) return;
    // Wait for companyUserIds to be loaded for non-admins
    if (!isAdmin && companyId && companyUserIds.length === 0) return;
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchContactLists(), fetchCampaigns(), fetchHistory()]);
    setLoading(false);
  }, [fetchTemplates, fetchContactLists, fetchCampaigns, fetchHistory, companyLoading, isAdmin, companyId, companyUserIds]);

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
