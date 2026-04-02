import { useMemo, useState } from "react";
import { ActivateLead, ActivateLeadStats, ACTIVATE_STATUS_CONFIG, PIPELINE_STATUSES, ActivateUser } from "../types";
import { ActivateLeadCard } from "../components/ActivateLeadCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ActivatePipelineViewProps {
  leads: ActivateLead[];
  users: ActivateUser[];
  isLoading: boolean;
  onLeadSelect: (lead: ActivateLead) => void;
  onStatusChange?: (lead: ActivateLead, newStatus: string) => void;
}

export function ActivatePipelineView({ leads, users, isLoading, onLeadSelect, onStatusChange }: ActivatePipelineViewProps) {
  const isMobile = useIsMobile();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState("all");

  const filteredLeads = useMemo(() => {
    if (filterUser === "all") return leads;
    return leads.filter(l => l.assigned_to === filterUser);
  }, [leads, filterUser]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, ActivateLead[]> = {};
    PIPELINE_STATUSES.forEach(status => { groups[status] = []; });
    filteredLeads.forEach(lead => {
      if (groups[lead.status]) {
        groups[lead.status].push(lead);
      }
    });
    return groups;
  }, [filteredLeads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData("text/plain");
    setDraggingLeadId(null);
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      onStatusChange?.(lead, newStatus);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos Usuários" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Usuários</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className={cn(
          "flex gap-4 pb-4",
          isMobile && "snap-x snap-mandatory"
        )}>
          {PIPELINE_STATUSES.map(status => {
            const config = ACTIVATE_STATUS_CONFIG[status];
            const columnLeads = groupedLeads[status] || [];
            const isOver = dragOverColumn === status;

            return (
              <div
                key={status}
                className={cn(
                  "flex-shrink-0 w-[280px] rounded-lg border bg-card",
                  isMobile && "snap-center",
                  isOver && "ring-2 ring-primary bg-primary/5"
                )}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className={cn("p-3 border-b flex items-center justify-between rounded-t-lg", config?.bgColor)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", config?.dotColor)} />
                    <h3 className={cn("font-semibold text-sm", config?.textColor)}>
                      {config?.label || status}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnLeads.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum lead
                    </p>
                  ) : (
                    columnLeads.map(lead => (
                      <ActivateLeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={onLeadSelect}
                        onDragStart={handleDragStart}
                        isDragging={draggingLeadId === lead.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
