import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRightLeft, Building2, HelpCircle, Wallet, ArrowRight, DollarSign, Lock } from "lucide-react";
import { WizardStepProps } from "../types";
import { StepHeader } from "./StepHeader";
import { FieldHint } from "./FieldHint";
import { CurrencyInput } from "./CurrencyInput";
import { useBanks } from "../hooks/useBanks";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function PortabilidadeStep({ data, onUpdate, onValidChange, moduloOrigem }: WizardStepProps) {
  const { banks, isLoading: loadingBanks } = useBanks();

  const filteredBanks = moduloOrigem === 'portflow'
    ? banks.filter(b => 
        b.name.toUpperCase().includes('BRB') || 
        b.name.toUpperCase().includes('AGIBANK')
      )
    : banks;

  const isAgibankProponente = (data.banco_proponente || "").toUpperCase().includes("AGIBANK");
  const isPortFlowModule = moduloOrigem === 'portflow';

  useEffect(() => {
    // Block if Agibank selected as proponente (unless PortFlow module)
    if (isAgibankProponente && !isPortFlowModule) {
      onValidChange(false);
      return;
    }

    const hasCredora = Boolean(data.credora_original && data.credora_original.trim());
    const hasParcelaAtual = Boolean(data.parcela_atual && data.parcela_atual > 0);
    const hasSaldoDevedor = Boolean(data.saldo_devedor_atual && data.saldo_devedor_atual > 0);
    const hasProponente = Boolean(data.banco_proponente);
    
    const bancosDiferentes = !data.credora_original || !data.banco_proponente || 
      data.credora_original.toLowerCase() !== data.banco_proponente.toLowerCase();
    
    onValidChange(hasCredora && hasParcelaAtual && hasSaldoDevedor && hasProponente && bancosDiferentes);
  }, [data.credora_original, data.parcela_atual, data.saldo_devedor_atual, data.banco_proponente, isAgibankProponente, isPortFlowModule, onValidChange]);

  const isSameBank = data.credora_original && data.banco_proponente && 
    data.credora_original.toLowerCase() === data.banco_proponente.toLowerCase();

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={3}
        title="Detalhes da Portabilidade"
        subtitle="Preencha os dados do contrato atual e do novo banco"
        icon={<ArrowRightLeft className="h-5 w-5" />}
      />

      <FieldHint type="tip">
        💡 <strong>Na Portabilidade, existem 2 bancos:</strong> o banco onde o cliente TEM o contrato (Credora) e o banco para onde VAI portar (Proponente).
      </FieldHint>

      <TooltipProvider>
        <div className="grid gap-6">
          {/* BLOCO 1: CONTRATO ATUAL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
                  <Wallet className="h-5 w-5" />
                  🏦 CONTRATO ATUAL
                  <span className="text-sm font-normal text-amber-600 ml-2">
                    (Banco onde o cliente paga hoje)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Credora Original - Campo aberto para digitação */}
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Credora Original
                    <span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>O banco onde o cliente tem o contrato HOJE. Pergunte: "Em qual banco você está pagando atualmente?"</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={data.credora_original || ""}
                    onChange={(e) => onUpdate({ credora_original: e.target.value.toUpperCase() })}
                    placeholder="Digite o nome do banco (ex: BRADESCO, ITAÚ, BMG...)"
                    className="h-12 text-base uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    💬 "Em qual banco você está pagando seu empréstimo atual?"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Prazo Restante */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      Prazo Restante
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Quantas parcelas ainda faltam pagar</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      value={data.prazo_restante || ""}
                      onChange={(e) => onUpdate({ prazo_restante: parseInt(e.target.value) || undefined })}
                      placeholder="Ex: 36"
                      className="h-12 text-base"
                      min={1}
                      max={120}
                    />
                    <p className="text-xs text-muted-foreground">meses</p>
                  </div>

                  {/* Parcela Atual */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Parcela Atual
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <CurrencyInput
                      value={data.parcela_atual}
                      onChange={(parcela_atual) => onUpdate({ parcela_atual })}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      💬 "Quanto você paga de parcela?"
                    </p>
                  </div>

                  {/* Saldo Devedor */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Saldo Devedor
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <CurrencyInput
                      value={data.saldo_devedor_atual}
                      onChange={(saldo_devedor_atual) => onUpdate({ saldo_devedor_atual })}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      💬 "Quanto ainda deve?"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* SETA DE TRANSIÇÃO */}
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-primary"
            >
              <ArrowRight className="h-6 w-6" />
              <span className="text-sm font-medium">Vai portar para</span>
              <ArrowRight className="h-6 w-6" />
            </motion.div>
          </div>

          {/* BLOCO 2: NOVO BANCO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-green-200 bg-green-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                  <Building2 className="h-5 w-5" />
                  🆕 BANCO PROPONENTE
                  <span className="text-sm font-normal text-green-600 ml-2">
                    (Banco para onde vai portar)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Banco Proponente - Select do banco de dados */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Banco Proponente
                      <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>O banco que VAI RECEBER o contrato. É o banco novo onde o cliente vai passar a pagar.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={data.banco_proponente || ""}
                      onValueChange={(banco_proponente) => {
                        onUpdate({ banco_proponente });
                        // Também atualiza o campo "banco" para compatibilidade
                        onUpdate({ banco: banco_proponente });
                      }}
                    >
                      <SelectTrigger className={`h-12 text-base ${isSameBank ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingBanks ? (
                          <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                        ) : (
                          filteredBanks.map((bank) => (
                            <SelectItem 
                              key={bank.id} 
                              value={bank.name} 
                              className="text-base"
                            >
                              {bank.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {isSameBank && (
                      <p className="text-xs text-destructive">
                        ⚠️ O proponente não pode ser igual à credora!
                      </p>
                    )}
                  </div>

                  {/* Troco */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Troco
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Valor que sobra para o cliente após quitar o saldo devedor.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <CurrencyInput
                      value={data.troco}
                      onChange={(troco) => onUpdate({ troco })}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      💰 Valor que o cliente recebe na conta
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </TooltipProvider>

      {/* Agibank Block Overlay */}
      {isAgibankProponente && !isPortFlowModule && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-2 border-destructive/50 bg-destructive/5">
            <CardContent className="py-8 flex flex-col items-center text-center gap-4">
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
                onClick={() => {
                  onUpdate({ banco_proponente: undefined, banco: undefined });
                }}
                className="px-6 py-2 rounded-lg border border-muted-foreground/30 text-sm font-medium hover:bg-muted transition-colors"
              >
                ← Voltar e escolher outro banco
              </button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Resumo Visual */}
      {data.credora_original && data.banco_proponente && data.parcela_atual && !isAgibankProponente && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Credora</p>
                  <p className="font-bold text-amber-600">{data.credora_original}</p>
                  <p className="text-sm">R$ {data.parcela_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <ArrowRight className="h-6 w-6 text-primary" />
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Proponente</p>
                  <p className="font-bold text-green-600">{data.banco_proponente}</p>
                </div>
                {data.troco && data.troco > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Troco</p>
                      <p className="font-bold text-lg text-blue-600">
                        R$ {data.troco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
