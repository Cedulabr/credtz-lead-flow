import { memo } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, Building2, Tag, Users, Clock, Sparkles, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { StepProps, TIPOS_LEAD, PRIORIDADES } from "./types";

interface StepResumoProps extends StepProps {
  onGoToStep: (step: number) => void;
  userCredits: number;
}

export const StepResumo = memo(function StepResumo({ 
  data, 
  onGoToStep,
  userCredits 
}: StepResumoProps) {
  const tipoLead = TIPOS_LEAD.find(t => t.id === data.tipoLead);
  const prioridade = PRIORIDADES.find(p => p.id === data.prioridade);
  const creditosRestantes = userCredits - data.quantidade;

  const items = [
    {
      icon: Sparkles,
      label: "Tipo de Lead",
      value: tipoLead ? `${tipoLead.icon} ${tipoLead.label}` : "Todos os tipos",
      step: 0,
      hasValue: !!data.tipoLead
    },
    {
      icon: Building2,
      label: "Convênio",
      value: data.convenio || "Todos os convênios",
      step: 1,
      hasValue: !!data.convenio
    },
    {
      icon: MapPin,
      label: "Regiões (DDD)",
      value: data.ddds.length > 0 
        ? data.ddds.join(", ") 
        : "Todas as regiões",
      step: 1,
      hasValue: data.ddds.length > 0
    },
    {
      icon: Tag,
      label: "Tags",
      value: data.tags.length > 0 
        ? data.tags.join(", ") 
        : "Sem filtro de tags",
      step: 1,
      hasValue: data.tags.length > 0
    },
    {
      icon: Users,
      label: "Quantidade",
      value: `${data.quantidade} leads`,
      step: 2,
      hasValue: true
    },
    {
      icon: Clock,
      label: "Prioridade",
      value: prioridade?.label || "Mais Recentes",
      step: 2,
      hasValue: true
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Revise seu pedido</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Confira os filtros antes de confirmar
        </p>
      </div>

      {/* Lista de Resumo */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/30 rounded-xl border p-4 space-y-3"
      >
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              item.hasValue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn(
                "text-sm font-medium truncate",
                !item.hasValue && "text-muted-foreground"
              )}>
                {item.value}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onGoToStep(item.step)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <Separator />

      {/* Resumo de Créditos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/5 rounded-xl border border-primary/20 p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Créditos atuais</span>
          <span className="font-semibold">{userCredits}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Leads solicitados</span>
          <span className="font-semibold text-primary">-{data.quantidade}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Créditos restantes</span>
          <Badge variant={creditosRestantes >= 0 ? "default" : "destructive"}>
            {creditosRestantes}
          </Badge>
        </div>
      </motion.div>

      {creditosRestantes < 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-destructive text-center"
        >
          Você não tem créditos suficientes. Reduza a quantidade.
        </motion.p>
      )}
    </div>
  );
});
