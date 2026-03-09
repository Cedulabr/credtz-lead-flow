import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  OpportunityContract, 
  PropostaOpportunity,
  LeadOpportunity,
  BankReuseRule, 
  OpportunityStats, 
  UnifiedStats,
  OpportunityByBank,
  PortabilityBreakdown,
  OpportunityClient,
  OpportunityFilter,
  PORTABILITY_MIN_PARCELAS
} from '../types';
import { addMonths, differenceInDays, addDays, isToday, isBefore, startOfDay } from 'date-fns';

export function useOpportunities() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<OpportunityContract[]>([]);
  const [propostas, setPropostas] = useState<PropostaOpportunity[]>([]);
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
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

      // Parallel fetches
      const [rulesRes, contractsRes, propostasRes, leadsRes, profilesRes] = await Promise.all([
        // Bank rules
        supabase.from('bank_reuse_settings').select('*').eq('is_active', true).order('bank_name'),
        
        // Televendas contracts (paid)
        (() => {
          let q = supabase
            .from('televendas')
            .select('*')
            .in('status', ['pago', 'pago_aprovado', 'proposta_paga'])
            .order('data_pagamento', { ascending: true });
          if (!isAdmin && companyIds.length > 0) {
            q = q.in('company_id', companyIds);
          }
          return q;
        })(),

        // Propostas with future contact
        (() => {
          let q = supabase
            .from('propostas')
            .select('id, "Nome do cliente", cpf, telefone, banco, produto, client_status, future_contact_date, notes, company_id, assigned_to, created_at, valor_proposta')
            .eq('client_status', 'contato_futuro')
            .not('future_contact_date', 'is', null);
          if (!isAdmin && companyIds.length > 0) {
            q = q.in('company_id', companyIds);
          }
          return q;
        })(),

        // Leads with future contact
        (() => {
          let q = supabase
            .from('leads')
            .select('id, name, cpf, phone, banco_operacao, status, future_contact_date, notes, company_id, assigned_to, created_at, valor_operacao, convenio')
            .eq('status', 'contato_futuro')
            .not('future_contact_date', 'is', null);
          if (!isAdmin && companyIds.length > 0) {
            q = q.in('company_id', companyIds);
          }
          return q;
        })(),

        // Profiles
        supabase.from('profiles').select('id, name'),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      setBankRules(rulesRes.data || []);

      if (contractsRes.error) throw contractsRes.error;
      setContracts((contractsRes.data as OpportunityContract[]) || []);

      // Map propostas
      const mappedPropostas: PropostaOpportunity[] = (propostasRes.data || []).map((p: any) => ({
        id: p.id,
        nome: p['Nome do cliente'] || 'Sem nome',
        cpf: p.cpf,
        telefone: p.telefone,
        banco: p.banco,
        produto: p.produto,
        client_status: p.client_status,
        future_contact_date: p.future_contact_date,
        notes: p.notes,
        company_id: p.company_id,
        assigned_to: p.assigned_to,
        created_at: p.created_at,
        valor_proposta: p.valor_proposta,
      }));
      setPropostas(mappedPropostas);

      // Map leads
      const mappedLeads: LeadOpportunity[] = (leadsRes.data || []).map((l: any) => ({
        id: l.id,
        nome: l.name,
        cpf: l.cpf,
        telefone: l.phone,
        banco_operacao: l.banco_operacao,
        status: l.status,
        future_contact_date: l.future_contact_date,
        notes: l.notes,
        company_id: l.company_id,
        assigned_to: l.assigned_to,
        created_at: l.created_at,
        valor_operacao: l.valor_operacao,
        convenio: l.convenio,
      }));
      setLeads(mappedLeads);

      // Profiles map
      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
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

  // Calculate eligibility for a televendas contract
  const calculateEligibility = useCallback((
    contract: OpportunityContract,
    rules: BankReuseRule[]
  ): { isEligible: boolean; daysUntilEligible: number; eligibilityDate: Date | null } => {
    if (!contract.data_pagamento) {
      return { isEligible: false, daysUntilEligible: -1, eligibilityDate: null };
    }

    const paymentDate = new Date(contract.data_pagamento);
    const today = startOfDay(new Date());

    if (contract.tipo_operacao === 'Portabilidade') {
      const eligibilityDate = addMonths(paymentDate, 12);
      const daysUntil = differenceInDays(eligibilityDate, today);
      return { isEligible: daysUntil <= 0, daysUntilEligible: Math.max(0, daysUntil), eligibilityDate };
    }

    const bankRule = rules.find(r => r.bank_name.toLowerCase() === contract.banco.toLowerCase());
    const months = bankRule?.reuse_months ?? 6;
    const eligibilityDate = addMonths(paymentDate, months);
    const daysUntil = differenceInDays(eligibilityDate, today);
    return { isEligible: daysUntil <= 0, daysUntilEligible: Math.max(0, daysUntil), eligibilityDate };
  }, []);

  // Unified stats across all 3 sources
  const unifiedStats = useMemo((): UnifiedStats => {
    const today = startOfDay(new Date());
    const in5Days = addDays(today, 5);

    // Televendas stats
    let televendasEligible = 0;
    let televendasSoon = 0;
    contracts.forEach(contract => {
      const { isEligible, daysUntilEligible } = calculateEligibility(contract, bankRules);
      if (isEligible) televendasEligible++;
      else if (daysUntilEligible <= 5) televendasSoon++;
    });

    // Propostas stats
    let propostasToday = 0;
    let propostasSoon = 0;
    let propostasOverdue = 0;
    propostas.forEach(p => {
      if (!p.future_contact_date) return;
      const contactDate = startOfDay(new Date(p.future_contact_date));
      if (isToday(contactDate)) propostasToday++;
      else if (isBefore(contactDate, today)) propostasOverdue++;
      else if (isBefore(contactDate, in5Days)) propostasSoon++;
    });

    // Leads stats
    let leadsToday = 0;
    let leadsSoon = 0;
    let leadsOverdue = 0;
    leads.forEach(l => {
      if (!l.future_contact_date) return;
      const contactDate = startOfDay(new Date(l.future_contact_date));
      if (isToday(contactDate)) leadsToday++;
      else if (isBefore(contactDate, today)) leadsOverdue++;
      else if (isBefore(contactDate, in5Days)) leadsSoon++;
    });

    const actionToday = televendasEligible + propostasToday + propostasOverdue + leadsToday + leadsOverdue;
    const actionSoon = televendasSoon + propostasSoon + leadsSoon;

    return {
      televendasTotal: contracts.length,
      televendasEligible,
      televendasSoon,
      propostasTotal: propostas.length,
      propostasToday,
      propostasSoon,
      propostasOverdue,
      leadsTotal: leads.length,
      leadsToday,
      leadsSoon,
      leadsOverdue,
      totalOpportunities: contracts.length + propostas.length + leads.length,
      actionToday,
      actionSoon,
    };
  }, [contracts, propostas, leads, bankRules, calculateEligibility]);

  // Legacy stats for backward compat
  const stats = useMemo((): OpportunityStats => {
    const today = startOfDay(new Date());
    let eligibleNow = 0, eligibleToday = 0, eligibleIn3Days = 0, eligibleIn5Days = 0;
    let portabilityEligible = 0, refinancingEligible = 0;

    contracts.forEach(contract => {
      const { isEligible, daysUntilEligible, eligibilityDate } = calculateEligibility(contract, bankRules);
      if (isEligible) {
        eligibleNow++;
        if (contract.tipo_operacao === 'Portabilidade') portabilityEligible++;
        else refinancingEligible++;
      } else if (eligibilityDate) {
        if (isToday(eligibilityDate)) eligibleToday++;
        if (daysUntilEligible <= 3) eligibleIn3Days++;
        if (daysUntilEligible <= 5) eligibleIn5Days++;
      }
    });

    return { totalMonitored: contracts.length, eligibleNow, eligibleToday, eligibleIn3Days, eligibleIn5Days, portabilityEligible, refinancingEligible };
  }, [contracts, bankRules, calculateEligibility]);

  // Opportunities by bank
  const opportunitiesByBank = useMemo((): OpportunityByBank[] => {
    const bankMap = new Map<string, OpportunityByBank>();
    bankRules.forEach(rule => {
      bankMap.set(rule.bank_name.toLowerCase(), {
        bankName: rule.bank_name, ruleMonths: rule.reuse_months,
        totalContracts: 0, eligibleNow: 0, eligibleSoon: 0, potentialValue: 0,
      });
    });

    contracts.forEach(contract => {
      const bankKey = contract.banco.toLowerCase();
      const { isEligible, daysUntilEligible } = calculateEligibility(contract, bankRules);
      if (!bankMap.has(bankKey)) {
        bankMap.set(bankKey, { bankName: contract.banco, ruleMonths: 6, totalContracts: 0, eligibleNow: 0, eligibleSoon: 0, potentialValue: 0 });
      }
      const bankData = bankMap.get(bankKey)!;
      bankData.totalContracts++;
      if (isEligible) bankData.eligibleNow++;
      else if (daysUntilEligible <= 5) bankData.eligibleSoon++;
      if (contract.troco) bankData.potentialValue += contract.troco;
    });

    return Array.from(bankMap.values()).filter(b => b.totalContracts > 0).sort((a, b) => b.eligibleNow - a.eligibleNow);
  }, [contracts, bankRules, calculateEligibility]);

  // Portability breakdown
  const portabilityBreakdown = useMemo((): PortabilityBreakdown => {
    const portabilityContracts = contracts.filter(c => c.tipo_operacao === 'Portabilidade');
    const today = new Date();
    let parcelas9 = 0, parcelas10 = 0, parcelas11 = 0, parcelas12Plus = 0, reachingIn5Days = 0;

    portabilityContracts.forEach(contract => {
      if (!contract.data_pagamento) return;
      const monthsSince = differenceInDays(today, new Date(contract.data_pagamento)) / 30;
      const estimated = Math.floor(monthsSince);
      if (estimated >= 12) parcelas12Plus++;
      else if (estimated === 11) { parcelas11++; reachingIn5Days++; }
      else if (estimated === 10) parcelas10++;
      else if (estimated === 9) parcelas9++;
    });

    return { parcelas9, parcelas10, parcelas11, parcelas12Plus, reachingIn5Days };
  }, [contracts]);

  // Transform all sources to unified OpportunityClient list
  const getOpportunityClients = useCallback((filter: OpportunityFilter): OpportunityClient[] => {
    const today = startOfDay(new Date());
    const results: OpportunityClient[] = [];

    // Source filter check helper
    const sourceMatch = (src: string) => filter.source === 'all' || filter.source === src;

    // 1. Televendas contracts
    if (sourceMatch('televendas')) {
      contracts.forEach(contract => {
        const { isEligible, daysUntilEligible, eligibilityDate } = calculateEligibility(contract, bankRules);
        if (!eligibilityDate) return;

        const monthsSince = contract.data_pagamento
          ? Math.floor(differenceInDays(new Date(), new Date(contract.data_pagamento)) / 30) : 0;

        const priority: 'high' | 'medium' | 'low' = isEligible ? 'high' : daysUntilEligible <= 3 ? 'medium' : 'low';
        const status: 'eligible' | 'soon' | 'monitoring' = isEligible ? 'eligible' : daysUntilEligible <= 5 ? 'soon' : 'monitoring';

        results.push({
          id: contract.id,
          nome: contract.nome, cpf: contract.cpf, telefone: contract.telefone,
          banco: contract.banco, tipo_operacao: contract.tipo_operacao,
          parcelasPagas: monthsSince, parcelasRestantes: Math.max(0, 12 - monthsSince),
          dataElegibilidade: eligibilityDate, diasParaElegibilidade: daysUntilEligible,
          valorPotencial: contract.troco, priority, status, source: 'televendas',
        });
      });
    }

    // 2. Propostas
    if (sourceMatch('propostas')) {
      propostas.forEach(p => {
        if (!p.future_contact_date) return;
        const contactDate = startOfDay(new Date(p.future_contact_date));
        const daysUntil = differenceInDays(contactDate, today);
        const isOverdue = isBefore(contactDate, today);
        const isTodayContact = isToday(contactDate);

        const priority: 'high' | 'medium' | 'low' = isOverdue || isTodayContact ? 'high' : daysUntil <= 3 ? 'medium' : 'low';
        const status: 'eligible' | 'soon' | 'monitoring' = isOverdue || isTodayContact ? 'eligible' : daysUntil <= 5 ? 'soon' : 'monitoring';

        results.push({
          id: String(p.id), nome: p.nome, cpf: p.cpf || '', telefone: p.telefone || '',
          banco: p.banco || '-', tipo_operacao: p.produto || 'Contato Futuro',
          parcelasPagas: 0, parcelasRestantes: 0,
          dataElegibilidade: contactDate, diasParaElegibilidade: Math.max(0, daysUntil),
          valorPotencial: p.valor_proposta, priority, status, source: 'propostas',
          futureContactDate: p.future_contact_date, notes: p.notes,
        });
      });
    }

    // 3. Leads
    if (sourceMatch('leads')) {
      leads.forEach(l => {
        if (!l.future_contact_date) return;
        const contactDate = startOfDay(new Date(l.future_contact_date));
        const daysUntil = differenceInDays(contactDate, today);
        const isOverdue = isBefore(contactDate, today);
        const isTodayContact = isToday(contactDate);

        const priority: 'high' | 'medium' | 'low' = isOverdue || isTodayContact ? 'high' : daysUntil <= 3 ? 'medium' : 'low';
        const status: 'eligible' | 'soon' | 'monitoring' = isOverdue || isTodayContact ? 'eligible' : daysUntil <= 5 ? 'soon' : 'monitoring';

        results.push({
          id: l.id, nome: l.nome, cpf: l.cpf, telefone: l.telefone,
          banco: l.banco_operacao || '-', tipo_operacao: l.convenio || 'Lead Premium',
          parcelasPagas: 0, parcelasRestantes: 0,
          dataElegibilidade: contactDate, diasParaElegibilidade: Math.max(0, daysUntil),
          valorPotencial: l.valor_operacao, priority, status, source: 'leads',
          futureContactDate: l.future_contact_date, notes: l.notes,
        });
      });
    }

    // Apply remaining filters
    return results
      .filter(c => {
        if (filter.type !== 'all') {
          const isPort = c.tipo_operacao === 'Portabilidade';
          if (filter.type === 'portability' && !isPort) return false;
          if (filter.type === 'refinancing' && isPort) return false;
        }
        if (filter.bank !== 'all' && c.banco.toLowerCase() !== filter.bank.toLowerCase()) return false;
        if (filter.status !== 'all' && c.status !== filter.status) return false;
        if (filter.priority !== 'all' && c.priority !== filter.priority) return false;
        if (filter.search) {
          const s = filter.search.toLowerCase();
          if (!c.nome.toLowerCase().includes(s) && !c.cpf.includes(s) && !c.telefone.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => a.diasParaElegibilidade - b.diasParaElegibilidade);
  }, [contracts, propostas, leads, bankRules, calculateEligibility]);

  const uniqueBanks = useMemo(() => {
    const allBanks = [
      ...contracts.map(c => c.banco),
      ...propostas.filter(p => p.banco).map(p => p.banco!),
      ...leads.filter(l => l.banco_operacao).map(l => l.banco_operacao!),
    ];
    return [...new Set(allBanks)].sort();
  }, [contracts, propostas, leads]);

  return {
    contracts, propostas, leads, bankRules, loading, isGestor, isAdmin, profiles,
    stats, unifiedStats, opportunitiesByBank, portabilityBreakdown,
    getOpportunityClients, uniqueBanks, refresh: fetchData,
  };
}
