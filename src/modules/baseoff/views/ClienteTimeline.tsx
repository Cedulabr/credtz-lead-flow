import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  CreditCard,
  Clock,
  ChevronRight,
  Copy,
  Building
} from 'lucide-react';
import { BaseOffClient, BaseOffContract, TimelineEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  formatCPFFull, 
  formatPhone, 
  formatDate, 
  formatCurrency, 
  getWhatsAppLink 
} from '../utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteTimelineProps {
  client: BaseOffClient | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClienteTimeline({ client, isOpen, onClose }: ClienteTimelineProps) {
  const [contracts, setContracts] = useState<BaseOffContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (client && isOpen) {
      fetchContracts();
    }
  }, [client, isOpen]);

  const fetchContracts = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('baseoff_contracts')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Generate timeline events from contracts and client data
  const timelineEvents: TimelineEvent[] = contracts.map(contract => ({
    id: contract.id,
    type: 'contrato',
    title: `Contrato ${contract.banco_emprestimo || 'N/I'}`,
    description: `${contract.tipo_emprestimo || 'Empréstimo'} - ${formatCurrency(contract.vl_emprestimo)}`,
    date: contract.data_averbacao || contract.created_at,
    metadata: {
      contrato: contract.contrato,
      parcela: contract.vl_parcela,
      prazo: contract.prazo,
      taxa: contract.taxa,
      situacao: contract.situacao_emprestimo,
    }
  }));

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl mb-1">{client.nome}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">{formatCPFFull(client.cpf)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(client.cpf, 'CPF')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <StatusBadge status={client.status || 'simulado'} size="sm" />
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 grid grid-cols-3">
            <TabsTrigger value="info">📋 Cadastro</TabsTrigger>
            <TabsTrigger value="contracts">📄 Contratos</TabsTrigger>
            <TabsTrigger value="timeline">⏳ Timeline</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-6">
            {/* Info Tab */}
            <TabsContent value="info" className="mt-0 space-y-4">
              {/* Contact Info */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </h3>
                <div className="grid gap-3">
                  {client.tel_cel_1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Celular 1</span>
                      <div className="flex items-center gap-2">
                        <span>{formatPhone(client.tel_cel_1)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() => window.open(getWhatsAppLink(client.tel_cel_1), '_blank')}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {client.tel_cel_2 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Celular 2</span>
                      <div className="flex items-center gap-2">
                        <span>{formatPhone(client.tel_cel_2)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() => window.open(getWhatsAppLink(client.tel_cel_2), '_blank')}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {client.tel_fixo_1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fixo</span>
                      <span>{formatPhone(client.tel_fixo_1)}</span>
                    </div>
                  )}
                  {client.email_1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{client.email_1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(`mailto:${client.email_1}`, '_blank')}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Personal Info */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados Pessoais
                </h3>
                <div className="grid gap-2 text-sm">
                  <InfoRow label="NB" value={client.nb} />
                  <InfoRow label="Data Nasc." value={formatDate(client.data_nascimento)} />
                  <InfoRow label="Sexo" value={client.sexo} />
                  <InfoRow label="Nome da Mãe" value={client.nome_mae} />
                  <InfoRow label="Espécie" value={client.esp} />
                </div>
              </Card>

              {/* Address */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </h3>
                <div className="grid gap-2 text-sm">
                  <InfoRow label="Município" value={client.municipio} />
                  <InfoRow label="UF" value={client.uf} />
                </div>
              </Card>

              {/* Bank Info */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Dados Bancários
                </h3>
                <div className="grid gap-2 text-sm">
                  <InfoRow label="Banco Pagto" value={client.banco_pagto} />
                  <InfoRow label="Margem" value={client.mr ? formatCurrency(client.mr) : null} />
                  <InfoRow label="Status Benefício" value={client.status_beneficio} />
                </div>
              </Card>
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-0 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              ) : contracts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum contrato encontrado</p>
                </div>
              ) : (
                contracts.map((contract) => (
                  <Card key={contract.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Banco {contract.banco_emprestimo}</span>
                          <Badge variant="outline" className="text-xs">
                            {contract.situacao_emprestimo || 'N/I'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Contrato: {contract.contrato}</p>
                          <p>Valor: {formatCurrency(contract.vl_emprestimo)} | Parcela: {formatCurrency(contract.vl_parcela)}</p>
                          <p>Prazo: {contract.prazo || '---'} meses | Taxa: {contract.taxa ? `${contract.taxa}%` : '---'}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatDate(contract.data_averbacao)}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum evento na timeline</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-muted space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-background",
                        event.type === 'contrato' && "border-blue-500",
                        event.type === 'simulacao' && "border-yellow-500",
                        event.type === 'vencimento' && "border-orange-500"
                      )} />
                      
                      <Card className="p-3 ml-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(event.date)}
                          </span>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
