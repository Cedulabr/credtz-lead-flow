import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageStats {
  total: number;
  cache: number;
  credits: number;
}

export function useTelefoniaUsage(refreshKey = 0) {
  const [stats, setStats] = useState<UsageStats>({ total: 0, cache: 0, credits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const { data } = await supabase
          .from("telefonia_consultas")
          .select("from_cache, credits_used")
          .gte("queried_at", start.toISOString())
          .limit(5000);
        const list = (data || []) as Array<{ from_cache: boolean | null; credits_used: number | null }>;
        const total = list.length;
        const cache = list.filter((r) => r.from_cache).length;
        const credits = list.reduce((acc, r) => acc + (r.credits_used || 0), 0);
        setStats({ total, cache, credits });
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  return { stats, loading };
}
