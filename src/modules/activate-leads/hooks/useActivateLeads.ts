import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ActivateLead, ActivateLeadStats, ActivateUser } from "../types";
import { toast } from "sonner";

export function useActivateLeads() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<ActivateLead[]>([]);
  const [users, setUsers] = useState<ActivateUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!profile?.id) return; // Guard: don't fetch without auth
    try {
      setIsLoading(true);
      const query = supabase
        .from("activate_leads")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      console.log("[useActivateLeads] Fetched", data?.length, "leads");
      setLeads((data as ActivateLead[]) || []);
    } catch (err: any) {
      console.error("Error fetching activate leads:", err);
      toast.error("Erro ao carregar leads");
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase.from("profiles").select("id, name, email");
      setUsers((data as ActivateUser[]) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [fetchLeads, fetchUsers]);

  // Retry after auth completes if no leads loaded
  useEffect(() => {
    if (profile?.id && leads.length === 0 && !isLoading) {
      console.log('[useActivateLeads] Auth ready, retrying fetch...');
      fetchLeads();
    }
  }, [profile?.id]);

  const origens = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.origem) set.add(l.origem); });
    return Array.from(set).sort();
  }, [leads]);

  const stats: ActivateLeadStats = useMemo(() => {
    const s: ActivateLeadStats = {
      total: leads.length,
      novos: 0,
      emAndamento: 0,
      segundaTentativa: 0,
      fechados: 0,
      semPossibilidade: 0,
      alertas: 0,
      conversionRate: 0,
      avgTimeHours: 0,
    };
    const now = new Date();
    let totalHours = 0;
    leads.forEach((l) => {
      switch (l.status) {
        case "novo": s.novos++; break;
        case "em_andamento": s.emAndamento++; break;
        case "segunda_tentativa": s.segundaTentativa++; break;
        case "fechado": s.fechados++; break;
        case "sem_possibilidade": s.semPossibilidade++; break;
      }
      const created = new Date(l.created_at);
      const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      totalHours += hoursOld;
      if (l.status === "novo" && hoursOld >= 48) {
        s.alertas++;
      }
    });
    s.conversionRate = s.total > 0 ? (s.fechados / s.total) * 100 : 0;
    s.avgTimeHours = s.total > 0 ? totalHours / s.total : 0;
    return s;
  }, [leads]);

  const updateStatus = useCallback(async (lead: ActivateLead, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("activate_leads")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (error) throw error;
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: newStatus } : l));
      toast.success(`Status atualizado para ${newStatus}`);
    } catch (err: any) {
      toast.error("Erro ao atualizar status");
    }
  }, []);

  return { leads, stats, users, origens, isLoading, updateStatus, refetch: fetchLeads };
}
