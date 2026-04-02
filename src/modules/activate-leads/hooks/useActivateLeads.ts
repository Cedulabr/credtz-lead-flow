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
    try {
      setIsLoading(true);
      let query = supabase
        .from("activate_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads((data as ActivateLead[]) || []);
    } catch (err: any) {
      console.error("Error fetching activate leads:", err);
      toast.error("Erro ao carregar leads");
    } finally {
      setIsLoading(false);
    }
  }, [profile?.company_id]);

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase.from("profiles").select("id, name, email");
      if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }
      const { data } = await query;
      setUsers((data as ActivateUser[]) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [fetchLeads, fetchUsers]);

  const stats: ActivateLeadStats = useMemo(() => {
    const s: ActivateLeadStats = {
      total: leads.length,
      novos: 0,
      emAndamento: 0,
      segundaTentativa: 0,
      fechados: 0,
      semPossibilidade: 0,
      alertas: 0,
    };
    const now = new Date();
    leads.forEach((l) => {
      switch (l.status) {
        case "novo": s.novos++; break;
        case "em_andamento": s.emAndamento++; break;
        case "segunda_tentativa": s.segundaTentativa++; break;
        case "fechado": s.fechados++; break;
        case "sem_possibilidade": s.semPossibilidade++; break;
      }
      // Alert if novo and older than 24h
      const created = new Date(l.created_at);
      const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      if (l.status === "novo" && hoursOld > 24) {
        s.alertas++;
      }
    });
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

  return { leads, stats, users, isLoading, updateStatus, refetch: fetchLeads };
}
