import { memo } from "react";
import { motion } from "framer-motion";
import { Users, Check, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StepProps, PRIORIDADES } from "./types";

interface StepQuantidadeProps extends StepProps {
  userCredits: number;
}

const QUANTIDADES = [5, 10, 20, 50, 100];

export const StepQuantidade = memo(function StepQuantidade({ 
  data, 
  onUpdate,
  userCredits 
}: StepQuantidadeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Quantos leads você precisa?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Você tem <span className="font-semibold text-primary">{userCredits}</span> créditos disponíveis
        </p>
      </div>

      {/* Créditos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20"
      >
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Seus créditos</p>
          <p className="text-2xl font-bold text-primary">{userCredits}</p>
        </div>
      </motion.div>

      {/* Quantidade - Quick Select */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Quantidade
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {QUANTIDADES.map((num) => {
            const isSelected = data.quantidade === num;
            const isDisabled = num > userCredits;
            
            return (
              <button
                key={num}
                onClick={() => !isDisabled && onUpdate({ quantidade: num })}
                disabled={isDisabled}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isDisabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-background",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                )}
              >
                <span className="text-xl font-bold">{num}</span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-muted-foreground">Ou digite:</span>
          <Input
            type="number"
            value={data.quantidade}
            onChange={(e) => {
              const val = Math.min(Number(e.target.value) || 1, userCredits);
              onUpdate({ quantidade: val });
            }}
            min={1}
            max={userCredits}
            className="w-24 h-10 text-center"
          />
          <span className="text-sm text-muted-foreground">leads</span>
        </div>
      </motion.div>

      {/* Prioridade */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <Label className="text-sm font-medium">Prioridade de seleção</Label>
        <div className="grid gap-2">
          {PRIORIDADES.map((p) => {
            const isSelected = data.prioridade === p.id;
            
            return (
              <button
                key={p.id}
                onClick={() => onUpdate({ prioridade: p.id as any })}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                )}
              >
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
});
