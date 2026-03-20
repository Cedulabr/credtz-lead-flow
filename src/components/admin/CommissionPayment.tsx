import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Search, Receipt, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [userFilter, setUserFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<PaidProposal | null>(null);
  const [commissionMode, setCommissionMode] = useState<'percentual' | 'fixo'>('percentual');
  const [commissionBase, setCommissionBase] = useState<'parcela' | 'saldo_devedor' | 'bruto' | 'liquido'>('parcela');
  const [commissionInput, setCommissionInput] = useState('');
  const [dialogPosting, setDialogPosting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
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

      const pendingProposals = (proposalsRes.data || []).filter(
        (p: any) => !existingSet.has(p.id)
      );

      const userIds = [...new Set(pendingProposals.map((p: any) => p.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_profiles_by_ids', { user_ids: userIds });

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        const enriched = pendingProposals.map((p: any) => {
          const profile = profileMap.get(p.user_id);
          return {
            ...p,
            user_name: profile?.name || profile?.email?.split('@')[0] || 'Sem nome',
            user_level: profile?.level || 'Bronze',
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
    const matchingRule = rules.find(r => {
      const bankMatch = r.bank_name.toLowerCase() === proposal.banco.toLowerCase();
      const productMatch = r.product_name.toLowerCase() === proposal.tipo_operacao.toLowerCase();
      const levelMatch = r.user_level.toLowerCase() === (proposal.user_level || 'bronze').toLowerCase();
      return bankMatch && productMatch && levelMatch;
    });

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

    let baseValue = proposal.parcela;
    if (rule.calculation_model === 'saldo_devedor' && proposal.saldo_devedor) {
      baseValue = proposal.saldo_devedor;
    }

    const percentage = rule.commission_value;
    let amount = 0;

    if (rule.commission_type === 'percentual' || rule.commission_type === 'percentage') {
      amount = baseValue * (percentage / 100);
    } else {
      amount = percentage;
    }

    return { amount, percentage, baseValue, rule };
  };

  const getBaseValueByMode = (proposal: PaidProposal, base: string) => {
    switch (base) {
      case 'saldo_devedor': return proposal.saldo_devedor || 0;
      case 'bruto': return proposal.troco || proposal.parcela;
      case 'liquido': return proposal.parcela - (proposal.saldo_devedor || 0);
      default: return proposal.parcela;
    }
  };

  const BASE_LABELS: Record<string, string> = {
    parcela: 'Parcela',
    saldo_devedor: 'Saldo Devedor',
    bruto: 'Bruto (Troco)',
    liquido: 'Líquido',
  };

  const getDialogCommissionValues = (proposal: PaidProposal) => {
    const inputVal = parseFloat(commissionInput) || 0;
    const baseValue = getBaseValueByMode(proposal, commissionBase);
    let percentage = 0;
    let amount = 0;

    if (commissionMode === 'percentual') {
      percentage = inputVal;
      amount = baseValue * (inputVal / 100);
    } else {
      amount = inputVal;
      percentage = baseValue > 0 ? (inputVal / baseValue) * 100 : 0;
    }

    return { amount, percentage, baseValue };
  };

  const openDialog = (proposal: PaidProposal) => {
    setSelectedProposal(proposal);
    const calc = calculateCommission(proposal);
    if (calc.rule) {
      const isPercentual = calc.rule.commission_type === 'percentual' || calc.rule.commission_type === 'percentage';
      setCommissionMode(isPercentual ? 'percentual' : 'fixo');
      setCommissionInput(String(calc.rule.commission_value));
      setCommissionBase(calc.rule.calculation_model === 'saldo_devedor' ? 'saldo_devedor' : 'parcela');
    } else {
      setCommissionMode('percentual');
      setCommissionInput('');
      setCommissionBase('parcela');
    }
    setDialogOpen(true);
  };

  const handleConfirmCommission = async () => {
    if (!selectedProposal) return;
    setDialogPosting(true);
    try {
      const { amount, percentage, baseValue } = getDialogCommissionValues(selectedProposal);

      const { error } = await supabase.from('commissions').insert({
        user_id: selectedProposal.user_id,
        client_name: selectedProposal.nome,
        cpf: selectedProposal.cpf,
        bank_name: selectedProposal.banco,
        product_type: selectedProposal.tipo_operacao,
        credit_value: baseValue,
        commission_percentage: percentage,
        commission_amount: amount,
        proposal_date: selectedProposal.data_venda,
        payment_date: selectedProposal.data_pagamento,
        company_id: selectedProposal.company_id,
        status: 'pago',
        televendas_id: selectedProposal.id,
      } as any);

      if (error) throw error;

      setProposals(prev => prev.filter(p => p.id !== selectedProposal.id));
      setExistingIds(prev => new Set([...prev, selectedProposal.id]));
      toast({ title: 'Comissão lançada!', description: `${selectedProposal.nome} — R$ ${amount.toFixed(2)}` });
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error posting commission:', error);
      toast({ title: 'Erro ao lançar comissão', description: error.message, variant: 'destructive' });
    } finally {
      setDialogPosting(false);
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

  // Derived: unique users
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    proposals.forEach(p => {
      if (!map.has(p.user_id)) map.set(p.user_id, p.user_name || 'Sem nome');
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [proposals]);

  // Derived: unique months
  const uniqueMonths = useMemo(() => {
    const set = new Map<string, string>();
    proposals.forEach(p => {
      const dateStr = p.data_pagamento || p.data_venda;
      if (!dateStr) return;
      try {
        const d = parseISO(dateStr);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yyyy', { locale: ptBR });
        set.set(key, label.charAt(0).toUpperCase() + label.slice(1));
      } catch { /* skip */ }
    });
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchSearch = !searchTerm ||
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm);
      const matchCompany = companyFilter === 'all' || p.company_id === companyFilter;
      const matchBank = bankFilter === 'all' || p.banco.toLowerCase() === bankFilter.toLowerCase();
      const matchUser = userFilter === 'all' || p.user_id === userFilter;
      const matchMonth = (() => {
        if (monthFilter === 'all') return true;
        const dateStr = p.data_pagamento || p.data_venda;
        if (!dateStr) return false;
        try {
          return format(parseISO(dateStr), 'yyyy-MM') === monthFilter;
        } catch { return false; }
      })();
      return matchSearch && matchCompany && matchBank && matchUser && matchMonth;
    });
  }, [proposals, searchTerm, companyFilter, bankFilter, userFilter, monthFilter]);

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

  const dialogCalc = selectedProposal ? getDialogCommissionValues(selectedProposal) : null;

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
          <div className="flex flex-col gap-3">
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
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos funcionários</SelectItem>
                  {uniqueUsers.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos meses</SelectItem>
                  {uniqueMonths.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredProposals.length > 0 && (
                <Button
                  onClick={handlePostAll}
                  disabled={postingAll}
                  className="gap-2 ml-auto"
                >
                  {postingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                  {postingAll ? 'Lançando...' : `Lançar Todas (${filteredProposals.length})`}
                </Button>
              )}
            </div>
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
                          onClick={() => openDialog(proposal)}
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

      {/* Commission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar Comissão</DialogTitle>
            <DialogDescription>Defina o valor da comissão para esta proposta.</DialogDescription>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Cliente</div>
                <div className="font-medium">{selectedProposal.nome}</div>
                <div className="text-muted-foreground">CPF</div>
                <div>{selectedProposal.cpf}</div>
                <div className="text-muted-foreground">Banco</div>
                <div>{selectedProposal.banco}</div>
                <div className="text-muted-foreground">Operação</div>
                <div>{selectedProposal.tipo_operacao}</div>
                <div className="text-muted-foreground">Parcela</div>
                <div className="tabular-nums">R$ {selectedProposal.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                {selectedProposal.saldo_devedor && (
                  <>
                    <div className="text-muted-foreground">Saldo Devedor</div>
                    <div className="tabular-nums">R$ {selectedProposal.saldo_devedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </>
                )}
                <div className="text-muted-foreground">Consultor</div>
                <div>{selectedProposal.user_name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Base de cálculo</label>
                <Select value={commissionBase} onValueChange={(v: any) => setCommissionBase(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parcela">Parcela — R$ {selectedProposal.parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>
                    <SelectItem value="saldo_devedor">Saldo Devedor — R$ {(selectedProposal.saldo_devedor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>
                    <SelectItem value="bruto">Bruto (Troco) — R$ {(selectedProposal.troco || selectedProposal.parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>
                    <SelectItem value="liquido">Líquido — R$ {(selectedProposal.parcela - (selectedProposal.saldo_devedor || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de comissão</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={commissionMode === 'percentual' ? 'default' : 'outline'}
                    onClick={() => setCommissionMode('percentual')}
                  >
                    Percentual (%)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={commissionMode === 'fixo' ? 'default' : 'outline'}
                    onClick={() => setCommissionMode('fixo')}
                  >
                    Valor Fixo (R$)
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {commissionMode === 'percentual' ? 'Percentual (%)' : 'Valor fixo (R$)'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={commissionMode === 'percentual' ? 'Ex: 2.5' : 'Ex: 150.00'}
                  value={commissionInput}
                  onChange={e => setCommissionInput(e.target.value)}
                />
              </div>

              {dialogCalc && (
                <div className="rounded-md bg-muted p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Valor da comissão</div>
                  <div className="text-xl font-bold tabular-nums text-emerald-600">
                    R$ {dialogCalc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dialogCalc.percentage.toFixed(2)}% sobre R$ {dialogCalc.baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({BASE_LABELS[commissionBase]})
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={dialogPosting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCommission} disabled={dialogPosting || !commissionInput}>
              {dialogPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
