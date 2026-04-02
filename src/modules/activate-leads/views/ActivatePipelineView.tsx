import { useMemo, useState } from "react";
import { ActivateLead, ActivateLeadStats, ActivateUser, ACTIVATE_STATUS_CONFIG, PIPELINE_STATUSES } from "../types";
import { ActivateLeadCard } from "../components/ActivateLeadCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Settings2, Filter, Users, TrendingUp, AlertTriangle, BarChart3, Target, XCircle, Sparkles, CalendarCheck } from "lucide-react";

interface ActivatePipelineViewProps {
  leads: ActivateLead[];
  users: ActivateUser[];
  stats: ActivateLeadStats;
  origens: string[];
  isLoading: boolean;
  onLeadSelect: (lead: ActivateLead) => void;
  onStatusChange?: (lead: ActivateLead, newStatus: string) => void;
}

export function ActivatePipelineView({ leads, users, stats, origens, isLoading, onLeadSelect, onStatusChange }: ActivatePipelineViewProps) {
  const isMobile = useIsMobile();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOrigem, setFilterOrigem] = useState("all");
  const [columns, setColumns] = useState<string[]>(PIPELINE_STATUSES);
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [filterWorkedToday, setFilterWorkedToday] = useState(false);

  const allStatuses = Object.keys(ACTIVATE_STATUS_CONFIG);

  const activeFilterCount = [filterUser, filterStatus, filterOrigem].filter(f => f !== "all").length + (filterWorkedToday ? 1 : 0);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterUser !== "all") result = result.filter(l => l.assigned_to === filterUser);
    if (filterStatus !== "all") result = result.filter(l => l.status === filterStatus);
    if (filterOrigem !== "all") result = result.filter(l => l.origem === filterOrigem);
    if (filterWorkedToday) {
      const today = new Date().toDateString();
      result = result
        .filter(l => new Date(l.updated_at).toDateString() === today)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return result;
  }, [leads, filterUser, filterStatus, filterOrigem, filterWorkedToday]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, ActivateLead[]> = {};
    columns.forEach(status => { groups[status] = []; });
    filteredLeads.forEach(lead => {
      if (groups[lead.status]) groups[lead.status].push(lead);
    });
    return groups;
  }, [filteredLeads, columns]);

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
    if (lead && lead.status !== newStatus) onStatusChange?.(lead, newStatus);
  };

  const addColumn = (status: string) => {
    if (!columns.includes(status)) setColumns([...columns, status]);
  };
  const removeColumn = (status: string) => {
    setColumns(columns.filter(c => c !== status));
  };

  const kpiCards = [
    { label: "Total de Leads", value: stats.total, color: "border-l-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-600", icon: BarChart3 },
    { label: "Novos", value: stats.novos, color: "border-l-sky-500", iconBg: "bg-sky-100", iconColor: "text-sky-600", icon: Sparkles },
    { label: "Em Andamento", value: stats.emAndamento, color: "border-l-indigo-500", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", icon: TrendingUp },
    { label: "Fechados", value: stats.fechados, color: "border-l-emerald-500", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: Target },
    { label: "Taxa Conversão", value: `${stats.conversionRate.toFixed(1)}%`, color: "border-l-violet-500", iconBg: "bg-violet-100", iconColor: "text-violet-600", icon: TrendingUp },
    { label: "Alertas 48h", value: stats.alertas, color: "border-l-red-500", iconBg: "bg-red-100", iconColor: "text-red-600", icon: AlertTriangle, pulse: stats.alertas > 0 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn("border-l-4", kpi.color)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", kpi.iconBg, kpi.pulse && "animate-pulse")}>
                  <Icon className={cn("h-5 w-5", kpi.iconColor)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">{activeFilterCount}</Badge>
          )}
        </div>

        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-1 opacity-50" />
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Colaboradores</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {allStatuses.map(s => (
              <SelectItem key={s} value={s}>{ACTIVATE_STATUS_CONFIG[s]?.label || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOrigem} onValueChange={setFilterOrigem}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Origem/Convênio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Origens</SelectItem>
            {origens.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filterWorkedToday ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterWorkedToday(!filterWorkedToday)}
        >
          <CalendarCheck className="h-4 w-4 mr-1" />
          Trabalhados Hoje
          {filterWorkedToday && filteredLeads.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{filteredLeads.length}</Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowColumnEditor(!showColumnEditor)}>
          <Settings2 className="h-4 w-4 mr-1" />
          Editar Funil
        </Button>
      </div>

      {/* Column Editor */}
      {showColumnEditor && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <p className="text-sm font-medium">Colunas ativas:</p>
          <div className="flex flex-wrap gap-2">
            {columns.map(status => {
              const config = ACTIVATE_STATUS_CONFIG[status];
              return (
                <Badge key={status} variant="secondary" className="cursor-pointer gap-1" onClick={() => removeColumn(status)}>
                  <span className={cn("h-2 w-2 rounded-full inline-block", config?.dotColor)} />
                  {config?.label || status}
                  <span className="text-destructive ml-1">×</span>
                </Badge>
              );
            })}
          </div>
          <p className="text-sm font-medium mt-2">Adicionar coluna:</p>
          <div className="flex flex-wrap gap-2">
            {allStatuses.filter(s => !columns.includes(s)).map(status => {
              const config = ACTIVATE_STATUS_CONFIG[status];
              return (
                <Badge key={status} variant="outline" className="cursor-pointer gap-1" onClick={() => addColumn(status)}>
                  <span className={cn("h-2 w-2 rounded-full inline-block", config?.dotColor)} />
                  {config?.label || status}
                  <span className="text-primary ml-1">+</span>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className={cn("flex gap-4 pb-4", isMobile && "snap-x snap-mandatory")}>
          {columns.map(status => {
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
                <div className={cn("p-3 border-b flex items-center justify-between rounded-t-lg", config?.bgColor)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", config?.dotColor)} />
                    <h3 className={cn("font-semibold text-sm", config?.textColor)}>{config?.label || status}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-420px)] overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead</p>
                  ) : (
                    columnLeads.map(lead => (
                      <ActivateLeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={onLeadSelect}
                        onDragStart={handleDragStart}
                        isDragging={draggingLeadId === lead.id}
                        showWorkedTime={filterWorkedToday}
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
