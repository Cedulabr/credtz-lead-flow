import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, User, ShoppingCart, DollarSign, Calendar, Building2, ArrowRightLeft, Wallet, ArrowRight } from "lucide-react";
import { WizardStepProps, PRODUCT_OPTIONS } from "../types";
import { StepHeader } from "./StepHeader";
import { FieldHint } from "./FieldHint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ConfirmStep({ data, onUpdate, onValidChange }: WizardStepProps) {
  useEffect(() => {
    // Always valid - observation is optional
    onValidChange(true);
  }, [onValidChange]);

  const selectedProduct = PRODUCT_OPTIONS.find(p => p.value === data.tipo_operacao);

  const formatCurrency = (value: number | undefined) => {
    if (!value) return "—";
    return value.toLocaleString("pt-BR", { 
      style: "currency", 
      currency: "BRL" 
    });
  };

  const formatCPF = (cpf: string | undefined) => {
    if (!cpf || cpf.length !== 11) return cpf || "—";
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  const formatPhone = (phone: string | undefined) => {
    if (!phone || phone.length < 10) return phone || "—";
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  };

  const isPortabilidade = data.tipo_operacao === "Portabilidade";

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={4}
        title="Confirmar Venda"
        subtitle="Revise todos os dados antes de finalizar"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />

      <FieldHint type="warning">
        ⚠️ <strong>Atenção:</strong> Confirme todos os dados com o cliente antes de clicar em "Finalizar"!
      </FieldHint>

      <Card className="border-2 border-dashed">
        <CardContent className="p-6 space-y-6">
          {/* Client Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              DADOS DO CLIENTE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-6">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{data.nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-mono">{formatCPF(data.cpf)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-mono">{formatPhone(data.telefone)}</p>
              </div>
            </div>
          </motion.div>

          <Separator />

          {/* Product Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              PRODUTO
            </div>
            <div className="pl-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedProduct?.icon}</span>
                <div>
                  <p className="font-semibold text-lg">{selectedProduct?.label}</p>
                  <p className="text-sm text-muted-foreground">{selectedProduct?.description}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <Separator />

          {/* Values Section - Condicional por tipo de produto */}
          {isPortabilidade ? (
            /* SEÇÃO PORTABILIDADE */
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4" />
                DETALHES DA PORTABILIDADE
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                {/* Contrato Atual */}
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                      <Wallet className="h-4 w-4" />
                      CONTRATO ATUAL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Credora Original</p>
                      <p className="font-medium">{data.credora_original || "—"}</p>
                    </div>
                    {data.numero_contrato_atual && (
                      <div>
                        <p className="text-xs text-muted-foreground">Nº Contrato</p>
                        <p className="font-mono text-sm">{data.numero_contrato_atual}</p>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Parcela Atual</p>
                        <p className="font-semibold text-amber-600">{formatCurrency(data.parcela_atual)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo Devedor</p>
                        <p className="font-medium">{formatCurrency(data.saldo_devedor_atual)}</p>
                      </div>
                    </div>
                    {data.prazo_restante && (
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo Restante</p>
                        <p className="font-medium">{data.prazo_restante} meses</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Novo Contrato */}
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                      <Building2 className="h-4 w-4" />
                      NOVO CONTRATO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Banco Proponente</p>
                      <p className="font-medium">{data.banco_proponente || "—"}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Nova Parcela</p>
                        <p className="font-semibold text-lg text-green-600">{formatCurrency(data.nova_parcela)}</p>
                      </div>
                      {data.novo_prazo && (
                        <div>
                          <p className="text-xs text-muted-foreground">Novo Prazo</p>
                          <p className="font-medium">{data.novo_prazo} meses</p>
                        </div>
                      )}
                    </div>
                    {data.troco && data.troco > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">💰 Troco</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(data.troco)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Resumo Visual da Economia */}
              {data.parcela_atual && data.nova_parcela && (
                <div className="pl-6">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Paga hoje</p>
                          <p className="font-bold text-amber-600">{formatCurrency(data.parcela_atual)}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Vai pagar</p>
                          <p className="font-bold text-green-600">{formatCurrency(data.nova_parcela)}</p>
                        </div>
                        {data.parcela_atual > data.nova_parcela && (
                          <>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">Economia</p>
                              <p className="font-bold text-primary">
                                {formatCurrency(data.parcela_atual - data.nova_parcela)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          ) : (
            /* SEÇÃO VALORES PADRÃO (não-portabilidade) */
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                VALORES
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-6">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Banco
                  </p>
                  <p className="font-medium">{data.banco || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parcela</p>
                  <p className="font-semibold text-lg text-primary">{formatCurrency(data.parcela)}</p>
                </div>
                {data.saldo_devedor && (
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Devedor</p>
                    <p className="font-medium">{formatCurrency(data.saldo_devedor)}</p>
                  </div>
                )}
                {data.troco && (
                  <div>
                    <p className="text-xs text-muted-foreground">Troco</p>
                    <p className="font-medium text-green-600">{formatCurrency(data.troco)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <Separator />

          {/* Date */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-sm text-muted-foreground pl-6"
          >
            <Calendar className="h-4 w-4" />
            Data da Venda: <span className="font-medium text-foreground">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </motion.div>
        </CardContent>
      </Card>

      {/* Observation */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Observações (opcional)
        </Label>
        <Textarea
          value={data.observacao || ""}
          onChange={(e) => onUpdate({ observacao: e.target.value })}
          placeholder="Alguma informação adicional sobre a venda..."
          className="min-h-[80px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          📝 Aqui você pode anotar informações importantes sobre o cliente ou a negociação
        </p>
      </div>

      <FieldHint type="success">
        🎉 Tudo pronto! Clique em <strong>"Finalizar"</strong> para registrar a venda.
      </FieldHint>
    </div>
  );
}
