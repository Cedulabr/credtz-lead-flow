import { Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  withPhone: number;
  total: number;
  isLoading?: boolean;
  onChoose: (requirePhone: boolean) => void;
}

export function PhoneAlertBanner({ withPhone, total, isLoading, onChoose }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando leads com telefone...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-md bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-2">
        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Encontramos leads com telefone disponível</p>
          <p className="text-xs text-muted-foreground">
            <strong>{withPhone}</strong> de <strong>{total}</strong> leads possuem telefone válido.
            Deseja incluir apenas leads com telefone?
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="default" className="flex-1" onClick={() => onChoose(true)}>
          Sim, com telefone
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onChoose(false)}>
          Não, incluir todos
        </Button>
      </div>
    </div>
  );
}
