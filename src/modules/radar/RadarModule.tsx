import { useEffect, useCallback } from 'react';
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
import { RadarFilters } from './types';
import { toast } from 'sonner';

export function RadarModule() {
  const {
    results, stats, loading, statsLoading, filters, page, perPage,
    fetchStats, search, applySmartFilter, clearFilters, setPage, setPerPage,
  } = useRadarSearch();

  const { credits, loading: creditsLoading, consumeCredit, requestRecharge } = useRadarCredits();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = useCallback(async (searchFilters?: RadarFilters, searchPage?: number, searchPerPage?: number) => {
    const ok = await consumeCredit(1, searchFilters || filters);
    if (!ok) return;
    search(searchFilters, searchPage, searchPerPage);
  }, [consumeCredit, search, filters]);

  const handleSmartFilter = useCallback(async (filterId: string) => {
    const ok = await consumeCredit(1, { smart_filter: filterId });
    if (!ok) return;
    applySmartFilter(filterId);
  }, [consumeCredit, applySmartFilter]);

  const handleCardClick = useCallback((key: string) => {
    handleSmartFilter(key);
  }, [handleSmartFilter]);

  const handlePageChange = useCallback((newPage: number) => {
    search(filters, newPage, perPage);
  }, [search, filters, perPage]);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    search(filters, 1, newPerPage);
  }, [search, filters]);

  const handleAdvancedApply = useCallback((advFilters: RadarFilters) => {
    handleSearch(advFilters, 1);
  }, [handleSearch]);

  const handleSavedFilterApply = useCallback((savedFilters: RadarFilters) => {
    handleSearch(savedFilters, 1);
  }, [handleSearch]);

  const handleViewClient = useCallback((cpf: string) => {
    toast.info(`Abrindo cliente CPF: ${cpf}`);
  }, []);

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
      />
    </div>
  );
}
