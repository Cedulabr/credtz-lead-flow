import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useLeads() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // For non-admin users, only fetch their own leads
      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAdmin, toast]);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: string, additionalData?: Partial<Lead>) => {
    try {
      const historyEntry = {
        action: 'status_change',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_name: profile?.name || user?.email,
        from_status: leads.find(l => l.id === leadId)?.status,
        to_status: newStatus
      };

      const lead = leads.find(l => l.id === leadId);
      const currentHistory = lead?.history ? 
        (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history) : [];

      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          history: JSON.stringify([...currentHistory, historyEntry]),
          ...additionalData
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Lead atualizado com sucesso`,
      });

      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar lead",
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id, profile?.name, leads, toast, fetchLeads]);

  const canEditLead = useCallback((lead: Lead) => {
    if (isAdmin) return true;
    return lead.assigned_to === user?.id || lead.created_by === user?.id;
  }, [isAdmin, user?.id]);

  return {
    leads,
    isLoading,
    fetchLeads,
    updateLeadStatus,
    canEditLead,
    setLeads
  };
}
