import { useState } from "react";
import { Lead, PIPELINE_STAGES } from "../../leads-premium/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Phone, Info, DollarSign, Building } from "lucide-react";

interface ConvenioLeadProps {
  lead: Lead;
  onClick: () => void;
}

export function ConvenioLeadCard({ lead, onClick }: ConvenioLeadProps) {
  const formatMoney = (val?: number | null) => val ? `R$ ${val.toLocaleString('pt-BR')}` : 'R$ 0';
  
  return (
    <Card 
      className="group cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary bg-card"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg">{lead.name}</h3>
            <p className="text-sm text-muted-foreground">Matrícula: {lead.matricula || 'N/A'}</p>
          </div>
          <Badge variant="outline" className="text-xs uppercase bg-primary/5">{lead.convenio}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase">Margem Total</p>
            <p className="font-mono font-semibold text-sm">{formatMoney(lead.margem_total)}</p>
          </div>
          <div className="p-2 rounded bg-primary/5">
            <p className="text-[10px] text-primary/70 uppercase">Margem Disponível</p>
            <p className="font-mono font-bold text-sm text-primary">{formatMoney(lead.margem_disponivel)}</p>
          </div>
        </div>

        {lead.emprestimos && Array.isArray(lead.emprestimos) && lead.emprestimos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Empréstimos Ativos</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {lead.emprestimos.slice(0, 3).map((emp: any, i: number) => (
                <div key={i} className="shrink-0 w-32 p-2 rounded-lg border bg-background shadow-sm space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <Building className="h-3 w-3" /> {emp.banco || 'N/A'}
                  </div>
                  <p className="text-[10px]">{emp.parcelas_pagas || 0} / {emp.total_parcelas || 0} parcelas</p>
                  <p className="text-xs font-bold">{formatMoney(emp.valor_parcela)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
