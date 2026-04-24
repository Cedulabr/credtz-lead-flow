import { memo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProps, TIPOS_LEAD } from "./types";

export const StepTipoLead = memo(function StepTipoLead({ data, onUpdate }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-base font-semibold">Qual convênio você quer trabalhar?</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione o convênio principal dos leads
        </p>
      </div>

      <div className="grid gap-2.5">
        {TIPOS_LEAD.map((tipo, index) => {
          const isSelected = data.tipoLead === tipo.id;

          return (
            <motion.button
              key={tipo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => {
                // Ao trocar de tipo, limpa filtros incompatíveis para evitar lixo de estado
                if (tipo.id === 'servidor') {
                  onUpdate({ tipoLead: tipo.id, ddds: [], tags: [], requireTelefone: null });
                } else {
                  onUpdate({
                    tipoLead: tipo.id,
                    uf: null,
                    banco: null,
                    parcelaMin: null,
                    parcelaMax: null,
                    margemMin: null,
                    parcelasPagasMin: null,
                  });
                }
              }}
              className={cn(
                "relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-background"
              )}
            >
              <span className="text-2xl shrink-0">{tipo.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{tipo.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{tipo.description}</p>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
