import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Clock, ChevronRight } from 'lucide-react';
import { Proposal, STATUS_MAP } from '../types';
import { cn } from '@/lib/utils';

interface ProposalCardProps {
  proposal: Proposal;
  onClick: () => void;
}

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const statusInfo = STATUS_MAP[proposal.status] || STATUS_MAP.pendente;
  const date = new Date(proposal.created_at);
  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const maskedCPF = proposal.client_cpf
    ? `***${proposal.client_cpf.slice(3, 6)}.${proposal.client_cpf.slice(6, 9)}-**`
    : '---';

  return (
    <Card
      className="cursor-pointer active:scale-[0.98] transition-transform border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{proposal.client_name || 'Sem nome'}</p>
              <p className="text-xs text-muted-foreground">{maskedCPF}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {proposal.operation_type}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </div>
            <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
