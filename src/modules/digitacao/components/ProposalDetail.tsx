import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { Proposal, STATUS_MAP } from '../types';
import { toast } from 'sonner';

interface ProposalDetailProps {
  proposal: Proposal | null;
  onClose: () => void;
}

export function ProposalDetail({ proposal, onClose }: ProposalDetailProps) {
  if (!proposal) return null;

  const statusInfo = STATUS_MAP[proposal.status] || STATUS_MAP.pendente;
  const apiRes = proposal.api_response;

  const copyId = () => {
    navigator.clipboard.writeText(proposal.simulation_id || proposal.id);
    toast.success('ID copiado!');
  };

  return (
    <Sheet open={!!proposal} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left">Detalhes da Proposta</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Client */}
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-sm font-semibold">{proposal.client_name}</p>
              <p className="text-xs text-muted-foreground">CPF: {proposal.client_cpf}</p>
              <p className="text-xs text-muted-foreground">Operação: {proposal.operation_type}</p>
            </CardContent>
          </Card>

          {/* Simulation ID */}
          {proposal.simulation_id && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">ID Simulação</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {proposal.simulation_id}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyId}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Response Summary */}
          {apiRes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold mb-2">Resposta da API</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {apiRes.installmentValue != null && (
                    <div>
                      <span className="text-muted-foreground">Parcela</span>
                      <p className="font-bold text-primary">R$ {Number(apiRes.installmentValue).toFixed(2)}</p>
                    </div>
                  )}
                  {apiRes.loanValue != null && (
                    <div>
                      <span className="text-muted-foreground">Valor</span>
                      <p className="font-bold text-primary">R$ {Number(apiRes.loanValue).toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="text-[10px] text-muted-foreground cursor-pointer">JSON completo</summary>
                  <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                    {JSON.stringify(apiRes, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
