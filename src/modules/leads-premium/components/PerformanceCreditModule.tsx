import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, History, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  performance_snapshot?: any;
  created_at: string;
  profiles?: { name: string; email: string };
}

export function PerformanceCreditModule() {
  const { user, profile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [amount, setAmount] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('agibank_credit_requests' as any)
        .select('*, profiles(name, email)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching credit requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, isAdmin]);

  const handleSubmitRequest = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('agibank_credit_requests' as any)
        .insert({
          user_id: user?.id,
          amount: parseInt(amount),
          status: 'pending',
          performance_snapshot: {
            request_date: new Date().toISOString(),
            user_name: profile?.name || user?.email
          }
        });

      if (error) throw error;
      toast.success("Solicitação enviada com sucesso!");
      setIsOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error("Erro ao solicitar créditos: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('agibank_credit_requests' as any)
        .update({ status, reviewed_by: user?.id })
        .eq('id', requestId);

      if (error) throw error;
      toast.success(`Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'}!`);
      fetchRequests();
    } catch (error: any) {
      toast.error("Erro ao processar solicitação");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Solicitação de Créditos</h2>
          <p className="text-muted-foreground text-sm">
            Peça créditos com base no seu desempenho. A aprovação é feita pelo administrador.
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Solicitar Créditos
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4 bg-card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma solicitação encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{req.amount}</span>
                    <span className="text-sm text-muted-foreground">créditos</span>
                    <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'secondary' : 'destructive'} className="ml-2">
                      {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Por: {req.profiles?.name || req.profiles?.email}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                
                {isAdmin && req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAdminAction(req.id, 'approved')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleAdminAction(req.id, 'rejected')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Solicitar Créditos</DialogTitle>
            <DialogDescription>
              Informe a quantidade de créditos que deseja solicitar para prospecção.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Quantidade de Créditos</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 50"
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
              <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Sua solicitação será analisada pelo administrador com base no seu histórico de conversão e uso de leads.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}