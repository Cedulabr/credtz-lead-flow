import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  Building2, 
  Calendar,
  DollarSign,
  ChevronRight,
  Star,
  Users,
  Clock
} from 'lucide-react';
import { OpportunityClient } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OpportunityListProps {
  clients: OpportunityClient[];
  onSelectClient: (client: OpportunityClient) => void;
  onPrioritize?: (clientId: string) => void;
  title?: string;
  emptyMessage?: string;
  showActions?: boolean;
}

export function OpportunityList({ 
  clients, 
  onSelectClient, 
  onPrioritize,
  title = 'Oportunidades',
  emptyMessage = 'Nenhuma oportunidade encontrada',
  showActions = true
}: OpportunityListProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getPriorityConfig = (priority: string, status: string) => {
    if (status === 'eligible') {
      return {
        label: 'Elegível',
        className: 'bg-green-100 text-green-800 border-green-300',
        dotColor: 'bg-green-500',
      };
    }
    if (status === 'soon') {
      return {
        label: 'Em breve',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500',
      };
    }
    return {
      label: 'Monitorando',
      className: 'bg-slate-100 text-slate-800 border-slate-300',
      dotColor: 'bg-slate-500',
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="secondary">{clients.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-6 md:pt-0">
        {clients.length === 0 ? (
          <div className="text-center py-8 px-4 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y">
            {clients.map((client) => {
              const priorityConfig = getPriorityConfig(client.priority, client.status);

              return (
                <div
                  key={client.id}
                  className={cn(
                    'p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                    client.status === 'eligible' && 'bg-green-50/50 dark:bg-green-950/20'
                  )}
                  onClick={() => onSelectClient(client)}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', priorityConfig.dotColor)} />
                        <span className="font-medium text-sm">{client.nome}</span>
                      </div>
                      <Badge className={cn('text-[10px]', priorityConfig.className)}>
                        {client.status === 'eligible' 
                          ? 'Pronto' 
                          : client.diasParaElegibilidade === 0 
                            ? 'Hoje'
                            : `${client.diasParaElegibilidade}d`}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {client.banco}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(client.telefone)}
                        </span>
                      </div>
                      {client.valorPotencial && (
                        <span className="font-medium text-green-600">
                          {formatCurrency(client.valorPotencial)}
                        </span>
                      )}
                    </div>

                    {showActions && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClient(client);
                          }}
                        >
                          Ver detalhes
                        </Button>
                        {onPrioritize && (
                          <Button 
                            size="sm" 
                            variant={client.isPriorized ? 'default' : 'ghost'}
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrioritize(client.id);
                            }}
                          >
                            <Star className={cn('h-4 w-4', client.isPriorized && 'fill-current')} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className={cn('w-3 h-3 rounded-full shrink-0', priorityConfig.dotColor)} />
                    
                    <div className="flex-1 min-w-0 grid grid-cols-5 gap-4 items-center">
                      <div className="col-span-2">
                        <p className="font-medium truncate">{client.nome}</p>
                        <p className="text-sm text-muted-foreground">{formatPhone(client.telefone)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{client.banco}</span>
                      </div>

                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {client.tipo_operacao}
                        </Badge>
                      </div>

                      <div className="text-right">
                        {client.valorPotencial ? (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(client.valorPotencial)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={cn(priorityConfig.className)}>
                        {client.status === 'eligible' 
                          ? 'Elegível agora'
                          : client.diasParaElegibilidade === 0
                            ? 'Hoje'
                            : `Em ${client.diasParaElegibilidade} dias`}
                      </Badge>

                      {showActions && (
                        <div className="flex items-center gap-1">
                          {onPrioritize && (
                            <Button 
                              size="icon" 
                              variant={client.isPriorized ? 'default' : 'ghost'}
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrioritize(client.id);
                              }}
                            >
                              <Star className={cn('h-4 w-4', client.isPriorized && 'fill-current')} />
                            </Button>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
