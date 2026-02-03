import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lead, UserProfile, PIPELINE_STAGES, LeadFilters } from "../types";
import { LeadListItem } from "../components/LeadListItem";
import { LeadsFiltersBar } from "../components/LeadsFiltersBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCcw, Inbox } from "lucide-react";

interface LeadsListViewProps {
  leads: Lead[];
  users: UserProfile[];
  isLoading: boolean;
  onLeadSelect: (lead: Lead) => void;
  onRefresh: () => void;
}

export function LeadsListView({ 
  leads, 
  users,
  isLoading, 
  onLeadSelect,
  onRefresh 
}: LeadsListViewProps) {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<LeadFilters>({
    search: "",
    status: "all",
    user: "all",
    convenio: "all",
    tag: "all"
  });

  // Extract unique convenios and tags from leads
  const availableConvenios = useMemo(() => {
    const unique = [...new Set(leads.map(l => l.convenio).filter(Boolean))];
    return unique.sort();
  }, [leads]);

  const availableTags = useMemo(() => {
    const unique = [...new Set(leads.map(l => l.tag).filter(Boolean))] as string[];
    return unique.sort();
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.cpf?.includes(filters.search) ||
          lead.phone?.includes(filters.search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== "all" && lead.status !== filters.status) {
        return false;
      }

      // Convenio filter
      if (filters.convenio !== "all" && lead.convenio !== filters.convenio) {
        return false;
      }

      // Tag filter
      if (filters.tag !== "all" && lead.tag !== filters.tag) {
        return false;
      }

      return true;
    });
  }, [leads, filters]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-12 rounded-lg" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} border-b bg-background sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <LeadsFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              availableConvenios={availableConvenios}
              availableTags={availableTags}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="shrink-0"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        {filteredLeads.length !== leads.length && (
          <p className="text-xs text-muted-foreground mt-2">
            Mostrando {filteredLeads.length} de {leads.length} leads
          </p>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} space-y-2`}>
          {filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum lead encontrado
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filters.search || filters.status !== "all" || filters.convenio !== "all"
                    ? "Tente ajustar os filtros"
                    : "Solicite novos leads para começar"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
              >
                <LeadListItem
                  lead={lead}
                  onClick={() => onLeadSelect(lead)}
                />
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
