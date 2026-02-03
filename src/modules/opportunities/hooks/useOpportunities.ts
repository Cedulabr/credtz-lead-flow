import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  OpportunityContract, 
  BankReuseRule, 
  OpportunityStats, 
  OpportunityByBank,
  PortabilityBreakdown,
  OpportunityClient,
  OpportunityFilter,
  PORTABILITY_MIN_PARCELAS
} from '../types';
import { addMonths, differenceInDays, addDays, isBefore, isToday, isFuture } from 'date-fns';

export function useOpportunities() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<OpportunityContract[]>([]);
  const [bankRules, setBankRules] = useState<BankReuseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGestor, setIsGestor] = useState(false);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check user roles
      const { data: gestorData } = await supabase
        .from('user_companies')
        .select('company_id, company_role')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      const companyIds = (gestorData || []).map((uc: any) => uc.company_id);
      setUserCompanyIds(companyIds);
      setIsGestor((gestorData || []).some((uc: any) => uc.company_role === 'gestor'));

      // Fetch bank rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('bank_reuse_settings')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');

      if (rulesError) throw rulesError;
      setBankRules(rulesData || []);

      // Fetch paid contracts (eligible for refinancing/portability)
      let query = supabase
        .from('televendas')
        .select('*')
        .in('status', ['pago', 'pago_aprovado', 'proposta_paga'])
        .order('data_pagamento', { ascending: true });

      // Filter by company for non-admins
      if (!isAdmin && companyIds.length > 0) {
        query = query.in('company_id', companyIds);
      }

      const { data: contractsData, error: contractsError } = await query;

      if (contractsError) throw contractsError;
      setContracts((contractsData as OpportunityContract[]) || []);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name');

      const profileMap: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.id] = p.name || 'Usuário';
      });
      setProfiles(profileMap);

    } catch (error) {
      console.error('Error fetching opportunities data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de oportunidades.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate eligibility for a contract
  const calculateEligibility = useCallback((
    contract: OpportunityContract,
    rules: BankReuseRule[]
  ): { isEligible: boolean; daysUntilEligible: number; eligibilityDate: Date | null } => {
    if (!contract.data_pagamento) {
      return { isEligible: false, daysUntilEligible: -1, eligibilityDate: null };
    }

    const paymentDate = new Date(contract.data_pagamento);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For Portabilidade: fixed 12 months rule
    if (contract.tipo_operacao === 'Portabilidade') {
      const eligibilityDate = addMonths(paymentDate, 12);
      const daysUntil = differenceInDays(eligibilityDate, today);
      return {
        isEligible: daysUntil <= 0,
        daysUntilEligible: Math.max(0, daysUntil),
        eligibilityDate,
      };
    }

    // For Refinanciamento: check bank-specific rule
    const bankRule = rules.find(
      r => r.bank_name.toLowerCase() === contract.banco.toLowerCase()
    );
    
    if (!bankRule) {
      // Default to 6 months if no specific rule
      const eligibilityDate = addMonths(paymentDate, 6);
      const daysUntil = differenceInDays(eligibilityDate, today);
      return {
        isEligible: daysUntil <= 0,
        daysUntilEligible: Math.max(0, daysUntil),
        eligibilityDate,
      };
    }

    const eligibilityDate = addMonths(paymentDate, bankRule.reuse_months);
    const daysUntil = differenceInDays(eligibilityDate, today);
    return {
      isEligible: daysUntil <= 0,
      daysUntilEligible: Math.max(0, daysUntil),
      eligibilityDate,
    };
  }, []);

  // Calculate statistics
  const stats = useMemo((): OpportunityStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in3Days = addDays(today, 3);
    const in5Days = addDays(today, 5);

    let eligibleNow = 0;
    let eligibleToday = 0;
    let eligibleIn3Days = 0;
    let eligibleIn5Days = 0;
    let portabilityEligible = 0;
    let refinancingEligible = 0;

    contracts.forEach(contract => {
      const { isEligible, daysUntilEligible, eligibilityDate } = calculateEligibility(contract, bankRules);

      if (isEligible) {
        eligibleNow++;
        if (contract.tipo_operacao === 'Portabilidade') {
          portabilityEligible++;
        } else {
          refinancingEligible++;
        }
      } else if (eligibilityDate) {
        if (isToday(eligibilityDate)) {
          eligibleToday++;
        }
        if (daysUntilEligible <= 3) {
          eligibleIn3Days++;
        }
        if (daysUntilEligible <= 5) {
          eligibleIn5Days++;
        }
      }
    });

    return {
      totalMonitored: contracts.length,
      eligibleNow,
      eligibleToday,
      eligibleIn3Days,
      eligibleIn5Days,
      portabilityEligible,
      refinancingEligible,
    };
  }, [contracts, bankRules, calculateEligibility]);

  // Opportunities by bank
  const opportunitiesByBank = useMemo((): OpportunityByBank[] => {
    const bankMap = new Map<string, OpportunityByBank>();

    // Initialize from rules
    bankRules.forEach(rule => {
      bankMap.set(rule.bank_name.toLowerCase(), {
        bankName: rule.bank_name,
        ruleMonths: rule.reuse_months,
        totalContracts: 0,
        eligibleNow: 0,
        eligibleSoon: 0,
        potentialValue: 0,
      });
    });

    // Count contracts
    contracts.forEach(contract => {
      const bankKey = contract.banco.toLowerCase();
      const { isEligible, daysUntilEligible } = calculateEligibility(contract, bankRules);

      if (!bankMap.has(bankKey)) {
        bankMap.set(bankKey, {
          bankName: contract.banco,
          ruleMonths: 6, // default
          totalContracts: 0,
          eligibleNow: 0,
          eligibleSoon: 0,
          potentialValue: 0,
        });
      }

      const bankData = bankMap.get(bankKey)!;
      bankData.totalContracts++;
      
      if (isEligible) {
        bankData.eligibleNow++;
      } else if (daysUntilEligible <= 5) {
        bankData.eligibleSoon++;
      }

      if (contract.troco) {
        bankData.potentialValue += contract.troco;
      }
    });

    return Array.from(bankMap.values())
      .filter(b => b.totalContracts > 0)
      .sort((a, b) => b.eligibleNow - a.eligibleNow);
  }, [contracts, bankRules, calculateEligibility]);

  // Portability breakdown (simulating parcelas based on payment date)
  const portabilityBreakdown = useMemo((): PortabilityBreakdown => {
    const portabilityContracts = contracts.filter(c => c.tipo_operacao === 'Portabilidade');
    const today = new Date();
    const in5Days = addDays(today, 5);

    let parcelas9 = 0;
    let parcelas10 = 0;
    let parcelas11 = 0;
    let parcelas12Plus = 0;
    let reachingIn5Days = 0;

    portabilityContracts.forEach(contract => {
      if (!contract.data_pagamento) return;

      const paymentDate = new Date(contract.data_pagamento);
      const monthsSincePayment = differenceInDays(today, paymentDate) / 30;

      // Approximate parcelas paid based on months since payment
      const estimatedParcelas = Math.floor(monthsSincePayment);

      if (estimatedParcelas >= 12) {
        parcelas12Plus++;
      } else if (estimatedParcelas === 11) {
        parcelas11++;
        reachingIn5Days++; // Will reach 12 soon
      } else if (estimatedParcelas === 10) {
        parcelas10++;
      } else if (estimatedParcelas === 9) {
        parcelas9++;
      }
    });

    return {
      parcelas9,
      parcelas10,
      parcelas11,
      parcelas12Plus,
      reachingIn5Days,
    };
  }, [contracts]);

  // Transform contracts to opportunity clients
  const getOpportunityClients = useCallback((filter: OpportunityFilter): OpportunityClient[] => {
    return contracts
      .map(contract => {
        const { isEligible, daysUntilEligible, eligibilityDate } = calculateEligibility(contract, bankRules);

        if (!eligibilityDate) return null;

        // Calculate estimated parcelas
        const monthsSincePayment = contract.data_pagamento 
          ? Math.floor(differenceInDays(new Date(), new Date(contract.data_pagamento)) / 30)
          : 0;

        const priority: 'high' | 'medium' | 'low' = 
          isEligible ? 'high' :
          daysUntilEligible <= 3 ? 'medium' : 'low';

        const status: 'eligible' | 'soon' | 'monitoring' = 
          isEligible ? 'eligible' :
          daysUntilEligible <= 5 ? 'soon' : 'monitoring';

        return {
          id: contract.id,
          nome: contract.nome,
          cpf: contract.cpf,
          telefone: contract.telefone,
          banco: contract.banco,
          tipo_operacao: contract.tipo_operacao,
          parcelasPagas: monthsSincePayment,
          parcelasRestantes: Math.max(0, 12 - monthsSincePayment),
          dataElegibilidade: eligibilityDate,
          diasParaElegibilidade: daysUntilEligible,
          valorPotencial: contract.troco,
          priority,
          status,
        } as OpportunityClient;
      })
      .filter((c): c is OpportunityClient => {
        if (!c) return false;

        // Apply filters
        if (filter.type !== 'all') {
          const isPortability = c.tipo_operacao === 'Portabilidade';
          if (filter.type === 'portability' && !isPortability) return false;
          if (filter.type === 'refinancing' && isPortability) return false;
        }

        if (filter.bank !== 'all' && c.banco.toLowerCase() !== filter.bank.toLowerCase()) {
          return false;
        }

        if (filter.status !== 'all' && c.status !== filter.status) {
          return false;
        }

        if (filter.priority !== 'all' && c.priority !== filter.priority) {
          return false;
        }

        if (filter.search) {
          const search = filter.search.toLowerCase();
          if (
            !c.nome.toLowerCase().includes(search) &&
            !c.cpf.includes(search) &&
            !c.telefone.includes(search)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.diasParaElegibilidade - b.diasParaElegibilidade);
  }, [contracts, bankRules, calculateEligibility]);

  const uniqueBanks = useMemo(() => {
    return [...new Set(contracts.map(c => c.banco))].sort();
  }, [contracts]);

  return {
    contracts,
    bankRules,
    loading,
    isGestor,
    isAdmin,
    profiles,
    stats,
    opportunitiesByBank,
    portabilityBreakdown,
    getOpportunityClients,
    uniqueBanks,
    refresh: fetchData,
  };
}
