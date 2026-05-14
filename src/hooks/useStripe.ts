import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export function useStripe() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  const openCheckout = useCallback(async (params: {
    amount: number;
    currency?: string;
    description?: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: params });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Erro ao iniciar pagamento", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const openSubscription = useCallback(async (params: {
    priceId?: string;
    amount?: number;
    currency?: string;
    interval?: "month" | "year";
    tier?: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", { body: params });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Erro ao iniciar assinatura", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
      return data as SubscriptionStatus;
    } catch (err: any) {
      toast.error("Erro ao verificar assinatura", { description: err.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Erro ao abrir portal", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, subscription, openCheckout, openSubscription, checkSubscription, openCustomerPortal };
}
