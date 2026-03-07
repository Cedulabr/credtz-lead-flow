import { RadarSearchResult } from '../types';
import { RadarResultCard } from './RadarResultCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  results: RadarSearchResult | null;
  loading: boolean;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onViewClient?: (cpf: string) => void;
  onViewContracts?: (cpf: string, nome: string) => void;
  onSendSms?: (phone: string, nome: string) => void;
}

export function RadarResultsList({ results, loading, page, perPage, onPageChange, onPerPageChange, onViewClient, onViewContracts, onSendSms }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!results || results.clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhum resultado encontrado</p>
        <p className="text-sm mt-1">Selecione um filtro ou use a busca avançada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{results.total.toLocaleString('pt-BR')}</span> clientes carregados
            {' · '}Página {results.page} de {results.total_pages}
          </p>
          {results.capped && (
            <div className="flex items-center gap-2 mt-1 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Existem <strong>{results.total_real.toLocaleString('pt-BR')}</strong> oportunidades no total. 
                Exibindo até 5.000 para performance. Refine os filtros para encontrar mais.
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar:</span>
          <Select value={String(perPage)} onValueChange={v => onPerPageChange(parseInt(v))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {results.clients.map(client => (
          <RadarResultCard
            key={client.cpf}
            client={client}
            onViewClient={onViewClient}
            onViewContracts={onViewContracts}
            onSendSms={onSendSms}
          />
        ))}
      </div>

      {/* Pagination */}
      {results.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, results.total_pages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > results.total_pages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= results.total_pages}
            onClick={() => onPageChange(page + 1)}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
