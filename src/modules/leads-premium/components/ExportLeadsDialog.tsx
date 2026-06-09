import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Lead, LeadFilters, PIPELINE_STAGES, UserProfile } from "../types";
import { Download, Calendar, Filter, User, Tag, Briefcase, CheckCircle2 } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ExportLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  users: UserProfile[];
  currentFilters: LeadFilters & { dateFilter?: string };
  availableConvenios: string[];
  availableTags: string[];
  isAdmin: boolean;
}

const EXPORTABLE_FIELDS = [
  { id: "name", label: "Nome" },
  { id: "cpf", label: "CPF" },
  { id: "phone", label: "Telefone" },
  { id: "phone2", label: "Telefone 2" },
  { id: "convenio", label: "Convênio" },
  { id: "tag", label: "Tag" },
  { id: "status", label: "Status" },
  { id: "created_at", label: "Data de Criação" },
  { id: "assigned_to", label: "Atribuído a" },
  { id: "notes", label: "Observações" },
];

export function ExportLeadsDialog({
  isOpen,
  onClose,
  leads,
  users,
  currentFilters,
  availableConvenios,
  availableTags,
  isAdmin
}: ExportLeadsDialogProps) {
  const [filters, setFilters] = useState<LeadFilters & { dateFilter?: string }>({ ...currentFilters });
  const [selectedFields, setSelectedFields] = useState<string[]>(EXPORTABLE_FIELDS.map(f => f.id));
  const [isExporting, setIsExporting] = useState(false);

  const filteredLeadsForExport = useMemo(() => {
    return leads.filter(lead => {
      if (filters.user !== "all") {
        if (lead.assigned_to !== filters.user && lead.created_by !== filters.user) {
          return false;
        }
      }

      if (filters.status !== "all" && lead.status !== filters.status) {
        return false;
      }

      if (filters.convenio !== "all" && lead.convenio !== filters.convenio) {
        return false;
      }

      if (filters.tag !== "all" && lead.tag !== filters.tag) {
        return false;
      }

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

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId) 
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFields.length === EXPORTABLE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(EXPORTABLE_FIELDS.map(f => f.id));
    }
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      toast.error("Selecione pelo menos um campo para exportar");
      return;
    }

    setIsExporting(true);
    try {
      if (filteredLeadsForExport.length === 0) return;

      const activeFields = EXPORTABLE_FIELDS.filter(f => selectedFields.includes(f.id));
      const headers = activeFields.map(f => f.label);
      
      const csvContent = [
        headers.join(","),
        ...filteredLeadsForExport.map(lead => {
          return activeFields.map(field => {
            let value = "";
            switch (field.id) {
              case "name": value = lead.name || ""; break;
              case "cpf": value = lead.cpf || ""; break;
              case "phone": value = lead.phone || ""; break;
              case "phone2": value = lead.phone2 || ""; break;
              case "convenio": value = lead.convenio || ""; break;
              case "tag": value = lead.tag || ""; break;
              case "status": value = PIPELINE_STAGES[lead.status]?.label || lead.status; break;
              case "created_at": value = format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm'); break;
              case "assigned_to": 
                const assignedUser = users.find(u => u.id === lead.assigned_to);
                value = assignedUser?.name || assignedUser?.email || lead.assigned_to || "Não atribuído";
                break;
              case "notes": value = (lead.notes || "").replace(/\n/g, " "); break;
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(",");
        })
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `leads_premium_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportação concluída com sucesso!");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar leads");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-6 w-6 text-primary" />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            Escolha os filtros e selecione quais informações deseja incluir no seu relatório.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {/* 1. Filtros */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                1. Refinar Filtros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isAdmin || users.length > 1) && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-medium">
                      <User className="h-3 w-3" />
                      Usuário
                    </Label>
                    <Select 
                      value={filters.user} 
                      onValueChange={(value) => setFilters({ ...filters, user: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name || u.email || 'Sem nome'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium">
                    <Calendar className="h-3 w-3" />
                    Período
                  </Label>
                  <Select 
                    value={filters.dateFilter || "all"} 
                    onValueChange={(value) => setFilters({ ...filters, dateFilter: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="yesterday">Ontem</SelectItem>
                      <SelectItem value="last3days">Últimos 3 dias</SelectItem>
                      <SelectItem value="thisWeek">Esta semana</SelectItem>
                      <SelectItem value="thisMonth">Este mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium">
                    <Filter className="h-3 w-3" />
                    Status
                  </Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      {Object.entries(PIPELINE_STAGES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium">
                    <Briefcase className="h-3 w-3" />
                    Convênio
                  </Label>
                  <Select 
                    value={filters.convenio} 
                    onValueChange={(value) => setFilters({ ...filters, convenio: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos Convênios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Convênios</SelectItem>
                      {availableConvenios.map((conv) => (
                        <SelectItem key={conv} value={conv}>{conv}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Seleção de Campos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  2. Selecionar Campos
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedFields.length === EXPORTABLE_FIELDS.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                {EXPORTABLE_FIELDS.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`field-${field.id}`} 
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => handleToggleField(field.id)}
                    />
                    <Label 
                      htmlFor={`field-${field.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pronto para exportar</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredLeadsForExport.length} leads selecionados com {selectedFields.length} campos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            className="px-8 gap-2"
            onClick={handleExport} 
            disabled={filteredLeadsForExport.length === 0 || isExporting}
          >
            {isExporting ? (
              "Exportando..."
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar Planilha (CSV)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}