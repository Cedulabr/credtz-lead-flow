import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Banknote, Calendar } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpf: string;
  nome: string;
}

interface Contract {
  contrato: string;
  banco_emprestimo: string;
  vl_parcela: number | null;
  saldo: number | null;
  prazo: number | null;
  taxa: number | null;
  tipo_emprestimo: string | null;
  situacao_emprestimo: string | null;
}

export function ContractsDrawer({ open, onOpenChange, cpf, nome }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !cpf) return;
    setLoading(true);
    // Query edge function for contracts
    supabase.functions.invoke('baseoff-external-query', {
      body: { cpf },
    }).then(({ data, error }) => {
      if (error || !data?.contratos) {
        setContracts([]);
      } else {
        setContracts(data.contratos || []);
      }
    }).finally(() => setLoading(false));
  }, [open, cpf]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contratos de {nome}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum contrato encontrado</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{c.banco_emprestimo}</span>
                  </div>
                  {c.situacao_emprestimo && (
                    <Badge variant="outline" className="text-xs">{c.situacao_emprestimo}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  {c.vl_parcela != null && (
                    <div className="flex items-center gap-1">
                      <Banknote className="h-3 w-3" />
                      Parcela: R$ {c.vl_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {c.saldo != null && (
                    <div>Saldo: R$ {c.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  )}
                  {c.prazo != null && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Prazo: {c.prazo}
                    </div>
                  )}
                  {c.taxa != null && (
                    <div>Taxa: {c.taxa}%</div>
                  )}
                </div>
                {c.tipo_emprestimo && (
                  <p className="text-xs text-muted-foreground">Tipo: {c.tipo_emprestimo}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
