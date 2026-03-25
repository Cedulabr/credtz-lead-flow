import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useVoicerCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadBalance();
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.rpc('get_user_credits', {
        target_user_id: user.id,
      });
      setBalance(data ?? 0);
    } catch (err) {
      console.error('Error loading credits:', err);
    } finally {
      setLoading(false);
    }
  };

  return { balance, loading, reload: loadBalance };
}
