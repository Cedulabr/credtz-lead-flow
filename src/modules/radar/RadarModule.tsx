import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';
import { useRadarSearch } from './hooks/useRadarSearch';
import { useRadarCredits } from './hooks/useRadarCredits';
import { RadarSummaryCards } from './components/RadarSummaryCards';
import { RadarSmartFilters } from './components/RadarSmartFilters';
import { RadarAdvancedFilters } from './components/RadarAdvancedFilters';
import { RadarResultsList } from './components/RadarResultsList';
import { RadarCreditsBar } from './components/RadarCreditsBar';
import { RadarSavedFilters } from './components/RadarSavedFilters';
import { CreditPromptDialog } from './components/CreditPromptDialog';
import { ContractsDrawer } from './components/ContractsDrawer';
import { RadarFilters } from './types';
import { toast } from 'sonner';

export function RadarModule() {
  const {
    results, stats, loading, statsLoading, filters, page, perPage,
    fetchStats, search, applySmartFilter, clearFilters, setPage, setPerPage,
  } = useRadarSearch();

  const { credits, loading: creditsLoading, consumeCredit, requestRecharge } = useRadarCredits();

  // Credit prompt state
  const [creditPromptOpen, setCreditPromptOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ filters: RadarFilters; page: number; perPage: number } | null>(null);

  // Contracts drawer
  const [contractsOpen, setContractsOpen] = useState(false);
  const [contractsCpf, setContractsCpf] = useState('');
  const [contractsNome, setContractsNome] = useState('');

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // When user triggers a search, show credit prompt first
  const promptAndSearch = useCallback((searchFilters: RadarFilters, searchPage: number = 1, searchPerPage?: number) => {
    setPendingSearch({ filters: searchFilters, page: searchPage, perPage: searchPerPage || perPage });
    setCreditPromptOpen(true);
  }, [perPage]);

  const handleCreditConfirm = useCallback(async (creditsToUse: number) => {
    if (!pendingSearch) return;
    const ok = await consumeCredit(creditsToUse, pendingSearch.filters);
    if (!ok) return;
    search(pendingSearch.filters, pendingSearch.page, pendingSearch.perPage);
    setPendingSearch(null);
  }, [consumeCredit, search, pendingSearch]);

  const handleSmartFilter = useCallback((filterId: string) => {
    promptAndSearch({ smart_filter: filterId }, 1);
  }, [promptAndSearch]);

  const handleCardClick = useCallback((key: string) => {
    handleSmartFilter(key);
  }, [handleSmartFilter]);

  const handlePageChange = useCallback((newPage: number) => {
    // Pagination doesn't re-prompt, just navigates
    search(filters, newPage, perPage);
  }, [search, filters, perPage]);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    search(filters, 1, newPerPage);
  }, [search, filters]);

  const handleAdvancedApply = useCallback((advFilters: RadarFilters) => {
    promptAndSearch(advFilters, 1);
  }, [promptAndSearch]);

  const handleSavedFilterApply = useCallback((savedFilters: RadarFilters) => {
    promptAndSearch(savedFilters, 1);
  }, [promptAndSearch]);

  const handleViewClient = useCallback((cpf: string) => {
    toast.info(`Abrindo cliente CPF: ${cpf}`);
  }, []);

  const handleViewContracts = useCallback((cpf: string, nome: string) => {
    setContractsCpf(cpf);
    setContractsNome(nome);
    setContractsOpen(true);
  }, []);

  const handleSendSms = useCallback((phone: string, nome: string) => {
    if (!phone) {
      toast.error('Telefone não disponível');
      return;
    }
    toast.info(`SMS para ${nome}: funcionalidade em breve`);
  }, []);

  // Estimate total from stats for the prompt
  const estimatedTotal = stats
    ? Math.max(stats.alta_rentabilidade, stats.refinanciamento_forte, stats.parcelas_altas, stats.muitos_contratos)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Radar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Radar de Oportunidades</h1>
            <p className="text-sm text-muted-foreground">
              Descubra automaticamente os clientes com maior potencial de crédito na base
            </p>
          </div>
        </div>
      </motion.div>

      {/* Credits Bar */}
      <RadarCreditsBar
        credits={credits}
        loading={creditsLoading}
        onRequestRecharge={requestRecharge}
      />

      {/* Summary Cards */}
      <RadarSummaryCards
        stats={stats}
        loading={statsLoading}
        onCardClick={handleCardClick}
        activeFilter={filters.smart_filter}
      />

      {/* Smart Filters */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Filtros Inteligentes</h2>
        <RadarSmartFilters
          activeFilter={filters.smart_filter}
          onFilterClick={handleSmartFilter}
        />
      </div>

      {/* Advanced Filters + Saved */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <RadarAdvancedFilters
          filters={filters}
          onApply={handleAdvancedApply}
          onClear={clearFilters}
        />
        <RadarSavedFilters
          currentFilters={filters}
          onApplyFilter={handleSavedFilterApply}
        />
      </div>

      {/* Results */}
      <RadarResultsList
        results={results}
        loading={loading}
        page={page}
        perPage={perPage}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        onViewClient={handleViewClient}
        onViewContracts={handleViewContracts}
        onSendSms={handleSendSms}
      />

      {/* Credit Prompt */}
      <CreditPromptDialog
        open={creditPromptOpen}
        onOpenChange={setCreditPromptOpen}
        credits={credits}
        totalAvailable={estimatedTotal}
        onConfirm={handleCreditConfirm}
      />

      {/* Contracts Drawer */}
      <ContractsDrawer
        open={contractsOpen}
        onOpenChange={setContractsOpen}
        cpf={contractsCpf}
        nome={contractsNome}
      />
    </div>
  );
}
