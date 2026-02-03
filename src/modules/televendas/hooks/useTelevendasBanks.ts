import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TelevendasBank {
  id: string;
  name: string;
  code: string | null;
}

export function useTelevendasBanks() {
  const [banks, setBanks] = useState<TelevendasBank[]>([]);
  const [bankNames, setBankNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase
          .from("televendas_banks")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        
        const banksList = data || [];
        setBanks(banksList);
        setBankNames(banksList.map(b => b.name));
      } catch (error) {
        console.error("Error fetching televendas banks:", error);
        setBanks([]);
        setBankNames([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanks();
  }, []);

  return { banks, bankNames, isLoading };
}
