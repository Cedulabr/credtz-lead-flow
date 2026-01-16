import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Clock, 
  User, 
  ArrowRight, 
  Calendar, 
  XCircle, 
  CheckCircle,
  UserCheck,
  FileEdit,
  Plus,
  RefreshCcw,
  MessageCircle,
  Phone
} from "lucide-react";

interface HistoryEntry {
  action: string;
  timestamp: string;
  user_id?: string;
  user_name?: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  rejection_data?: {
    reason?: string;
    offered_value?: number;
    bank?: string;
    description?: string;
  };
  future_contact_date?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  previous_assigned_to?: string;
  previous_assigned_to_name?: string;
}

interface LeadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  history: HistoryEntry[];
  users: { id: string; name: string | null; email: string | null }[];
}

const STATUS_LABELS: Record<string, string> = {
  new_lead: "Novo Lead",
  em_andamento: "Em Andamento",
  aguardando_retorno: "Aguardando Retorno",
  cliente_fechado: "Cliente Fechado",
  recusou_oferta: "Recusado",
  contato_futuro: "Contato Futuro",
  agendamento: "Agendamento",
  nao_e_cliente: "Não é o cliente",
  sem_interesse: "Sem Interesse",
  sem_retorno: "Sem retorno",
  nao_e_whatsapp: "Não é WhatsApp"
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created: { label: "Lead Criado", icon: Plus, color: "bg-blue-100 text-blue-700 border-blue-200" },
  status_change: { label: "Mudança de Status", icon: RefreshCcw, color: "bg-amber-100 text-amber-700 border-amber-200" },
  assigned: { label: "Lead Atribuído", icon: UserCheck, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  digitacao_requested: { label: "Digitação Solicitada", icon: FileEdit, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  contact_scheduled: { label: "Contato Agendado", icon: Calendar, color: "bg-purple-100 text-purple-700 border-purple-200" },
  rejected: { label: "Lead Recusado", icon: XCircle, color: "bg-rose-100 text-rose-700 border-rose-200" },
  completed: { label: "Cliente Fechado", icon: CheckCircle, color: "bg-green-100 text-green-700 border-green-200" },
  call_made: { label: "Ligação Realizada", icon: Phone, color: "bg-sky-100 text-sky-700 border-sky-200" },
  whatsapp_sent: { label: "WhatsApp Enviado", icon: MessageCircle, color: "bg-green-100 text-green-700 border-green-200" },
};

export function LeadHistoryModal({ isOpen, onClose, leadName, history, users }: LeadHistoryModalProps) {
  const getUserName = (userId?: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    if (!userId) return "Sistema";
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || foundUser?.email || "Usuário";
  };

  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const isValidDate = (dateString?: string | null): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const formatDate = (dateString?: string | null, formatStr: string = "dd/MM/yyyy 'às' HH:mm"): string => {
    if (!dateString) return "Data não disponível";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Data inválida";
      return format(date, formatStr, { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const getActionConfig = (action?: string) => {
    if (!action) {
      return { 
        label: "Ação", 
        icon: Clock, 
        color: "bg-gray-100 text-gray-700 border-gray-200" 
      };
    }
    return ACTION_CONFIG[action] || { 
      label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      icon: Clock, 
      color: "bg-gray-100 text-gray-700 border-gray-200" 
    };
  };

  // Filter entries with valid timestamps, then sort (most recent first)
  const sortedHistory = [...(history || [])]
    .filter(entry => isValidDate(entry.timestamp))
    .sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico do Lead
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {leadName}
          </p>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum histórico registrado</p>
              <p className="text-sm">As movimentações do lead aparecerão aqui</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
              
              <div className="space-y-4">
                {sortedHistory.map((entry, index) => {
                  const config = getActionConfig(entry.action);
                  const ActionIcon = config.icon;
                  
                  return (
                    <div key={index} className="relative pl-14">
                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.color}`}>
                        <ActionIcon className="h-3 w-3" />
                      </div>
                      
                      <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className={`${config.color} font-semibold`}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        
                        {/* User info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {getUserName(entry.user_id, entry.user_name)}
                          </span>
                        </div>
                        
                        {/* Status change details */}
                        {entry.from_status && entry.to_status && (
                          <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2 my-2">
                            <Badge variant="secondary" className="text-xs">
                              {STATUS_LABELS[entry.from_status] || entry.from_status}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="default" className="text-xs">
                              {STATUS_LABELS[entry.to_status] || entry.to_status}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Assignment details */}
                        {entry.action === 'assigned' && (
                          <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-950/30 rounded-md px-3 py-2 my-2">
                            <span className="text-muted-foreground">
                              {entry.previous_assigned_to_name || 'Não atribuído'}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                              {entry.assigned_to_name || getUserName(entry.assigned_to)}
                            </span>
                          </div>
                        )}
                        
                        {/* Note */}
                        {entry.note && (
                          <p className="text-sm text-foreground/80 mt-2 italic">
                            "{entry.note}"
                          </p>
                        )}
                        
                        {/* Rejection details */}
                        {entry.rejection_data && (
                          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/30 rounded-md border border-rose-200 dark:border-rose-800 space-y-1">
                            {entry.rejection_data.bank && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Banco:</span>{' '}
                                <span className="font-medium">{entry.rejection_data.bank}</span>
                              </p>
                            )}
                            {entry.rejection_data.offered_value && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Valor ofertado:</span>{' '}
                                <span className="font-medium">{formatCurrency(entry.rejection_data.offered_value)}</span>
                              </p>
                            )}
                            {entry.rejection_data.description && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Motivo:</span>{' '}
                                <span className="font-medium">{entry.rejection_data.description}</span>
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Scheduled date info */}
                        {isValidDate(entry.future_contact_date) || isValidDate(entry.scheduled_date) ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Agendado para: {formatDate(
                                entry.scheduled_date || entry.future_contact_date, 
                                entry.scheduled_time ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
