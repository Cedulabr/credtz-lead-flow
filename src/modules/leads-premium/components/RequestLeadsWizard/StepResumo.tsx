import { memo } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, Building2, Tag, Users, Clock, Sparkles, Edit2, Phone, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { StepProps, TIPOS_LEAD, PRIORIDADES, UF_NOMES } from "./types";

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
  const isServidor = data.tipoLead === 'servidor';

  // Resumo de filtros de contrato
  const contratoParts: string[] = [];
  if (data.banco) contratoParts.push(`Banco: ${data.banco}`);
  if (data.parcelaMin !== null || data.parcelaMax !== null) {
    contratoParts.push(`Parcela: R$ ${data.parcelaMin ?? 0} – R$ ${data.parcelaMax ?? 2000}`);
  }
  if (data.margemMin !== null) contratoParts.push(`Margem mín: R$ ${data.margemMin}`);
  if (data.parcelasPagasMin !== null) contratoParts.push(`Parcelas pagas mín: ${data.parcelasPagasMin}`);

  const items: { icon: any; label: string; value: string; step: number; hasValue: boolean; show: boolean }[] = [
    {
      icon: Sparkles,
      label: "Convênio",
      value: tipoLead ? `${tipoLead.icon} ${tipoLead.label}` : "—",
      step: 0,
      hasValue: !!data.tipoLead,
      show: true,
    },
    {
      icon: MapPin,
      label: "Estado",
      value: data.uf ? `${UF_NOMES[data.uf] || data.uf} (${data.uf})` : "—",
      step: 1,
      hasValue: !!data.uf,
      show: isServidor,
    },
    {
      icon: MapPin,
      label: "Regiões (DDD)",
      value: data.ddds.length > 0 ? data.ddds.join(", ") : "Todas",
      step: 1,
      hasValue: data.ddds.length > 0,
      show: !isServidor,
    },
    {
      icon: Tag,
      label: "Tags",
      value: data.tags.length > 0 ? data.tags.join(", ") : "Nenhuma",
      step: 1,
      hasValue: data.tags.length > 0,
      show: !isServidor,
    },
    {
      icon: FileText,
      label: "Filtros de contrato",
      value: contratoParts.length > 0 ? contratoParts.join(" • ") : "Padrão",
      step: 1,
      hasValue: contratoParts.length > 0,
      show: isServidor,
    },
    {
      icon: Phone,
      label: "Leads com telefone",
      value: isServidor
        ? "Não aplicável"
        : data.requireTelefone === true
          ? "Sim"
          : data.requireTelefone === false
            ? "Não"
            : "—",
      step: 1,
      hasValue: data.requireTelefone !== null && !isServidor,
      show: true,
    },
    {
      icon: Users,
      label: "Quantidade",
      value: `${data.quantidade} leads`,
      step: 2,
      hasValue: true,
      show: true,
    },
    {
      icon: Clock,
      label: "Prioridade",
      value: prioridade?.label || "Mais Recentes",
      step: 2,
      hasValue: true,
      show: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Check className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Revise seu pedido</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Confira os filtros antes de confirmar
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/30 rounded-xl border p-3 space-y-2.5"
      >
        {items.filter(i => i.show).map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-3"
          >
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              item.hasValue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-primary/5 rounded-xl border border-primary/20 p-3"
      >
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="text-muted-foreground">Créditos atuais</span>
          <span className="font-semibold">{userCredits}</span>
        </div>
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="text-muted-foreground">Leads solicitados</span>
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
        <p className="text-sm text-destructive text-center">
          Você não tem créditos suficientes. Reduza a quantidade.
        </p>
      )}
    </div>
  );
});

// Backwards-compat building blocks (Building2 import retained even if unused above)
void Building2;
