import { useEffect } from "react";
import { WizardStepProps, PRODUCT_OPTIONS } from "../types";
import { StepHeader } from "./StepHeader";
import { FieldHint } from "./FieldHint";
import { ShoppingCart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ProductStep({ data, onUpdate, onValidChange }: WizardStepProps) {
  useEffect(() => {
    onValidChange(Boolean(data.tipo_operacao));
  }, [data.tipo_operacao, onValidChange]);

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={2}
        title="Qual produto o cliente quer?"
        subtitle="Escolha o tipo de operação que o cliente deseja realizar"
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      <FieldHint type="tip">
        💡 <strong>Pergunte ao cliente:</strong> "Você quer um empréstimo novo ou está querendo trazer de outro banco?"
      </FieldHint>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRODUCT_OPTIONS.map((product, index) => {
          const isSelected = data.tipo_operacao === product.value;
          
          return (
            <motion.button
              key={product.value}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onUpdate({ tipo_operacao: product.value as any })}
              className={cn(
                "relative p-5 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                isSelected 
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                  : "border-muted hover:border-primary/50"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <span className="text-3xl">{product.icon}</span>
                <div className="flex-1">
                  <h3 className={cn(
                    "font-semibold text-lg mb-1",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {product.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {data.tipo_operacao && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          {data.tipo_operacao === "Portabilidade" && (
            <FieldHint type="info">
              📋 Na <strong>Portabilidade</strong>, você vai precisar do saldo devedor do contrato atual. Pergunte: "Quanto está devendo no banco atual?"
            </FieldHint>
          )}
          {data.tipo_operacao === "Refinanciamento" && (
            <FieldHint type="info">
              📋 No <strong>Refinanciamento</strong>, o cliente renegocia o contrato atual. Pergunte: "Qual o valor que você está pagando hoje?"
            </FieldHint>
          )}
          {data.tipo_operacao === "Novo empréstimo" && (
            <FieldHint type="success">
              ✅ <strong>Novo empréstimo</strong> é o mais simples! Vamos ver os valores na próxima etapa.
            </FieldHint>
          )}
          {data.tipo_operacao === "Cartão" && (
            <FieldHint type="info">
              💳 O <strong>Cartão Consignado</strong> tem limite baseado na margem. Verifique a margem do cliente!
            </FieldHint>
          )}
        </motion.div>
      )}
    </div>
  );
}
