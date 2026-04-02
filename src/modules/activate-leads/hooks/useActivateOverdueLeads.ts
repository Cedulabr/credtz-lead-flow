import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OverdueActivateLead {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
  status: string;
  hoursOverdue: number;
}

export function useActivateOverdueLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overdueLeads, setOverdueLeads] = useState<OverdueActivateLead[]>([]);
  const [warningLeads, setWarningLeads] = useState<OverdueActivateLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverdueLeads = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const now = new Date();

      // Fetch leads with status 'novo' assigned to user
      const { data, error } = await supabase
        .from('activate_leads')
        .select('id, nome, telefone, created_at, status')
        .eq('assigned_to', user.id)
        .eq('status', 'novo')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const overdue: OverdueActivateLead[] = [];
      const warnings: OverdueActivateLead[] = [];

      (data || []).forEach((lead: any) => {
        const createdAt = new Date(lead.created_at);
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const deadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
        const hoursOverdue = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60);

        const item: OverdueActivateLead = {
          id: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          created_at: lead.created_at,
          status: lead.status,
          hoursOverdue: Math.max(0, hoursOverdue),
        };

        if (hoursElapsed >= 48) {
          overdue.push(item);
        } else if (hoursElapsed >= 24) {
          warnings.push(item);
        }
      });

      setOverdueLeads(overdue);
      setWarningLeads(warnings);

      // Progressive toasts
      if (warnings.length > 0 && overdue.length === 0) {
        const critical = warnings.filter(l => {
          const elapsed = (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
          return elapsed >= 36;
        });

        if (critical.length > 0) {
          toast({
            title: "⚠️ Alerta Crítico!",
            description: `${critical.length} lead(s) do Activate vencem em menos de 12h. Trate-os agora!`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "⏰ Leads Activate pendentes",
            description: `${warnings.length} lead(s) precisam ser tratados nas próximas 24h.`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching activate overdue leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchOverdueLeads();
    const interval = setInterval(fetchOverdueLeads, 60000);
    return () => clearInterval(interval);
  }, [fetchOverdueLeads]);

  return {
    overdueLeads,
    warningLeads,
    hasOverdue: overdueLeads.length > 0,
    isBlocked: overdueLeads.length > 0,
    isLoading,
    refetch: fetchOverdueLeads,
  };
}
