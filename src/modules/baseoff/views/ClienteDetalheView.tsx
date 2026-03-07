import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BaseOffClient, BaseOffContract, BaseOffInlineContract, TimelineEvent } from '../types';
import { ClienteHeader } from '../components/ClienteHeader';
import { MargemCards } from '../components/MargemCards';
import { CartoesSection, isCardContract } from '../components/CartoesSection';
import { TelefoneHotPanel } from '../components/TelefoneHotPanel';
import { ContratoCard } from '../components/ContratoCard';
import { SimulationModal } from '../components/SimulationModal';
import { ProfessionalProposalPDF } from '../components/ProfessionalProposalPDF';
import { TrocoCalculator, TrocoSimulation } from '../components/TrocoCalculator';
import { formatDate, formatCurrency } from '../utils';
import { validatePhone } from '../utils/phoneValidation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteDetalheViewProps {
  client: BaseOffClient;
  onBack: () => void;
}

// Convert inline contracts from API to BaseOffContract format
function inlineToContract(inline: BaseOffInlineContract, clientId: string, cpf: string, index: number): BaseOffContract {
  return {
    id: `inline-${index}`,
    client_id: clientId,
    cpf,
    banco_emprestimo: inline.banco_emprestimo || '',
    contrato: inline.contrato,
    vl_emprestimo: Number(inline.valor_emprestimo || inline.vl_emprestimo) || null,
    inicio_desconto: inline.inicio_desconto || null,
    prazo: inline.prazo ? Number(inline.prazo) : null,
    vl_parcela: Number(inline.valor_parcela || inline.vl_parcela) || null,
    tipo_emprestimo: inline.tipo_emprestimo || null,
    data_averbacao: inline.data_averbacao || null,
    situacao_emprestimo: inline.situacao_emprestimo || null,
    competencia: inline.competencia || null,
    competencia_final: inline.competencia_final || null,
    taxa: inline.taxa ? Number(inline.taxa) : null,
    saldo: inline.saldo ? Number(inline.saldo) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function ClienteDetalheView({ client, onBack }: ClienteDetalheViewProps) {
  const [contracts, setContracts] = useState<BaseOffContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contratos');
  const [selectedContract, setSelectedContract] = useState<BaseOffContract | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<TrocoSimulation | null>(null);

  const inlineContracts = client.contratos || client.contracts;
  const hasInlineContracts = inlineContracts && inlineContracts.length > 0;

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (hasInlineContracts) {
        const mapped = inlineContracts!.map((c, i) => inlineToContract(c, client.id, client.cpf, i));
        setContracts(mapped);
      } else {
        // Fallback: query from Supabase
        const { data, error } = await supabase
          .from('baseoff_contracts')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContracts(data || []);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setIsLoading(false);
    }
  }, [client.id, client.cpf, inlineContracts, hasInlineContracts]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Build phone list - prefer `telefones` array from API, fallback to individual fields
  const telefones = useMemo(() => {
    const phones: { numero: string; tipo: 'celular' | 'fixo'; principal?: boolean; valido?: boolean }[] = [];
    
    if (client.telefones && client.telefones.length > 0) {
      client.telefones.forEach((phone, index) => {
        if (!phone) return;
        const validation = validatePhone(phone);
        phones.push({
          numero: phone,
          tipo: validation.tipo === 'celular' ? 'celular' : 'fixo',
          principal: index === 0,
          valido: validation.isValid,
        });
      });
    } else {
      const addPhone = (phone: string | null, tipo: 'celular' | 'fixo', isPrincipal: boolean = false) => {
        if (!phone) return;
        const validation = validatePhone(phone);
        phones.push({
          numero: phone,
          tipo: validation.tipo === 'celular' ? 'celular' : tipo,
          principal: isPrincipal,
          valido: validation.isValid,
        });
      };
      addPhone(client.tel_cel_1, 'celular', true);
      addPhone(client.tel_cel_2, 'celular');
      addPhone(client.tel_cel_3, 'celular');
      addPhone(client.tel_fixo_1, 'fixo');
      addPhone(client.tel_fixo_2, 'fixo');
      addPhone(client.tel_fixo_3, 'fixo');
    }
    
    return phones;
  }, [client]);

  // Separate loan contracts from card contracts
  const loanContracts = useMemo(() => 
    contracts.filter(c => !isCardContract(c.tipo_emprestimo)),
    [contracts]
  );
  // Generate timeline events
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    
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
    
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contracts]);

  const handleSimular = (contract: BaseOffContract) => {
    setSelectedContract(contract);
    setShowSimulation(true);
  };

  const handleRefinanciar = (contract: BaseOffContract) => {
    setSelectedContract(contract);
    setShowSimulation(true);
  };

  const handlePortar = (contract: BaseOffContract) => {
    toast.info(`Portabilidade para contrato ${contract.contrato}`);
  };

  const handleGerarProposta = () => {
    setShowProposal(true);
  };

  const handleSimulationConfirm = (simulation: any) => {
    toast.success(`Simulação salva: ${formatCurrency(simulation.novaParcela)}/mês no ${simulation.banco}`);
  };

  const handleMarcarPrincipal = async (numero: string) => {
    try {
      const { error } = await supabase
        .from('baseoff_clients')
        .update({ tel_cel_1: numero })
        .eq('id', client.id);

      if (error) throw error;
      toast.success('Telefone principal atualizado!');
    } catch (error) {
      console.error('Error updating principal phone:', error);
      toast.error('Erro ao atualizar telefone');
    }
  };

  return (
    <div className="space-y-6">
      {selectedContract && (
        <SimulationModal
          isOpen={showSimulation}
          onClose={() => setShowSimulation(false)}
          client={client}
          contract={selectedContract}
          onConfirm={handleSimulationConfirm}
        />
      )}

      <ProfessionalProposalPDF
        isOpen={showProposal}
        onClose={() => setShowProposal(false)}
        client={client}
        contracts={contracts}
        companyName="Easyn"
        trocoSimulation={currentSimulation}
        selectedContractIds={selectedContractIds}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista
        </Button>
        <Button variant="outline" onClick={handleGerarProposta} className="gap-2">
          <Download className="w-4 h-4" />
          Gerar Proposta PDF
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <ClienteHeader client={client} />

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              💰 Margens e Indicadores
            </h3>
            <MargemCards 
              mr={client.mr}
              baseCalculo={client.mr ? client.mr * 1.3 : null}
              margemCartao={client.valor_rmc}
              cartaoBeneficio={client.valor_rcc}
              contracts={contracts}
              esp={client.esp}
            />
          </div>

          {/* Cartões Section */}
          <CartoesSection contracts={contracts} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="contratos" className="gap-2 text-base">
                <FileText className="w-4 h-4" />
                📄 Contratos ({loanContracts.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2 text-base">
                <Clock className="w-4 h-4" />
                ⏳ Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contratos" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {loanContracts.length} contrato(s) encontrado(s)
                  </p>
                  {loanContracts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedContractIds.length === contracts.length) {
                          setSelectedContractIds([]);
                        } else {
                          setSelectedContractIds(contracts.map(c => c.id));
                        }
                      }}
                      className="text-xs"
                    >
                      {selectedContractIds.length === contracts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                  )}
                </div>
                {!hasInlineContracts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchContracts}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Atualizar
                  </Button>
                )}
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
                    <div key={contract.id} className="flex items-start gap-3">
                      <div className="pt-4">
                        <Checkbox
                          checked={selectedContractIds.includes(contract.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContractIds([...selectedContractIds, contract.id]);
                            } else {
                              setSelectedContractIds(selectedContractIds.filter(id => id !== contract.id));
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <ContratoCard
                          contract={contract}
                          onSimular={() => handleSimular(contract)}
                          onRefinanciar={() => handleRefinanciar(contract)}
                          onPortar={() => handlePortar(contract)}
                          onGerarProposta={() => handleGerarProposta()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {contracts.length > 0 && (
                <TrocoCalculator
                  contracts={contracts}
                  selectedContracts={selectedContractIds}
                  onSelectionChange={setSelectedContractIds}
                  onSimulationChange={setCurrentSimulation}
                  onGeneratePDF={() => setShowProposal(true)}
                />
              )}
            </TabsContent>

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
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative">
                      <div className={cn(
                        "absolute -left-[25px] w-4 h-4 rounded-full border-2 bg-background",
                        event.type === 'contrato' && "border-primary",
                        event.type === 'simulacao' && "border-warning",
                        event.type === 'refinanciamento' && "border-secondary",
                        event.type === 'contato' && "border-accent",
                        event.type === 'vencimento' && "border-destructive"
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

        <div className="hidden lg:block">
          <TelefoneHotPanel 
            telefones={telefones}
            email={client.email_1}
            onMarcarPrincipal={handleMarcarPrincipal}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <TelefoneHotPanel 
          telefones={telefones}
          email={client.email_1}
          onMarcarPrincipal={handleMarcarPrincipal}
        />
      </div>
    </div>
  );
}
