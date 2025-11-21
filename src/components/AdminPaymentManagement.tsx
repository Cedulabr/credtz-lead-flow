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

export function AdminPaymentManagement() {
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
      // Buscar comissões sem relacionamento direto
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (commissionsError) throw commissionsError;
      
      // Buscar perfis de usuários separadamente
      const userIds = commissionsData?.map(c => c.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      
      // Mapear perfis aos dados de comissões
      const commissionsWithUsers = commissionsData?.map(commission => ({
        ...commission,
        user: profilesData?.find(p => p.id === commission.user_id) || null
      }));
      
      // Buscar todos os leads indicados
      const { data: leadsIndicadosData, error: leadsError } = await supabase
        .from('leads_indicados')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leadsError) {
        console.error('Erro ao buscar leads indicados:', leadsError);
      }
      
      // Buscar perfis para leads indicados
      const leadsUserIds = leadsIndicadosData?.map(l => l.created_by).filter(Boolean) || [];
      const { data: leadsProfilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', leadsUserIds);
      
      // Mapear perfis aos leads indicados
      const leadsWithUsers = leadsIndicadosData?.map(lead => ({
        ...lead,
        user: leadsProfilesData?.find(p => p.id === lead.created_by) || null
      }));
      
      // Buscar televendas
      const { data: televendasData, error: televendasError } = await supabase
        .from('televendas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (televendasError) {
        console.error('Erro ao buscar televendas:', televendasError);
      }
      
      // Buscar perfis para televendas
      const televendasUserIds = televendasData?.map(t => t.user_id).filter(Boolean) || [];
      const { data: televendasProfilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', televendasUserIds);
      
      // Mapear perfis aos televendas
      const televendasWithUsers = televendasData?.map(tv => ({
        ...tv,
        user: televendasProfilesData?.find(p => p.id === tv.user_id) || null
      }));
      
      // Transformar televendas em formato de comissões
      const televendasAsCommissions = (televendasWithUsers || []).map(tv => {
        let commissionAmount = 0;
        let status = 'pending';
        
        // Calcular valor baseado no status do televendas
        if (tv.status === 'pago') {
          commissionAmount = tv.parcela || 0; // Usar o valor da parcela como comissão
          status = 'paid';
        } else if (tv.status === 'pendente') {
          commissionAmount = tv.parcela || 0;
          status = 'pending';
        } else {
          commissionAmount = 0;
          status = 'preview';
        }
        
        return {
          id: tv.id,
          client_name: tv.nome,
          bank_name: tv.banco,
          product_type: tv.tipo_operacao,
          credit_value: tv.parcela || 0,
          commission_amount: commissionAmount,
          commission_percentage: 100, // 100% do valor para televendas
          status: status,
          payment_date: tv.status === 'pago' ? tv.updated_at : null,
          proposal_date: tv.data_venda,
          proposal_number: null,
          cpf: tv.cpf,
          user_id: tv.user_id,
          user: tv.user,
          created_at: tv.created_at,
          type: 'televendas' as const
        };
      });
      
      // Transformar leads indicados em formato de comissões com valores calculados
      const leadsAsCommissions = (leadsWithUsers || []).map(lead => {
        // Calcular comissão baseada no status
        let commissionAmount = 0;
        let status = 'pending';
        
        switch (lead.status) {
          case 'contrato_assinado':
          case 'comissao_paga':
            commissionAmount = 50; // Valor padrão de R$ 50 para indicações
            status = 'paid';
            break;
          case 'proposta_aprovada':
            commissionAmount = 50;
            status = 'pending';
            break;
          default:
            commissionAmount = 0;
            status = 'preview';
        }
        
        return {
          id: lead.id,
          client_name: lead.nome,
          bank_name: 'Indicação',
          product_type: lead.convenio,
          credit_value: commissionAmount,
          commission_amount: commissionAmount,
          commission_percentage: 100,
          cpf: lead.cpf || '',
          proposal_number: 'IND-' + lead.id.substring(0, 8),
          status: status,
          payment_date: status === 'paid' ? lead.updated_at?.split('T')[0] : null,
          proposal_date: lead.created_at?.split('T')[0],
          user_id: lead.created_by,
          user: lead.user,
          created_at: lead.created_at,
          updated_at: lead.updated_at
        };
      });
      
      // Combinar comissões, leads indicados e televendas
      const allCommissions = [
        ...(commissionsWithUsers || []), 
        ...leadsAsCommissions,
        ...televendasAsCommissions
      ];
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
      const commission = commissions.find(c => c.id === id);
      
      if (!commission) {
        throw new Error('Comissão não encontrada');
      }

      if (commission.bank_name === 'Indicação') {
        // Para leads indicados, atualizar a tabela leads_indicados
        let leadsStatus = newStatus;
        if (newStatus === 'paid') {
          leadsStatus = 'comissao_paga';
        } else if (newStatus === 'pending') {
          leadsStatus = 'proposta_aprovada';
        }
        
        const { error } = await supabase
          .from('leads_indicados')
          .update({ status: leadsStatus })
          .eq('id', id);

        if (error) throw error;
      } else if (commission.type === 'televendas') {
        // Para televendas, atualizar a tabela televendas
        let tvStatus = 'pendente';
        if (newStatus === 'paid') {
          tvStatus = 'pago';
        } else if (newStatus === 'pending') {
          tvStatus = 'pendente';
        }
        
        const { error } = await supabase
          .from('televendas')
          .update({ status: tvStatus })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Para comissões normais, atualizar a tabela commissions
        const updateData: any = { status: newStatus };
        
        // IMPORTANTE: Sempre setar payment_date quando marcar como pago
        if (newStatus === 'paid') {
          updateData.payment_date = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase
          .from('commissions')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: `Status atualizado para ${getStatusText(newStatus)}`,
      });

      fetchCommissions();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da comissão",
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
              Pagar
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

  // Filtrar comissões por busca
  const filteredCommissions = commissions.filter(c => {
    if (!searchTerm) return true;
    return (
      (c.cpf && c.cpf.includes(searchTerm)) ||
      (c.proposal_number && c.proposal_number.includes(searchTerm)) ||
      c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.user?.name && c.user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando gestão de pagamentos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo dos totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-muted-foreground">Pendente para Pagamento</p>
                <p className="text-2xl font-bold">R$ {pendingTotal.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestão de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Pagamentos</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por CPF, proposta, cliente ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCommissions.length === 0 ? (
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}