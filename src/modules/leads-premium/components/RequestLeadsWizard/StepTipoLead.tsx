import { memo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProps, TIPOS_LEAD } from "./types";

export const StepTipoLead = memo(function StepTipoLead({ data, onUpdate }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Qual tipo de lead você procura?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione a categoria principal dos leads
        </p>
      </div>

      <div className="grid gap-3">
        {TIPOS_LEAD.map((tipo, index) => {
          const isSelected = data.tipoLead === tipo.id;
          
          return (
            <motion.button
              key={tipo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onUpdate({ tipoLead: tipo.id })}
              className={cn(
                "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-background"
              )}
            >
              <span className="text-3xl">{tipo.icon}</span>
              <div className="flex-1">
                <p className="font-semibold">{tipo.label}</p>
                <p className="text-sm text-muted-foreground">{tipo.description}</p>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="h-4 w-4 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
