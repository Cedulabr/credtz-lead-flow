import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TelevendasBank } from "../types";

export function useBanks() {
  const [banks, setBanks] = useState<TelevendasBank[]>([]);
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
        setBanks(data || []);
      } catch (error) {
        console.error("Error fetching banks:", error);
        // Fallback to common banks
        setBanks([
          { id: "1", name: "BMG" },
          { id: "2", name: "BRADESCO" },
          { id: "3", name: "C6" },
          { id: "4", name: "DAYCOVAL" },
          { id: "5", name: "FACTA" },
          { id: "6", name: "ITAÚ" },
          { id: "7", name: "MASTER" },
          { id: "8", name: "MERCANTIL" },
          { id: "9", name: "OLÉ" },
          { id: "10", name: "PAN" },
          { id: "11", name: "PARANÁ" },
          { id: "12", name: "SAFRA" },
          { id: "13", name: "SANTANDER" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanks();
  }, []);

  return { banks, isLoading };
}
