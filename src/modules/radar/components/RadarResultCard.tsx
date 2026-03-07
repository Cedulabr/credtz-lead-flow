import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, Banknote, Building2, Eye, Plus } from 'lucide-react';
import { RadarClient } from '../types';

interface Props {
  client: RadarClient;
  onViewClient?: (cpf: string) => void;
}

const scoreBadge: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  Premium: { variant: 'default', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
  Alta: { variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  'Média': { variant: 'secondary', className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  Baixa: { variant: 'outline', className: '' },
};

export function RadarResultCard({ client, onViewClient }: Props) {
  const badge = scoreBadge[client.classification] || scoreBadge.Baixa;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground truncate">{client.nome || 'N/A'}</span>
              {client.idade && (
                <span className="text-sm text-muted-foreground">{client.idade} anos</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {client.uf && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {client.municipio ? `${client.municipio}/${client.uf}` : client.uf}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {client.total_contratos} contratos
              </span>
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                Maior parcela: R$ {client.max_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {client.banco_principal && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {client.banco_principal}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={badge.className}>
              ⭐ {client.classification}
            </Badge>
            <span className="text-xs text-muted-foreground">Score: {client.opportunity_score}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => onViewClient?.(client.cpf)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver cliente
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Adicionar à lista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
