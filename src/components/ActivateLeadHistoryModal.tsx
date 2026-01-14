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
  Plus,
  RefreshCcw,
  RotateCcw,
  ImageIcon,
  Shuffle,
  UserPlus
} from "lucide-react";

interface ActivateLeadHistoryEntry {
  id: string;
  lead_id: string;
  user_id: string;
  action_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface ActivateLeadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  history: ActivateLeadHistoryEntry[];
  users: { id: string; name: string; email: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_andamento: "Em Andamento",
  segunda_tentativa: "Segunda Tentativa",
  fechado: "Fechado",
  sem_possibilidade: "Sem Possibilidade",
  operacoes_recentes: "Operações Recentes",
  fora_do_perfil: "Fora do Perfil",
  contato_futuro: "Contato Futuro",
  nao_e_cliente: "Não é o cliente",
  sem_interesse: "Sem Interesse",
  sem_retorno: "Sem retorno"
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created: { label: "Lead Criado", icon: Plus, color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" },
  status_change: { label: "Mudança de Status", icon: RefreshCcw, color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300" },
  assignment: { label: "Lead Atribuído", icon: UserCheck, color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300" },
  bulk_assignment: { label: "Atribuição em Massa", icon: Shuffle, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300" },
  bulk_distribution: { label: "Distribuição", icon: Shuffle, color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" },
  segunda_tentativa: { label: "Segunda Tentativa", icon: RotateCcw, color: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300" },
  contact_scheduled: { label: "Contato Agendado", icon: Calendar, color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300" },
  rejected: { label: "Recusado", icon: XCircle, color: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300" },
  completed: { label: "Fechado", icon: CheckCircle, color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300" },
  proof_uploaded: { label: "Comprovante Anexado", icon: ImageIcon, color: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300" },
};

export function ActivateLeadHistoryModal({ isOpen, onClose, leadName, history, users }: ActivateLeadHistoryModalProps) {
  const getUserName = (userId?: string) => {
    if (!userId) return "Sistema";
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || foundUser?.email || "Usuário";
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { 
      label: action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      icon: Clock, 
      color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300" 
    };
  };

  // Sort history by timestamp (most recent first)
  const sortedHistory = [...(history || [])].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            📜 Histórico do Lead
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            👤 {leadName}
          </p>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">📭 Nenhum histórico registrado</p>
              <p className="text-sm">As movimentações do lead aparecerão aqui</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
              
              <div className="space-y-4">
                {sortedHistory.map((entry, index) => {
                  const config = getActionConfig(entry.action_type);
                  const ActionIcon = config.icon;
                  
                  return (
                    <div key={entry.id || index} className="relative pl-14">
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
                            {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {/* User info */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {getUserName(entry.user_id)}
                          </span>
                        </div>
                        
                        {/* Status change details */}
                        {entry.from_status && entry.to_status && entry.from_status !== entry.to_status && (
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
                        {(entry.action_type === 'assignment' || entry.action_type === 'bulk_assignment' || entry.action_type === 'bulk_distribution') && entry.metadata && (
                          <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-950/30 rounded-md px-3 py-2 my-2">
                            <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                              {entry.metadata.assigned_to 
                                ? `Atribuído para: ${getUserName(entry.metadata.assigned_to)}`
                                : 'Atribuição removida'}
                            </span>
                          </div>
                        )}
                        
                        {/* Note */}
                        {entry.notes && (
                          <p className="text-sm text-foreground/80 mt-2 bg-muted/30 rounded-md px-3 py-2 italic">
                            📝 "{entry.notes}"
                          </p>
                        )}
                        
                        {/* Proof details for segunda_tentativa */}
                        {entry.action_type === 'segunda_tentativa' && entry.metadata && (
                          <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-md border border-cyan-200 dark:border-cyan-800 space-y-2">
                            {entry.metadata.proof_type && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Tipo de contato:</span>{' '}
                                <span className="font-medium capitalize">{entry.metadata.proof_type}</span>
                              </p>
                            )}
                            {entry.metadata.attempt_number && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Tentativa nº:</span>{' '}
                                <span className="font-medium">{entry.metadata.attempt_number}</span>
                              </p>
                            )}
                            {entry.metadata.proof_url && (
                              <a 
                                href={entry.metadata.proof_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <ImageIcon className="h-3 w-3" />
                                Ver comprovante
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Scheduled date info */}
                        {entry.metadata?.data_proxima_operacao && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                            <Calendar className="h-4 w-4" />
                            <span>
                              📅 Agendado para: {format(
                                new Date(entry.metadata.data_proxima_operacao), 
                                'dd/MM/yyyy', 
                                { locale: ptBR }
                              )}
                            </span>
                          </div>
                        )}
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
