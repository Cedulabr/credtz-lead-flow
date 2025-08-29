import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Clock, Eye, DollarSign, RotateCcw } from "lucide-react";

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
  user_id: string;
  user?: {
    name: string;
    email: string;
  };
}

export function PaymentManagement() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      // Buscar comissões
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (commissionsError) throw commissionsError;

      // Buscar perfis dos usuários
      const userIds = [...new Set(commissionsData?.map(c => c.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Combinar dados
      const transformedData = commissionsData?.map(commission => ({
        ...commission,
        user: profilesData?.find(profile => profile.id === commission.user_id)
      })) || [];
      
      setCommissions(transformedData);
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

  const getStatusActions = (commission: Commission) => {
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
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTotal = commissions
    .filter(c => {
      if (c.status !== 'paid' || !c.payment_date) return false;
      const paymentDate = new Date(c.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, c) => sum + c.commission_amount, 0);

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
              <div>
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold">R$ {monthlyTotal.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma comissão encontrada
              </div>
            ) : (
              commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{commission.client_name}</h4>
                      <Badge variant={getStatusBadgeVariant(commission.status)}>
                        {getStatusText(commission.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {commission.user?.name || 'Usuário não encontrado'} • {commission.bank_name} • {commission.product_type}
                      {commission.proposal_number && ` • Proposta: ${commission.proposal_number}`}
                    </p>
                    <p className="text-sm">
                      Valor da operação: R$ {commission.credit_value.toFixed(2)} • 
                      Comissão: R$ {commission.commission_amount.toFixed(2)} ({commission.commission_percentage}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusActions(commission)}
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