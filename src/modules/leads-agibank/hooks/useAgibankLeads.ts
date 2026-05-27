import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AgibankLead, AgibankLeadStatus } from "../types";

export function useAgibankLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<AgibankLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentsById, setAgentsById] = useState<Record<string, { name: string | null; email: string | null }>>({});

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("agibank_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const list = (data || []) as AgibankLead[];
      setLeads(list);

      // Fetch agent profiles (two-step pattern)
      const ids = Array.from(new Set(list.map(l => l.agent_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", ids);
        const map: Record<string, { name: string | null; email: string | null }> = {};
        (profs || []).forEach((p: any) => {
          map[p.id] = { name: p.name, email: p.email };
        });
        setAgentsById(map);
      }
    } catch (e: any) {
      toast.error("Erro ao carregar leads", { description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLeadStatus = useCallback(
    async (leadId: string, status: AgibankLeadStatus, extra?: Partial<AgibankLead>) => {
      try {
        const payload: any = { status, ...(extra || {}) };
        if (status !== "agendado") payload.scheduled_at = null;
        const { error } = await supabase
          .from("agibank_leads")
          .update(payload)
          .eq("id", leadId);
        if (error) throw error;
        setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, ...payload } : l)));
        toast.success("Status atualizado");
        if (status === "sem_interesse") {
          toast.info("Telefone adicionado à blacklist");
        }
        return true;
      } catch (e: any) {
        toast.error("Erro ao atualizar", { description: e.message });
        return false;
      }
    },
    []
  );

  const updateNotes = useCallback(async (leadId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from("agibank_leads")
        .update({ notes })
        .eq("id", leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, notes } : l)));
      return true;
    } catch (e: any) {
      toast.error("Erro ao salvar nota", { description: e.message });
      return false;
    }
  }, []);

  const reassignAgent = useCallback(async (leadId: string, agentId: string | null) => {
    try {
      const { error } = await supabase
        .from("agibank_leads")
        .update({ agent_id: agentId })
        .eq("id", leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, agent_id: agentId } : l)));
      toast.success("Agente reatribuído");
      return true;
    } catch (e: any) {
      toast.error("Erro ao reatribuir", { description: e.message });
      return false;
    }
  }, []);

  const updateLead = useCallback(async (leadId: string, patch: Partial<AgibankLead>) => {
    try {
      const { error } = await supabase
        .from("agibank_leads")
        .update(patch as any)
        .eq("id", leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, ...patch } : l)));
      toast.success("Lead atualizado");
      return true;
    } catch (e: any) {
      toast.error("Erro ao atualizar lead", { description: e.message });
      return false;
    }
  }, []);

  const consumeCredit = useCallback(async (leadId: string) => {
    const { data, error } = await supabase.rpc("agibank_consume_credit", { _lead_id: leadId });
    if (error) {
      return { success: false, error: error.message };
    }
    const result = data as { success: boolean; error?: string; balance?: number; free?: boolean };
    if (result.success && !result.free) {
      toast.success(`1 crédito consumido. Saldo: ${result.balance}`);
      // refresh that lead
      const { data: refreshed } = await supabase
        .from("agibank_leads")
        .select("*")
        .eq("id", leadId)
        .maybeSingle();
      if (refreshed) {
        setLeads(prev => prev.map(l => (l.id === leadId ? (refreshed as AgibankLead) : l)));
      }
    }
    return result;
  }, []);

  return { leads, isLoading, agentsById, fetchLeads, updateLeadStatus, updateNotes, reassignAgent, consumeCredit };
}
