import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BaseOffClient, BaseOffContract, TimelineEvent, ClientStatus } from '../types';
import { ClienteHeader } from '../components/ClienteHeader';
import { MargemCards } from '../components/MargemCards';
import { TelefoneHotPanel } from '../components/TelefoneHotPanel';
import { ContratoCard } from '../components/ContratoCard';
import { formatDate, formatCurrency } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteDetalheViewProps {
  client: BaseOffClient;
  onBack: () => void;
}

export function ClienteDetalheView({ client, onBack }: ClienteDetalheViewProps) {
  const [contracts, setContracts] = useState<BaseOffContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contratos');

  const fetchContracts = useCallback(async () => {
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
      toast.error('Erro ao carregar contratos');
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Build phone list
  const telefones = useMemo(() => {
    const phones: { numero: string; tipo: 'celular' | 'fixo'; principal?: boolean }[] = [];
    if (client.tel_cel_1) {
      phones.push({ numero: client.tel_cel_1, tipo: 'celular', principal: true });
    }
    if (client.tel_cel_2) {
      phones.push({ numero: client.tel_cel_2, tipo: 'celular' });
    }
    if (client.tel_fixo_1) {
      phones.push({ numero: client.tel_fixo_1, tipo: 'fixo' });
    }
    return phones;
  }, [client]);

  // Generate timeline events
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    
    // Add contract events
    contracts.forEach(contract => {
      events.push({
        id: contract.id,
        type: 'contrato',
        title: `📄 Contrato ${contract.banco_emprestimo || 'N/I'}`,
        description: `${contract.tipo_emprestimo || 'Empréstimo'} - ${formatCurrency(contract.vl_emprestimo)}`,
        date: contract.data_averbacao || contract.created_at,
        metadata: {
          contrato: contract.contrato,
          situacao: contract.situacao_emprestimo,
        }
      });
    });
    
    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contracts]);

  const handleSimular = (contract: BaseOffContract) => {
    toast.info(`Simulação para contrato ${contract.contrato}`);
    // TODO: Implement simulation
  };

  const handleRefinanciar = (contract: BaseOffContract) => {
    toast.info(`Refinanciamento para contrato ${contract.contrato}`);
    // TODO: Implement refinancing
  };

  const handlePortar = (contract: BaseOffContract) => {
    toast.info(`Portabilidade para contrato ${contract.contrato}`);
    // TODO: Implement porting
  };

  const handleGerarProposta = (contract: BaseOffContract) => {
    toast.info(`Gerando proposta para contrato ${contract.contrato}`);
    // TODO: Implement proposal generation
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar para lista
      </Button>

      {/* Main Layout: Content + Sticky Phone Panel */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Client Header Card */}
          <ClienteHeader client={client} />

          {/* Margin Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              💰 Margens e Indicadores
            </h3>
            <MargemCards 
              mr={client.mr}
              baseCalculo={client.mr ? client.mr * 1.3 : null}
            />
          </div>

          {/* Tabs: Contracts & Timeline */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="contratos" className="gap-2 text-base">
                <FileText className="w-4 h-4" />
                📄 Contratos ({contracts.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2 text-base">
                <Clock className="w-4 h-4" />
                ⏳ Timeline
              </TabsTrigger>
            </TabsList>

            {/* Contracts Tab */}
            <TabsContent value="contratos" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {contracts.length} contrato(s) encontrado(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchContracts}
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  Atualizar
                </Button>
              </div>

              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : contracts.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Nenhum contrato</h4>
                  <p className="text-muted-foreground">
                    Este cliente não possui contratos cadastrados.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {contracts.map(contract => (
                    <ContratoCard
                      key={contract.id}
                      contract={contract}
                      onSimular={() => handleSimular(contract)}
                      onRefinanciar={() => handleRefinanciar(contract)}
                      onPortar={() => handlePortar(contract)}
                      onGerarProposta={() => handleGerarProposta(contract)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              {timelineEvents.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Timeline vazia</h4>
                  <p className="text-muted-foreground">
                    Nenhum evento registrado para este cliente.
                  </p>
                </Card>
              ) : (
                <div className="relative pl-6 border-l-2 border-muted space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-background",
                        event.type === 'contrato' && "border-blue-500",
                        event.type === 'simulacao' && "border-yellow-500",
                        event.type === 'refinanciamento' && "border-purple-500",
                        event.type === 'contato' && "border-green-500",
                        event.type === 'vencimento' && "border-orange-500"
                      )} />
                      
                      <Card className="p-4 ml-2 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                            {event.metadata?.situacao && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Status: {event.metadata.situacao}
                              </p>
                            )}
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
          </Tabs>
        </div>

        {/* Right Column - Sticky Phone Panel */}
        <div className="hidden lg:block">
          <TelefoneHotPanel 
            telefones={telefones}
            email={client.email_1}
          />
        </div>
      </div>

      {/* Mobile Phone Panel */}
      <div className="lg:hidden">
        <TelefoneHotPanel 
          telefones={telefones}
          email={client.email_1}
        />
      </div>
    </div>
  );
}
