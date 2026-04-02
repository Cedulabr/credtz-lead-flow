import { AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OverdueLead {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
  status: string;
  hoursOverdue: number;
}

interface ActivateOverdueBannerProps {
  overdueLeads: OverdueLead[];
  onLeadClick?: (leadId: string) => void;
}

export function ActivateOverdueBanner({ overdueLeads, onLeadClick }: ActivateOverdueBannerProps) {
  if (overdueLeads.length === 0) return null;

  return (
    <div className="w-full bg-destructive/10 border-2 border-destructive rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-destructive">
            🚫 Leads Vencidos — Novas ações bloqueadas
          </h3>
          <p className="text-sm text-destructive/80 mt-1">
            Você possui {overdueLeads.length} lead(s) que ultrapassaram o prazo de 48h sem tratamento.
            Trate todos os leads abaixo para desbloquear novas solicitações.
          </p>

          <div className="mt-3 space-y-2">
            {overdueLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => onLeadClick?.(lead.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-destructive">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">
                      {Math.floor(lead.hoursOverdue)}h vencido
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
