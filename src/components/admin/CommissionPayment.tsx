import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Search, Receipt, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PaidProposal {
  id: string;
  nome: string;
  cpf: string;
  banco: string;
  tipo_operacao: string;
  parcela: number;
  saldo_devedor: number | null;
  troco: number | null;
  data_pagamento: string | null;
  data_venda: string;
  user_id: string;
  company_id: string | null;
  user_name?: string;
  user_level?: string;
}

interface CommissionRule {
  id: string;
  bank_name: string;
  product_name: string;
  calculation_model: string;
  commission_type: string;
  commission_value: number;
  user_level: string;
  operation_type: string | null;
}

export function CommissionPayment() {
  const [proposals, setProposals] = useState<PaidProposal[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [posting, setPosting] = useState<string | null>(null);
  const [postingAll, setPostingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch paid proposals, existing commission televendas_ids, rules, companies, and profiles in parallel
      const [proposalsRes, commissionsRes, rulesRes, companiesRes] = await Promise.all([
        supabase
          .from('televendas')
          .select('id, nome, cpf, banco, tipo_operacao, parcela, saldo_devedor, troco, data_pagamento, data_venda, user_id, company_id')
          .eq('status', 'proposta_paga')
          .order('data_pagamento', { ascending: false }),
        supabase
          .from('commissions')
          .select('televendas_id')
          .not('televendas_id', 'is', null),
        supabase
          .from('commission_rules')
          .select('id, bank_name, product_name, calculation_model, commission_type, commission_value, user_level, operation_type')
          .eq('is_active', true),
        supabase
          .from('companies')
          .select('id, name')
          .eq('is_active', true),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;
      if (commissionsRes.error) throw commissionsRes.error;
      if (rulesRes.error) throw rulesRes.error;

      const existingSet = new Set((commissionsRes.data || []).map((c: any) => c.televendas_id as string));
      setExistingIds(existingSet);
      setRules(rulesRes.data || []);
      setCompanies(companiesRes.data || []);

      // Filter out proposals that already have commissions
      const pendingProposals = (proposalsRes.data || []).filter(
        (p: any) => !existingSet.has(p.id)
      );

      // Fetch user profiles for names and levels
      const userIds = [...new Set(pendingProposals.map((p: any) => p.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, user_percentage_profile')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        
        const enriched = pendingProposals.map((p: any) => {
          const profile = profileMap.get(p.user_id);
          return {
            ...p,
            user_name: profile?.name || 'Sem nome',
            user_level: profile?.user_percentage_profile || 'Bronze',
          };
        });
        setProposals(enriched);
      } else {
        setProposals([]);
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCommission = (proposal: PaidProposal): { amount: number; percentage: number; baseValue: number; rule: CommissionRule | null } => {
    // Find matching rule: bank + product + user_level
    const matchingRule = rules.find(r => {
      const bankMatch = r.bank_name.toLowerCase() === proposal.banco.toLowerCase();
      const productMatch = r.product_name.toLowerCase() === proposal.tipo_operacao.toLowerCase();
      const levelMatch = r.user_level.toLowerCase() === (proposal.user_level || 'bronze').toLowerCase();
      return bankMatch && productMatch && levelMatch;
    });

    // Fallback: match just bank + product (any level)
    const fallbackRule = !matchingRule
      ? rules.find(r => {
          const bankMatch = r.bank_name.toLowerCase() === proposal.banco.toLowerCase();
          const productMatch = r.product_name.toLowerCase() === proposal.tipo_operacao.toLowerCase();
          return bankMatch && productMatch;
        })
      : null;

    const rule = matchingRule || fallbackRule;

    if (!rule) {
      return { amount: 0, percentage: 0, baseValue: proposal.parcela, rule: null };
    }

    // Determine base value based on calculation_model
    let baseValue = proposal.parcela;
    if (rule.calculation_model === 'saldo_devedor' && proposal.saldo_devedor) {
      baseValue = proposal.saldo_devedor;
    }

    const percentage = rule.commission_value;
    let amount = 0;

    if (rule.commission_type === 'percentual' || rule.commission_type === 'percentage') {
      amount = baseValue * (percentage / 100);
    } else {
      amount = percentage; // fixed value
    }

    return { amount, percentage, baseValue, rule };
  };

  const handlePostCommission = async (proposal: PaidProposal) => {
    setPosting(proposal.id);
    try {
      const { amount, percentage, baseValue } = calculateCommission(proposal);

      const { error } = await supabase.from('commissions').insert({
        user_id: proposal.user_id,
        client_name: proposal.nome,
        cpf: proposal.cpf,
        bank_name: proposal.banco,
        product_type: proposal.tipo_operacao,
        credit_value: baseValue,
        commission_percentage: percentage,
        commission_amount: amount,
        proposal_date: proposal.data_venda,
        payment_date: proposal.data_pagamento,
        company_id: proposal.company_id,
        status: 'pago',
        televendas_id: proposal.id,
      } as any);

      if (error) throw error;

      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      setExistingIds(prev => new Set([...prev, proposal.id]));
      toast({ title: 'Comissão lançada com sucesso!', description: `${proposal.nome} — R$ ${amount.toFixed(2)}` });
    } catch (error: any) {
      console.error('Error posting commission:', error);
      toast({ title: 'Erro ao lançar comissão', description: error.message, variant: 'destructive' });
    } finally {
      setPosting(null);
    }
  };

  const handlePostAll = async () => {
    setPostingAll(true);
    let success = 0;
    let failed = 0;

    for (const proposal of filteredProposals) {
      try {
        const { amount, percentage, baseValue } = calculateCommission(proposal);

        const { error } = await supabase.from('commissions').insert({
          user_id: proposal.user_id,
          client_name: proposal.nome,
          cpf: proposal.cpf,
          bank_name: proposal.banco,
          product_type: proposal.tipo_operacao,
          credit_value: baseValue,
          commission_percentage: percentage,
          commission_amount: amount,
          proposal_date: proposal.data_venda,
          payment_date: proposal.data_pagamento,
          company_id: proposal.company_id,
          status: 'pago',
          televendas_id: proposal.id,
        } as any);

        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    toast({
      title: 'Lançamento em lote concluído',
      description: `${success} lançadas, ${failed} com erro`,
    });

    await fetchData();
    setPostingAll(false);
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchSearch = !searchTerm ||
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm);
      const matchCompany = companyFilter === 'all' || p.company_id === companyFilter;
      const matchBank = bankFilter === 'all' || p.banco.toLowerCase() === bankFilter.toLowerCase();
      return matchSearch && matchCompany && matchBank;
    });
  }, [proposals, searchTerm, companyFilter, bankFilter]);

  const uniqueBanks = useMemo(() => {
    return [...new Set(proposals.map(p => p.banco))].sort();
  }, [proposals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pendentes</div>
            <div className="text-2xl font-bold tabular-nums">{proposals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Filtradas</div>
            <div className="text-2xl font-bold tabular-nums">{filteredProposals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Valor Total Estimado</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">
              R$ {filteredProposals.reduce((sum, p) => sum + calculateCommission(p).amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos bancos</SelectItem>
                {uniqueBanks.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredProposals.length > 0 && (
              <Button
                onClick={handlePostAll}
                isLoading={postingAll}
                loadingText="Lançando..."
                className="gap-2"
              >
                <Receipt className="h-4 w-4" />
                Lançar Todas ({filteredProposals.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Tudo em dia!</h3>
            <p className="text-sm text-muted-foreground">Nenhuma proposta paga pendente de comissão.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead className="text-right">Parcela</TableHead>
                  <TableHead className="text-right">Saldo Dev.</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map(proposal => {
                  const calc = calculateCommission(proposal);
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{proposal.nome}</div>
                          <div className="text-xs text-muted-foreground">{proposal.cpf}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{proposal.banco}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{proposal.tipo_operacao}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        R$ {proposal.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {proposal.saldo_devedor
                          ? `R$ ${proposal.saldo_devedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{proposal.user_name}</div>
                          <Badge variant="secondary" className="text-[10px]">{proposal.user_level}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {calc.rule ? (
                          <div>
                            <div className="font-semibold text-emerald-600 tabular-nums">
                              R$ {calc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{calc.percentage}%</div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Sem regra
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePostCommission(proposal)}
                          isLoading={posting === proposal.id}
                          loadingText="..."
                          disabled={!!posting || postingAll}
                        >
                          Lançar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
