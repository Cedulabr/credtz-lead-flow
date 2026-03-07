import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RadarCredits } from '../types';

export function useRadarCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<RadarCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from('radar_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial credits
        const { data: newData, error: insertError } = await supabase
          .from('radar_credits')
          .insert({ user_id: user.id, current_month: currentMonth })
          .select()
          .single();
        if (insertError) throw insertError;
        setCredits(newData as any);
      } else {
        // Reset monthly if needed
        if (data.current_month !== currentMonth) {
          const { data: updated, error: updateError } = await supabase
            .from('radar_credits')
            .update({
              credits_used_month: 0,
              current_month: currentMonth,
              credits_balance: data.monthly_limit,
            })
            .eq('id', data.id)
            .select()
            .single();
          if (updateError) throw updateError;
          setCredits(updated as any);
        } else {
          setCredits(data as any);
        }
      }
    } catch (err: any) {
      console.error('Credits error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const consumeCredit = useCallback(async (amount: number = 1, filterUsed?: any, resultsCount?: number) => {
    if (!user?.id || !credits) return false;
    if (credits.credits_balance < amount) {
      toast.error('Créditos insuficientes! Solicite recarga ao administrador.');
      return false;
    }

    try {
      await supabase
        .from('radar_credits')
        .update({
          credits_balance: credits.credits_balance - amount,
          credits_used_month: credits.credits_used_month + amount,
        })
        .eq('user_id', user.id);

      await supabase
        .from('radar_credits_usage')
        .insert({
          user_id: user.id,
          action: 'search',
          credits_used: amount,
          filter_used: filterUsed || {},
          results_count: resultsCount || 0,
        });

      setCredits(prev => prev ? {
        ...prev,
        credits_balance: prev.credits_balance - amount,
        credits_used_month: prev.credits_used_month + amount,
      } : null);

      return true;
    } catch (err: any) {
      console.error('Consume credit error:', err);
      return false;
    }
  }, [user?.id, credits]);

  const requestRecharge = useCallback(async (quantity: number) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('radar_credits_requests')
        .insert({ user_id: user.id, quantity });
      if (error) throw error;
      toast.success('Solicitação de recarga enviada ao administrador!');
    } catch (err: any) {
      toast.error('Erro ao solicitar recarga');
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, loading, consumeCredit, requestRecharge, fetchCredits };
}
