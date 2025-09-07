import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, Eye, DollarSign, RotateCcw, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Commission {
  id: string;
  client_name: string;
  bank_name: string;
  product_type: string;
  credit_value: number;
  commission_amount: number;
  commission_percentage: number;
  status: string;
  payment_date: string | null;
  proposal_date: string;
  proposal_number?: string;
  cpf?: string;
  user_id: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

export function PaymentManagement() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      // Buscar comissões com informações do usuário
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select(`
          *,
          user:profiles!commissions_user_id_fkey(
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (commissionsError) throw commissionsError;
      
      // Buscar todos os leads indicados finalizados de todos os usuários
      const { data: leadsIndicadosData, error: leadsError } = await supabase
        .from('leads_indicados')
        .select(`
          *,
          user:profiles!leads_indicados_created_by_fkey(
            id,
            name,
            email
          )
        `)
        .in('status', ['proposta_aprovada', 'contrato_assinado'])
        .order('created_at', { ascending: false });
      
      if (leadsError) {
        console.error('Erro ao buscar leads indicados:', leadsError);
      }
      
      // Transformar leads indicados em formato de comissões
      const leadsAsCommissions = (leadsIndicadosData || []).map(lead => ({
        id: lead.id,
        client_name: lead.nome,
        bank_name: 'Indicação',
        product_type: lead.convenio,
        credit_value: 0,
        commission_amount: 0,
        commission_percentage: 0,
        cpf: lead.cpf || '',
        proposal_number: 'IND-' + lead.id.substring(0, 8),
        status: lead.status === 'contrato_assinado' ? 'paid' : 'pending',
        payment_date: lead.status === 'contrato_assinado' ? lead.updated_at?.split('T')[0] : null,
        proposal_date: lead.created_at?.split('T')[0],
        user_id: lead.created_by,
        user: lead.user,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }));
      
      // Combinar comissões e leads indicados
      const allCommissions = [...(commissionsData || []), ...leadsAsCommissions];
      setCommissions(allCommissions);
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar comissões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (id: string, newStatus: string) => {
    if (processingIds.includes(id)) return;
    
    setProcessingIds(prev => [...prev, id]);
    try {
      const updateData: any = { status: newStatus };
      
      // Se estiver marcando como pago, adicionar a data de pagamento
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status atualizado para ${getStatusText(newStatus)}`,
      });

      fetchCommissions();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => prev.filter(pid => pid !== id));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'preview': return 'secondary';
      case 'pending': return 'default';
      case 'paid': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preview': return 'Prévia';
      case 'pending': return 'Pendente';
      case 'paid': return 'Pago';
      default: return status;
    }
  };

  const getStatusActions = (commission: any) => {
    const isProcessing = processingIds.includes(commission.id);
    
    switch (commission.status) {
      case 'preview':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateCommissionStatus(commission.id, 'pending')}
              disabled={isProcessing}
            >
              <Clock className="h-4 w-4 mr-1" />
              Marcar como Pendente
            </Button>
          </div>
        );
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateCommissionStatus(commission.id, 'paid')}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar como Pago
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateCommissionStatus(commission.id, 'preview')}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Estornar
            </Button>
          </div>
        );
      case 'paid':
        return (
          <div className="flex gap-2 items-center">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Pago em {commission.payment_date ? new Date(commission.payment_date).toLocaleDateString('pt-BR') : 'N/A'}
            </Badge>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateCommissionStatus(commission.id, 'pending')}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Estornar
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  // Calcular totais por status
  const previewTotal = commissions
    .filter(c => c.status === 'preview')
    .reduce((sum, c) => sum + c.commission_amount, 0);
  
  const pendingTotal = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commission_amount, 0);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const getMonthlyTotal = (monthYear: string) => {
    const [year, month] = monthYear.split('-').map(Number);
    return commissions
      .filter(c => {
        if (c.status !== 'paid' || !c.payment_date) return false;
        const paymentDate = new Date(c.payment_date);
        return paymentDate.getMonth() === (month - 1) && paymentDate.getFullYear() === year;
      })
      .reduce((sum, c) => sum + c.commission_amount, 0);
  };
  
  const monthlyTotal = getMonthlyTotal(selectedMonth);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando comissões...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo dos totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prévia Pagamento</p>
                <p className="text-2xl font-bold">R$ {previewTotal.toFixed(2)}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">R$ {pendingTotal.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold">R$ {monthlyTotal.toFixed(2)}</p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por CPF ou número da proposta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              // Filtrar comissões do mês selecionado se o status for 'paid'
              const [year, month] = selectedMonth.split('-').map(Number);
              let filteredCommissions = commissions;

              // Aplicar filtro de mês para comissões pagas
              filteredCommissions = filteredCommissions.filter(c => {
                if (c.status === 'paid' && c.payment_date) {
                  const paymentDate = new Date(c.payment_date);
                  return paymentDate.getMonth() === (month - 1) && paymentDate.getFullYear() === year;
                }
                return c.status !== 'paid';
              });

              // Aplicar filtro de busca
              if (searchTerm) {
                filteredCommissions = filteredCommissions.filter(c => 
                  (c.cpf && c.cpf.includes(searchTerm)) ||
                  (c.proposal_number && c.proposal_number.includes(searchTerm)) ||
                  c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }

              return filteredCommissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nenhuma comissão encontrada para o termo pesquisado' : 'Nenhuma comissão encontrada'}
                </div>
              ) : (
                filteredCommissions.map((commission) => (
                 <div
                   key={commission.id}
                   className="p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                 >
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <h4 className="font-semibold text-lg">{commission.client_name}</h4>
                       <Badge variant={getStatusBadgeVariant(commission.status)} className="text-xs">
                         {getStatusText(commission.status)}
                       </Badge>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                       <div>
                         <span className="text-muted-foreground">Usuário:</span>
                         <span className="ml-2 font-medium">{commission.user?.name || 'N/A'}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Proposta:</span>
                         <span className="ml-2 font-medium">{commission.proposal_number || 'N/A'}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">CPF:</span>
                         <span className="ml-2 font-medium">{commission.cpf || 'N/A'}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Banco:</span>
                         <span className="ml-2 font-medium">{commission.bank_name}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Produto:</span>
                         <span className="ml-2 font-medium">{commission.product_type}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Valor Bruto:</span>
                         <span className="ml-2 font-medium text-blue-600">R$ {commission.credit_value.toFixed(2)}</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Percentual:</span>
                         <span className="ml-2 font-medium">{commission.commission_percentage}%</span>
                       </div>
                       <div>
                         <span className="text-muted-foreground">Comissão:</span>
                         <span className="ml-2 font-bold text-green-600">R$ {commission.commission_amount.toFixed(2)}</span>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2 pt-2">
                       {getStatusActions(commission)}
                     </div>
                   </div>
                 </div>
                ))
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}