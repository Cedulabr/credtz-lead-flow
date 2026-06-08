import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, LeadFilters, PIPELINE_STAGES, UserProfile } from "../types";
import { Download, Calendar, Filter, User, Tag, Briefcase } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isAfter } from "date-fns";

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
  const [isExporting, setIsExporting] = useState(false);

  const filteredLeadsForExport = useMemo(() => {
    return leads.filter(lead => {
      // User filter
      if (filters.user !== "all") {
        if (lead.assigned_to !== filters.user && lead.created_by !== filters.user) {
          return false;
        }
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

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (filteredLeadsForExport.length === 0) return;

      const headers = ["Nome", "CPF", "Telefone", "Telefone 2", "Convênio", "Tag", "Status", "Data de Criação", "Atribuído a"];
      const csvContent = [
        headers.join(","),
        ...filteredLeadsForExport.map(lead => {
          const assignedUser = users.find(u => u.id === lead.assigned_to);
          return [
            `"${lead.name || ''}"`,
            `"${lead.cpf || ''}"`,
            `"${lead.phone || ''}"`,
            `"${lead.phone2 || ''}"`,
            `"${lead.convenio || ''}"`,
            `"${lead.tag || ''}"`,
            `"${PIPELINE_STAGES[lead.status]?.label || lead.status}"`,
            `"${format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}"`,
            `"${assignedUser?.name || assignedUser?.email || lead.assigned_to || 'Não atribuído'}"`
          ].join(",");
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
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Leads
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            {/* User Filter */}
            {(isAdmin || users.length > 1) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Usuário
                </Label>
                <Select 
                  value={filters.user} 
                  onValueChange={(value) => setFilters({ ...filters, user: value })}
                >
                  <SelectTrigger>
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

            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </Label>
              <Select 
                value={filters.dateFilter || "all"} 
                onValueChange={(value) => setFilters({ ...filters, dateFilter: value })}
              >
                <SelectTrigger>
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

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Status
              </Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
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

            {/* Convenio Filter */}
            {availableConvenios.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Convênio
                </Label>
                <Select 
                  value={filters.convenio} 
                  onValueChange={(value) => setFilters({ ...filters, convenio: value })}
                >
                  <SelectTrigger>
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
            )}

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tag
                </Label>
                <Select 
                  value={filters.tag} 
                  onValueChange={(value) => setFilters({ ...filters, tag: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Tags</SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg text-center">
            <p className="text-sm font-medium">Total de leads a exportar:</p>
            <p className="text-2xl font-bold">{filteredLeadsForExport.length}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={filteredLeadsForExport.length === 0 || isExporting}
          >
            {isExporting ? "Exportando..." : "Confirmar Exportação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}