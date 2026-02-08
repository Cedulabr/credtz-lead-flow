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
import { startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from "date-fns";

interface LeadsListViewProps {
  leads: Lead[];
  users: UserProfile[];
  isLoading: boolean;
  onLeadSelect: (lead: Lead) => void;
  onRefresh: () => void;
  onSimulation?: (lead: Lead) => void;
  onTyping?: (lead: Lead) => void;
  onStatusChange?: (lead: Lead, status: string) => void;
  canEditLead?: (lead: Lead) => boolean;
}

export function LeadsListView({ 
  leads, 
  users,
  isLoading, 
  onLeadSelect,
  onRefresh,
  onSimulation,
  onTyping,
  onStatusChange,
  canEditLead
}: LeadsListViewProps) {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<LeadFilters & { dateFilter?: string }>({
    search: "",
    status: "all",
    user: "all",
    convenio: "all",
    tag: "all",
    dateFilter: "all"
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

      // Date filter
      if (filters.dateFilter && filters.dateFilter !== "all") {
        const leadDate = new Date(lead.created_at);
        const now = new Date();
        
        switch (filters.dateFilter) {
          case "today":
            if (!isAfter(leadDate, startOfDay(now))) return false;
            break;
          case "yesterday":
            const yesterday = subDays(now, 1);
            if (!isAfter(leadDate, startOfDay(yesterday)) || isAfter(leadDate, startOfDay(now))) return false;
            break;
          case "last3days":
            if (!isAfter(leadDate, subDays(now, 3))) return false;
            break;
          case "thisWeek":
            if (!isAfter(leadDate, startOfWeek(now, { weekStartsOn: 0 }))) return false;
            break;
          case "thisMonth":
            if (!isAfter(leadDate, startOfMonth(now))) return false;
            break;
        }
      }

      return true;
    });
  }, [leads, filters]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-12 rounded-lg" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
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
                  {filters.search || filters.status !== "all" || filters.convenio !== "all" || filters.dateFilter !== "all"
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
                  onSimulation={onSimulation}
                  onTyping={onTyping}
                  onStatusChange={onStatusChange}
                  canEdit={canEditLead ? canEditLead(lead) : true}
                />
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
