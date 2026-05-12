import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, HelpCircle, Calculator } from 'lucide-react';
import type { PayrollExplanation } from '@/lib/payrollExplain';
import { payrollFormat } from '@/lib/payrollExplain';

const { brl, formatDateBR } = payrollFormat;

interface PayrollBreakdownCardProps {
  title?: string;
  explanation: PayrollExplanation;
  periodLabel?: string;
}

function Term({ label, hint }: { label: string; hint: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2">
            {label}
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PayrollBreakdownCard({
  title = 'Resumo financeiro do mês',
  explanation: e,
  periodLabel,
}: PayrollBreakdownCardProps) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary" />
          {title}
          {periodLabel && (
            <Badge variant="outline" className="ml-2 font-normal">{periodLabel}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!e.scheduleConfigured && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              Sua jornada contratual não está cadastrada. Sem essa informação não dá
              para calcular o valor da sua hora — fale com o RH para regularizar.
            </span>
          </div>
        )}

        {/* Bloco base */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Salário base</div>
            <div className="text-lg font-bold">{brl(e.salary)}</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Term
                label="Jornada contratual"
                hint="Quantas horas por dia o seu contrato prevê (ex.: estagiário 6h, CLT 8h)."
              />
            </div>
            <div className="text-lg font-bold">
              {e.scheduleConfigured ? `${e.dailyHours}h por dia` : 'Não cadastrada'}
              {e.scheduleConfigured && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  · {e.businessDays}{' '}
                  <Term label="dias úteis" hint="Dias que você deveria trabalhar no mês (descontando finais de semana, feriados e folgas)." />
                  {' '}= {e.monthlyHours}h/mês
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Como calculamos */}
        {e.scheduleConfigured && (
          <div className="rounded-md border border-dashed p-3 space-y-2 bg-background">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Como calculamos seus valores</div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                <Term label="Valor/hora" hint="Quanto você ganha por cada hora trabalhada." />
              </div>
              <div className="font-mono text-xs">{e.formulaValorHora}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                <Term label="Valor/dia" hint="Quanto você ganha por cada dia integral trabalhado." />
              </div>
              <div className="font-mono text-xs">{e.formulaValorDia}</div>
            </div>
          </div>
        )}

        {/* Descontos */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Descontos do mês</div>

          <div className="rounded-md border p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">Faltas integrais</div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.formulaDescAbsences}</div>
              {e.absenceDates.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Datas: {e.formattedAbsenceDates}
                </div>
              )}
            </div>
            <div className="text-right font-bold text-red-600 whitespace-nowrap">
              {e.discountAbsences > 0 ? `– ${brl(e.discountAbsences)}` : brl(0)}
            </div>
          </div>

          <div className="rounded-md border p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                <Term
                  label="Horas negativas"
                  hint="Soma dos atrasos, saídas antecipadas e jornadas incompletas — exclui dias de falta integral."
                />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.formulaDescNegative}</div>
              {e.negativeDays.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1 max-h-24 overflow-y-auto">
                  {e.negativeDays.map((d, i) => (
                    <span key={d.date + i} className="inline-block mr-2">
                      {formatDateBR(d.date)}: {Math.round(d.minutes)}min
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right font-bold text-red-600 whitespace-nowrap">
              {e.discountNegativeHours > 0 ? `– ${brl(e.discountNegativeHours)}` : brl(0)}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="rounded-md bg-primary/5 border-2 border-primary/30 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total de descontos</span>
            <span className="font-bold text-red-700">– {brl(e.totalDiscount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Líquido estimado a receber</span>
            <span className="text-lg font-bold text-green-700">{brl(e.netEstimated)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground pt-1">
            * Estimativa baseada no espelho de ponto. Não inclui INSS, IRRF, vale-transporte, vale-refeição, benefícios e outros eventos da folha oficial.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
