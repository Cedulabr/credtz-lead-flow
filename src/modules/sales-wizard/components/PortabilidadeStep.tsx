import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRightLeft, Building2, FileText, HelpCircle, Wallet, ArrowRight } from "lucide-react";
import { WizardStepProps } from "../types";
import { StepHeader } from "./StepHeader";
import { FieldHint } from "./FieldHint";
import { CurrencyInput } from "./CurrencyInput";
import { useBanks } from "../hooks/useBanks";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function PortabilidadeStep({ data, onUpdate, onValidChange }: WizardStepProps) {
  const { banks, isLoading: loadingBanks } = useBanks();

  useEffect(() => {
    // Validação: Credora Original, Parcela Atual, Saldo Devedor e Proponente são obrigatórios
    const hasCredora = Boolean(data.credora_original);
    const hasParcelaAtual = Boolean(data.parcela_atual && data.parcela_atual > 0);
    const hasSaldoDevedor = Boolean(data.saldo_devedor_atual && data.saldo_devedor_atual > 0);
    const hasProponente = Boolean(data.banco_proponente);
    const hasNovaParcela = Boolean(data.nova_parcela && data.nova_parcela > 0);
    
    // Não pode ser o mesmo banco
    const bancosDiferentes = data.credora_original !== data.banco_proponente;
    
    onValidChange(hasCredora && hasParcelaAtual && hasSaldoDevedor && hasProponente && hasNovaParcela && bancosDiferentes);
  }, [data.credora_original, data.parcela_atual, data.saldo_devedor_atual, data.banco_proponente, data.nova_parcela, onValidChange]);

  const isSameBank = data.credora_original && data.banco_proponente && data.credora_original === data.banco_proponente;

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={3}
        title="Detalhes da Portabilidade"
        subtitle="Preencha os dados do contrato atual e do novo contrato"
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
                {/* Credora Original */}
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
                  <Select
                    value={data.credora_original || ""}
                    onValueChange={(credora_original) => onUpdate({ credora_original })}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione o banco atual do cliente" />
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
                  <p className="text-xs text-muted-foreground">
                    💬 "Em qual banco você está pagando seu empréstimo atual?"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Número do Contrato */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Nº Contrato
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Número do contrato atual (opcional, mas ajuda a identificar)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      value={data.numero_contrato_atual || ""}
                      onChange={(e) => onUpdate({ numero_contrato_atual: e.target.value })}
                      placeholder="Ex: 123456789"
                      className="h-12 text-base"
                    />
                  </div>

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
                      placeholder="Ex: 36 meses"
                      className="h-12 text-base"
                      min={1}
                      max={120}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      💬 "Quanto você paga de parcela hoje?"
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
                      💬 "Quanto você ainda deve no contrato atual?"
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

          {/* BLOCO 2: NOVO CONTRATO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-green-200 bg-green-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                  <Building2 className="h-5 w-5" />
                  🆕 NOVO CONTRATO
                  <span className="text-sm font-normal text-green-600 ml-2">
                    (Banco para onde vai portar)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Banco Proponente */}
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
                      <SelectValue placeholder="Selecione o novo banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingBanks ? (
                        <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                      ) : (
                        banks.map((bank) => (
                          <SelectItem 
                            key={bank.id} 
                            value={bank.name} 
                            className="text-base"
                            disabled={bank.name === data.credora_original}
                          >
                            {bank.name} {bank.name === data.credora_original && "(já é a credora)"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isSameBank && (
                    <p className="text-xs text-destructive">
                      ⚠️ O banco proponente não pode ser o mesmo da credora original!
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    💬 "Para qual banco vamos portar o contrato?"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Novo Prazo */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      Novo Prazo
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prazo do novo contrato em meses</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      value={data.novo_prazo || ""}
                      onChange={(e) => onUpdate({ novo_prazo: parseInt(e.target.value) || undefined })}
                      placeholder="Ex: 84 meses"
                      className="h-12 text-base"
                      min={1}
                      max={120}
                    />
                  </div>

                  {/* Nova Parcela */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Nova Parcela
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <CurrencyInput
                      value={data.nova_parcela}
                      onChange={(nova_parcela) => {
                        onUpdate({ nova_parcela });
                        // Também atualiza o campo "parcela" para compatibilidade
                        onUpdate({ parcela: nova_parcela });
                      }}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      💬 "Qual será a nova parcela?"
                    </p>
                  </div>
                </div>

                {/* Troco */}
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    Troco (valor que o cliente recebe)
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Valor que sobra para o cliente após quitar o saldo devedor. É o dinheiro extra que ele recebe na conta.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <CurrencyInput
                    value={data.troco}
                    onChange={(troco) => onUpdate({ troco })}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    💰 "Quanto vai sobrar para o cliente na conta?"
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </TooltipProvider>

      {/* Resumo Visual */}
      {data.credora_original && data.banco_proponente && data.parcela_atual && data.nova_parcela && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Parcela Atual</p>
                  <p className="font-bold text-lg text-amber-600">
                    R$ {data.parcela_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.credora_original}</p>
                </div>
                <ArrowRight className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="text-muted-foreground">Nova Parcela</p>
                  <p className="font-bold text-lg text-green-600">
                    R$ {data.nova_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.banco_proponente}</p>
                </div>
                {data.troco && data.troco > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="text-center">
                      <p className="text-muted-foreground">Troco</p>
                      <p className="font-bold text-lg text-blue-600">
                        R$ {data.troco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">para o cliente</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.credora_original && data.banco_proponente && data.parcela_atual && data.saldo_devedor_atual && data.nova_parcela && !isSameBank && (
        <FieldHint type="success">
          ✅ Portabilidade configurada! Vamos revisar tudo na próxima etapa.
        </FieldHint>
      )}
    </div>
  );
}
