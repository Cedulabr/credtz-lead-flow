import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAgibankBlacklist() {
  const [entries, setEntries] = useState<Array<{ id: string; phone: string; reason: string | null; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("agibank_blacklist")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      setEntries((data || []) as any);
    } catch (e: any) {
      toast.error("Erro ao carregar blacklist", { description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("agibank_blacklist").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return false;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success("Telefone removido da blacklist");
    return true;
  }, []);

  return { entries, isLoading, fetch, remove };
}
