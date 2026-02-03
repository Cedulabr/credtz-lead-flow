import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  CreditCard, 
  Building2, 
  Calendar,
  DollarSign,
  Clock,
  Star,
  UserPlus,
  MessageSquare,
  FileText,
  CheckCircle
} from 'lucide-react';
import { OpportunityClient } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ClientDetailProps {
  client: OpportunityClient | null;
  isOpen: boolean;
  onClose: () => void;
  onPrioritize?: (clientId: string) => void;
  onAssign?: (clientId: string) => void;
  onPrepareContact?: (clientId: string) => void;
}

export function ClientDetail({ 
  client, 
  isOpen, 
  onClose, 
  onPrioritize,
  onAssign,
  onPrepareContact
}: ClientDetailProps) {
  const isMobile = useIsMobile();

  if (!client) return null;

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

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const getStatusConfig = () => {
    if (client.status === 'eligible') {
      return {
        label: 'Elegível para nova operação',
        description: 'Este cliente já atingiu o prazo mínimo e pode ser contatado.',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
      };
    }
    if (client.status === 'soon') {
      return {
        label: `Elegível em ${client.diasParaElegibilidade} dias`,
        description: 'Em breve este cliente atingirá o prazo mínimo para nova operação.',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Clock,
      };
    }
    return {
      label: 'Em monitoramento',
      description: `Faltam ${client.diasParaElegibilidade} dias para atingir o prazo mínimo.`,
      className: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: Clock,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const Content = () => (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={cn('p-4 rounded-lg border-2', statusConfig.className)}>
        <div className="flex items-start gap-3">
          <StatusIcon className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold">{statusConfig.label}</p>
            <p className="text-sm opacity-80">{statusConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{client.nome}</p>
            <p className="text-sm text-muted-foreground">{formatCPF(client.cpf)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Phone className="h-4 w-4" />
              <span className="text-xs">Telefone</span>
            </div>
            <p className="font-medium">{formatPhone(client.telefone)}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Banco</span>
            </div>
            <p className="font-medium">{client.banco}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs">Operação</span>
            </div>
            <p className="font-medium">{client.tipo_operacao}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Data Elegibilidade</span>
            </div>
            <p className="font-medium">
              {format(client.dataElegibilidade, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {client.valorPotencial && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Valor Potencial</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(client.valorPotencial)}
              </p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Rule Explanation */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
        <h4 className="font-semibold text-sm mb-2 text-blue-800 dark:text-blue-300">
          📌 Regra aplicada
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          {client.tipo_operacao === 'Portabilidade' 
            ? 'Portabilidade: elegível para refinanciamento após 12 parcelas pagas (regra fixa).'
            : `Refinanciamento ${client.banco}: regra específica do banco conforme cadastro administrativo.`
          }
        </p>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Ações Internas
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {onPrioritize && (
            <Button 
              variant={client.isPriorized ? 'default' : 'outline'}
              className="justify-start gap-2"
              onClick={() => onPrioritize(client.id)}
            >
              <Star className={cn('h-4 w-4', client.isPriorized && 'fill-current')} />
              {client.isPriorized ? 'Priorizado' : 'Marcar prioridade'}
            </Button>
          )}

          {onAssign && (
            <Button 
              variant="outline"
              className="justify-start gap-2"
              onClick={() => onAssign(client.id)}
            >
              <UserPlus className="h-4 w-4" />
              Atribuir consultor
            </Button>
          )}

          {onPrepareContact && (
            <Button 
              variant="outline"
              className="justify-start gap-2"
              onClick={() => onPrepareContact(client.id)}
            >
              <FileText className="h-4 w-4" />
              Preparar para contato
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          ℹ️ Estas ações são apenas internas. Nenhum disparo automático será realizado.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Content />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Oportunidade</DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}
