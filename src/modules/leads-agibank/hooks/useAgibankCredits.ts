import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAgibankCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("agibank_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCredits = useCallback(async (userId: string, amount: number) => {
    const { data, error } = await supabase.rpc("agibank_add_credits", {
      _user_id: userId,
      _amount: amount,
    });
    if (error) {
      toast.error("Erro ao adicionar créditos", { description: error.message });
      return false;
    }
    const r = data as { success: boolean; balance?: number; error?: string };
    if (!r.success) {
      toast.error(r.error || "Erro");
      return false;
    }
    toast.success(`Créditos atualizados. Saldo: ${r.balance}`);
    fetch();
    return true;
  }, [fetch]);

  return { balance, refresh: fetch, addCredits };
}
