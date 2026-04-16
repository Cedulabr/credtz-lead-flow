import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Building2, Lock } from "lucide-react";
import { WizardStepProps, PRODUCT_OPTIONS } from "../types";
import { StepHeader } from "./StepHeader";
import { FieldHint } from "./FieldHint";
import { CurrencyInput } from "./CurrencyInput";
import { useBanks } from "../hooks/useBanks";
import { motion } from "framer-motion";

export function ValuesStep({ data, onUpdate, onValidChange }: WizardStepProps) {
  const { banks, isLoading: loadingBanks } = useBanks();
  
  const selectedProduct = PRODUCT_OPTIONS.find(p => p.value === data.tipo_operacao);
  const requiresSaldoDevedor = selectedProduct?.requiresSaldoDevedor || false;
  const isAgibankPortabilidade = data.tipo_operacao === "Portabilidade" && (data.banco || "").toUpperCase().includes("AGIBANK");

  useEffect(() => {
    if (isAgibankPortabilidade) {
      onValidChange(false);
      return;
    }
    const hasBank = Boolean(data.banco);
    const hasParcela = Boolean(data.parcela && data.parcela > 0);
    const hasSaldoIfRequired = !requiresSaldoDevedor || Boolean(data.saldo_devedor && data.saldo_devedor > 0);
    
    onValidChange(hasBank && hasParcela && hasSaldoIfRequired);
  }, [data.banco, data.parcela, data.saldo_devedor, requiresSaldoDevedor, isAgibankPortabilidade, onValidChange]);

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={3}
        title="Valores da Operação"
        subtitle="Preencha os valores negociados com o cliente"
        icon={<DollarSign className="h-5 w-5" />}
      />

      <FieldHint type="tip">
        💡 <strong>Lembre-se:</strong> Confirme os valores com o cliente antes de preencher. "O valor da parcela ficou R$ X, está certo?"
      </FieldHint>

      <motion.div 
        className="grid gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Banco Selection */}
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Banco
          </Label>
          <Select
            value={data.banco || ""}
            onValueChange={(banco) => onUpdate({ banco })}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {loadingBanks ? (
                <SelectItem value="_loading" disabled>Carregando...</SelectItem>
              ) : (
                banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.name} className="text-base">
                    {bank.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Parcela */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Valor da Parcela</Label>
          <CurrencyInput
            value={data.parcela}
            onChange={(parcela) => onUpdate({ parcela })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            💬 "Quanto vai ficar a parcela mensal do cliente?"
          </p>
        </div>

        {/* Saldo Devedor - conditional */}
        {requiresSaldoDevedor && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Label className="text-base font-medium">
              Saldo Devedor
              <span className="text-destructive ml-1">*</span>
            </Label>
            <CurrencyInput
              value={data.saldo_devedor}
              onChange={(saldo_devedor) => onUpdate({ saldo_devedor })}
              placeholder="0,00"
            />
            <FieldHint type="warning">
              ⚠️ <strong>Obrigatório para {data.tipo_operacao}!</strong> Pergunte ao cliente: "Quanto você deve no banco atual?"
            </FieldHint>
          </motion.div>
        )}

        {/* Troco - optional */}
        <div className="space-y-2">
          <Label className="text-base font-medium">
            Troco (opcional)
          </Label>
          <CurrencyInput
            value={data.troco}
            onChange={(troco) => onUpdate({ troco })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            💰 Valor que sobra para o cliente receber na conta
          </p>
        </div>
      </motion.div>

      {/* Agibank Portabilidade Block */}
      {isAgibankPortabilidade && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border-2 border-destructive/50 bg-destructive/5 p-6 flex flex-col items-center text-center gap-4"
        >
          <div className="p-4 rounded-full bg-destructive/10">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-destructive">Módulo PortFlow Necessário</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Para portabilidade com Agibank, adquira o módulo <strong>PortFlow</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdate({ banco: undefined })}
            className="px-6 py-2 rounded-lg border border-muted-foreground/30 text-sm font-medium hover:bg-muted transition-colors"
          >
            ← Voltar e escolher outro banco
          </button>
        </motion.div>
      )}

      {data.banco && data.parcela && (!requiresSaldoDevedor || data.saldo_devedor) && !isAgibankPortabilidade && (
        <FieldHint type="success">
          ✅ Valores preenchidos! Vamos revisar tudo na próxima etapa.
        </FieldHint>
      )}
    </div>
  );
}
