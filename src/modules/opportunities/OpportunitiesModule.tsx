import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  BarChart3, 
  Users,
  RefreshCw,
  TrendingUp,
  Building2
} from 'lucide-react';
import { useOpportunities } from './hooks/useOpportunities';
import { OpportunityOverview } from './components/OpportunityOverview';
import { BankOpportunities } from './components/BankOpportunities';
import { OpportunityList } from './components/OpportunityList';
import { OpportunityFilters } from './components/OpportunityFilters';
import { ClientDetail } from './components/ClientDetail';
import { OpportunityFilter, OpportunityClient, DEFAULT_FILTERS } from './types';
import { useToast } from '@/hooks/use-toast';

export function OpportunitiesModule() {
  const { toast } = useToast();
  const {
    loading,
    stats,
    opportunitiesByBank,
    portabilityBreakdown,
    getOpportunityClients,
    uniqueBanks,
    refresh,
  } = useOpportunities();

  const [activeTab, setActiveTab] = useState<'overview' | 'clients'>('overview');
  const [filters, setFilters] = useState<OpportunityFilter>(DEFAULT_FILTERS);
  const [selectedClient, setSelectedClient] = useState<OpportunityClient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get filtered clients
  const filteredClients = useMemo(() => {
    return getOpportunityClients(filters);
  }, [getOpportunityClients, filters]);

  // Quick filter presets
  const handleQuickFilter = (preset: 'eligible' | 'soon' | 'all') => {
    setFilters({
      ...DEFAULT_FILTERS,
      status: preset === 'all' ? 'all' : preset,
    });
    setActiveTab('clients');
  };

  const handleSelectBank = (bankName: string) => {
    setFilters({
      ...DEFAULT_FILTERS,
      bank: bankName.toLowerCase(),
    });
    setActiveTab('clients');
  };

  const handleSelectClient = (client: OpportunityClient) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handlePrioritize = (clientId: string) => {
    // TODO: Implement priority toggle in database
    toast({
      title: 'Prioridade marcada',
      description: 'Cliente marcado como prioridade para acompanhamento.',
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast({
      title: 'Dados atualizados',
      description: 'As oportunidades foram recarregadas.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Painel de Oportunidades
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visão estratégica de refinanciamentos e portabilidades
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Quick Action Buttons - Mobile */}
          <div className="flex gap-2 mt-4 md:hidden overflow-x-auto pb-2">
            <Button 
              size="sm" 
              variant={stats.eligibleNow > 0 ? 'default' : 'outline'}
              onClick={() => handleQuickFilter('eligible')}
              className="shrink-0"
            >
              🟢 Elegíveis ({stats.eligibleNow})
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleQuickFilter('soon')}
              className="shrink-0"
            >
              🟡 Em breve ({stats.eligibleIn5Days})
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => handleQuickFilter('all')}
              className="shrink-0"
            >
              Ver todos
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              <span>Clientes</span>
              {stats.eligibleNow > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.eligibleNow}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <OpportunityOverview 
              stats={stats}
              portabilityBreakdown={portabilityBreakdown}
              isLoading={loading}
            />

            <BankOpportunities 
              opportunities={opportunitiesByBank}
              onSelectBank={handleSelectBank}
              isLoading={loading}
            />

            {/* Quick Access to Eligible Clients */}
            {stats.eligibleNow > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Prontos para Ação
                  </h2>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => handleQuickFilter('eligible')}
                  >
                    Ver todos →
                  </Button>
                </div>
                <OpportunityList 
                  clients={getOpportunityClients({ ...DEFAULT_FILTERS, status: 'eligible' }).slice(0, 5)}
                  onSelectClient={handleSelectClient}
                  onPrioritize={handlePrioritize}
                  title=""
                  showActions={false}
                />
              </div>
            )}
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="mt-6 space-y-4">
            <OpportunityFilters 
              filters={filters}
              onFiltersChange={setFilters}
              banks={uniqueBanks}
              resultCount={filteredClients.length}
            />

            <OpportunityList 
              clients={filteredClients}
              onSelectClient={handleSelectClient}
              onPrioritize={handlePrioritize}
              title="Oportunidades"
              emptyMessage="Nenhuma oportunidade encontrada com os filtros selecionados"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Client Detail Modal/Sheet */}
      <ClientDetail 
        client={selectedClient}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedClient(null);
        }}
        onPrioritize={handlePrioritize}
      />
    </div>
  );
}
