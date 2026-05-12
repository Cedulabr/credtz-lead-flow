import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, RotateCw, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScoreBar } from "./ScoreBar";
import { brl, daysSince } from "../utils/avatarColor";
import { useRecalcularScore } from "../hooks/useReaproveitamento";
import type { PropostaCancelada } from "../types";

interface Props {
  proposta: PropostaCancelada | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReativar: (p: PropostaCancelada) => void;
  isReativating: boolean;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function PropostaDrawer({ proposta, open, onOpenChange, onReativar, isReativating }: Props) {
  const recalc = useRecalcularScore();

  if (!proposta) return null;
  const valor = Number(proposta.troco ?? proposta.saldo_devedor ?? 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-3">
          <SheetTitle>Detalhes da proposta</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Cliente</h3>
            <dl className="text-sm grid grid-cols-3 gap-y-1.5">
              <dt className="text-muted-foreground">Nome</dt><dd className="col-span-2">{proposta.nome}</dd>
              <dt className="text-muted-foreground">CPF</dt><dd className="col-span-2">{proposta.cpf || "—"}</dd>
              <dt className="text-muted-foreground">Telefone</dt><dd className="col-span-2">{proposta.telefone || "—"}</dd>
            </dl>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-2">Proposta</h3>
            <dl className="text-sm grid grid-cols-3 gap-y-1.5">
              <dt className="text-muted-foreground">Banco</dt><dd className="col-span-2">{proposta.banco || "—"}</dd>
              <dt className="text-muted-foreground">Operação</dt><dd className="col-span-2">{proposta.tipo_operacao || "—"}</dd>
              <dt className="text-muted-foreground">Valor</dt><dd className="col-span-2 font-semibold">{brl(valor)}</dd>
              <dt className="text-muted-foreground">Criada em</dt><dd className="col-span-2">{fmtDate(proposta.created_at)}</dd>
              <dt className="text-muted-foreground">Cancelada em</dt><dd className="col-span-2">{fmtDate(proposta.data_cancelamento)} ({daysSince(proposta.data_cancelamento ?? proposta.created_at)} dias)</dd>
              <dt className="text-muted-foreground">Motivo</dt><dd className="col-span-2">{proposta.motivo_cancelamento || "—"}</dd>
            </dl>
          </section>

          <Separator />

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Score de reaproveitamento</h3>
              <Button variant="ghost" size="sm" onClick={() => recalc.mutate(proposta.id)} disabled={recalc.isPending}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Recalcular
              </Button>
            </div>
            <ScoreBar score={proposta.reativacao_score} />
            <p className="text-xs text-muted-foreground mt-2">
              {proposta.reativacao_justificativa || "Sem justificativa calculada ainda."}
            </p>
          </section>

          {proposta.observacao && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{proposta.observacao}</p>
              </section>
            </>
          )}
        </div>

        <div className="border-t p-4 bg-gradient-to-t from-background to-background/80 sticky bottom-0">
          <Button
            onClick={() => onReativar(proposta)}
            disabled={isReativating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isReativating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reativando...</>
            ) : (
              <><RotateCw className="h-4 w-4 mr-2" /> Reativar proposta</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
