import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CommissionRule {
  id: string;
  bank_name: string;
  product_name: string;
  calculation_model: string; // 'valor_bruto' | 'saldo_devedor'
  commission_type: string;
  commission_value: number;
  user_level: string;
}

/**
 * Returns a map: bankName -> calculation_model ('valor_bruto' | 'saldo_devedor')
 * Used to determine whether portabilidade commissions are calculated on
 * the gross value (parcela) or the outstanding balance (saldo_devedor).
 */
export function useCommissionRules() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("commission_rules")
          .select("id, bank_name, product_name, calculation_model, commission_type, commission_value, user_level")
          .eq("is_active", true)
          .eq("product_name", "Portabilidade");

        if (error) throw error;
        setRules(data || []);
      } catch (e) {
        console.error("Error fetching commission rules:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // Map bank_name -> calculation_model (use first matching rule)
  const bankCalculationModel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const rule of rules) {
      if (!map[rule.bank_name]) {
        map[rule.bank_name] = rule.calculation_model;
      }
    }
    return map;
  }, [rules]);

  // Map bank_name -> average commission_value for portabilidade
  const bankCommissionRate = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const rule of rules) {
      if (!map[rule.bank_name]) map[rule.bank_name] = [];
      map[rule.bank_name].push(rule.commission_value);
    }
    const avg: Record<string, number> = {};
    for (const [bank, values] of Object.entries(map)) {
      avg[bank] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    return avg;
  }, [rules]);

  return { rules, bankCalculationModel, bankCommissionRate, isLoading };
}
