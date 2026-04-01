import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lead, LeadStats, PIPELINE_STAGES, UserProfile } from "../types";
import { LeadMiniCard } from "../components/LeadMiniCard";
import { ScheduleModal } from "../components/ScheduleModal";
import { PipelineColumnsManager } from "../components/PipelineColumnsManager";
import { usePipelineColumns } from "../hooks/usePipelineColumns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Sparkles, TrendingUp, Clock, Calendar, CheckCircle, XCircle,
  Users, Target, User, Filter, Bot, MinusCircle, Ban, PhoneOff,
  MessageCircle, UserX, Circle, Settings2,
  type LucideIcon
} from "lucide-react";

interface PipelineViewProps {
  leads: Lead[];
  users: UserProfile[];
  isLoading: boolean;
  onLeadSelect: (lead: Lead) => void;
  onStatusChange?: (leadId: string, newStatus: string) => Promise<boolean>;
  stats: LeadStats;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, TrendingUp, Clock, Calendar, CheckCircle, XCircle,
  Bot, MinusCircle, Ban, PhoneOff, MessageCircle, UserX, Circle,
  Users, Target, User, Filter, Settings2,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Circle;
}

export function PipelineView({ leads, users, isLoading, onLeadSelect, onStatusChange, stats }: PipelineViewProps) {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const isAdminOrGestor = profile?.role === 'admin' || (profile?.role as string) === 'gestor';
  const { columns: pipelineColumns, isLoading: columnsLoading } = usePipelineColumns();
  
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetLead, setScheduleTargetLead] = useState<Lead | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  
  const [filterUser, setFilterUser] = useState("all");
  const [filterConvenio, setFilterConvenio] = useState("all");
  const [filterTag, setFilterTag] = useState("all");

  const availableConvenios = useMemo(() => {
    const unique = [...new Set(leads.map(l => l.convenio).filter(Boolean))];
    return unique.sort();
  }, [leads]);

  const availableTags = useMemo(() => {
    const unique = [...new Set(leads.map(l => l.tag).filter(Boolean))] as string[];
    return unique.sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (filterUser !== "all" && lead.assigned_to !== filterUser && lead.created_by !== filterUser) return false;
      if (filterConvenio !== "all" && lead.convenio !== filterConvenio) return false;
      if (filterTag !== "all" && lead.tag !== filterTag) return false;
      return true;
    });
  }, [leads, filterUser, filterConvenio, filterTag]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    pipelineColumns.forEach(col => {
      groups[col.column_key] = filteredLeads.filter(l => l.status === col.column_key).slice(0, 50);
    });
    return groups;
  }, [filteredLeads, pipelineColumns]);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLeadId(leadId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggingLeadId(null);
    
    if (!leadId || !onStatusChange) return;
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;
    
    if (targetStatus === 'agendamento') {
      setScheduleTargetLead(lead);
      setScheduleModalOpen(true);
      return;
    }
    
    await onStatusChange(leadId, targetStatus);
  }, [leads, onStatusChange]);

  const handleDragEnd = useCallback(() => {
    setDragOverColumn(null);
    setDraggingLeadId(null);
  }, []);

  if (isLoading || columnsLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const filtersBar = (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <Filter className="h-4 w-4 text-muted-foreground" />
      
      {isAdminOrGestor && users.length > 0 && (
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[180px] h-9">
            <User className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name || u.email || 'Sem nome'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {availableConvenios.length > 0 && (
        <Select value={filterConvenio} onValueChange={setFilterConvenio}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Convênio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Convênios</SelectItem>
            {availableConvenios.map((conv) => (
              <SelectItem key={conv} value={conv}>{conv}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {availableTags.length > 0 && (
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(filterUser !== "all" || filterConvenio !== "all" || filterTag !== "all") && (
        <Badge variant="secondary" className="text-xs">
          {filteredLeads.length} leads
        </Badge>
      )}

      {/* Settings button for admin/gestor */}
      {isAdminOrGestor && (
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-9"
          onClick={() => setManagerOpen(true)}
        >
          <Settings2 className="h-4 w-4 mr-1.5" />
          Editar Funil
        </Button>
      )}
    </div>
  );

  const colCount = pipelineColumns.length;

  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b bg-muted/30">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{stats.novos}</p>
            <p className="text-[10px] text-muted-foreground">Novos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-indigo-600">{stats.emAndamento}</p>
            <p className="text-[10px] text-muted-foreground">Trabalhando</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{stats.fechados}</p>
            <p className="text-[10px] text-muted-foreground">Fechados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{stats.conversionRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">Conversão</p>
          </div>
        </div>

        <div className="px-4 pt-3">{filtersBar}</div>

        <ScrollArea className="flex-1">
          <div className="flex gap-3 p-4 min-w-max">
            {pipelineColumns.map((column, colIndex) => {
              const config = PIPELINE_STAGES[column.column_key] || {
                borderColor: column.border_color,
                bgColor: column.bg_color,
                textColor: column.text_color,
              };
              const columnLeads = groupedLeads[column.column_key] || [];
              const Icon = getIcon(column.icon);

              return (
                <motion.div
                  key={column.column_key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: colIndex * 0.05 }}
                  className="w-[280px] flex-shrink-0"
                >
                  <Card className={`border-t-4 ${config.borderColor || column.border_color} h-full`}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${config.bgColor || column.bg_color}`}>
                            <Icon className={`h-4 w-4 ${config.textColor || column.text_color}`} />
                          </div>
                          <CardTitle className="text-sm font-semibold">
                            {column.label}
                          </CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {columnLeads.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2 max-h-[60vh] overflow-y-auto">
                      {columnLeads.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                          Nenhum lead
                        </div>
                      ) : (
                        columnLeads.map((lead, index) => (
                          <LeadMiniCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => onLeadSelect(lead)}
                            index={index}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <PipelineColumnsManager open={managerOpen} onOpenChange={setManagerOpen} />
      </div>
    );
  }

  // Desktop Pipeline with Drag & Drop
  return (
    <div className="space-y-4">
      {filtersBar}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-xs text-muted-foreground">Em Trabalho</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.fechados}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgTimeToConversion > 24 
                    ? `${(stats.avgTimeToConversion / 24).toFixed(0)}d`
                    : `${stats.avgTimeToConversion.toFixed(0)}h`
                  }
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Columns with Drag & Drop */}
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {pipelineColumns.map((column, colIndex) => {
          const config = PIPELINE_STAGES[column.column_key];
          const borderColor = config?.borderColor || column.border_color;
          const bgColor = config?.bgColor || column.bg_color;
          const textColor = config?.textColor || column.text_color;
          const columnLeads = groupedLeads[column.column_key] || [];
          const Icon = getIcon(column.icon);
          const isOver = dragOverColumn === column.column_key;

          return (
            <motion.div
              key={column.column_key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 0.05 }}
              onDragOver={(e: any) => handleDragOver(e, column.column_key)}
              onDragLeave={handleDragLeave}
              onDrop={(e: any) => handleDrop(e, column.column_key)}
            >
              <Card className={cn(
                `border-t-4 ${borderColor} h-[calc(100vh-400px)] min-h-[400px] transition-all duration-200`,
                isOver && "ring-2 ring-primary bg-primary/5 scale-[1.02]"
              )}>
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${bgColor}`}>
                        <Icon className={`h-4 w-4 ${textColor}`} />
                      </div>
                      <CardTitle className="text-sm font-semibold">
                        {column.label}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {columnLeads.length}
                    </Badge>
                  </div>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-60px)]">
                  <CardContent className="px-3 py-3 space-y-2">
                    {columnLeads.length === 0 ? (
                      <div className={cn(
                        "py-12 text-center text-muted-foreground text-sm transition-all",
                        isOver && "py-6"
                      )}>
                        {isOver ? (
                          <p className="text-primary font-medium">Solte aqui</p>
                        ) : (
                          <>
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${bgColor} flex items-center justify-center opacity-50`}>
                              <Icon className={`h-6 w-6 ${textColor}`} />
                            </div>
                            Nenhum lead
                          </>
                        )}
                      </div>
                    ) : (
                      columnLeads.map((lead, index) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "cursor-grab active:cursor-grabbing",
                            draggingLeadId === lead.id && "opacity-50"
                          )}
                        >
                          <LeadMiniCard
                            lead={lead}
                            onClick={() => onLeadSelect(lead)}
                            index={index}
                          />
                        </div>
                      ))
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        lead={scheduleTargetLead}
        onConfirm={() => {
          if (scheduleTargetLead && onStatusChange) {
            onStatusChange(scheduleTargetLead.id, 'agendamento');
          }
        }}
      />

      <PipelineColumnsManager open={managerOpen} onOpenChange={setManagerOpen} />
    </div>
  );
}
