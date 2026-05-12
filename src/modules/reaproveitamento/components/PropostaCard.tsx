import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Eye, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBar } from "./ScoreBar";
import { avatarColor, brl, daysSince, initials } from "../utils/avatarColor";
import type { PropostaCancelada } from "../types";

interface Props {
  proposta: PropostaCancelada;
  onReativar: (p: PropostaCancelada) => void;
  onView: (p: PropostaCancelada) => void;
  isReativating: boolean;
}

export function PropostaCard({ proposta, onReativar, onView, isReativating }: Props) {
  const score = proposta.reativacao_score ?? 0;
  const isHot = score >= 80;
  const dias = daysSince(proposta.data_cancelamento ?? proposta.created_at);
  const valor = Number(proposta.troco ?? proposta.saldo_devedor ?? 0);

  return (
    <Card
      className={cn(
        "p-4 flex flex-col md:flex-row md:items-center gap-4 transition-shadow hover:shadow-md",
        isHot && "border-l-[3px] border-l-emerald-600",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
          style={{ backgroundColor: avatarColor(proposta.nome) }}
        >
          {initials(proposta.nome)}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold truncate">{proposta.nome}</span>
            {proposta.banco && (
              <span className="text-xs text-muted-foreground truncate">· {proposta.banco}</span>
            )}
          </div>

          {proposta.tipo_operacao && (
            <div className="text-xs text-muted-foreground">{proposta.tipo_operacao}</div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="secondary" className="text-[10px]">
              {dias}d cancelada
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {brl(valor)}
            </Badge>
            {proposta.tipo_operacao && (
              <Badge variant="outline" className="text-[10px]">
                {proposta.tipo_operacao}
              </Badge>
            )}
          </div>

          {proposta.motivo_cancelamento && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate">{proposta.motivo_cancelamento}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 md:gap-2 shrink-0">
        <ScoreBar score={proposta.reativacao_score} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onView(proposta)}>
            <Eye className="h-4 w-4 mr-1" /> Ver
          </Button>
          <Button
            size="sm"
            onClick={() => onReativar(proposta)}
            disabled={isReativating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isReativating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Reativando...
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4 mr-1" /> Reativar
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
