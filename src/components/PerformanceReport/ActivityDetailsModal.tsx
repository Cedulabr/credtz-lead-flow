import { useState, useEffect } from "react";
import { X, FileText, DollarSign, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  startDate: Date;
  endDate: Date;
}

const maskCpf = (cpf: string | null): string => {
  if (!cpf) return "-";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length < 11) return cpf;
  return `***.***.${cleaned.slice(6, 9)}-**`;
};

const getActionTypeLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    create: "Criação de proposta",
    update: "Atualização",
    status_change: "Mudança de status",
    lead_created: "Lead criado",
    lead_updated: "Lead atualizado",
    payment: "Pagamento registrado",
    cancellation: "Cancelamento",
  };
  return labels[actionType] || actionType;
};

const getActionTypeBadgeColor = (actionType: string): string => {
  const colors: Record<string, string> = {
    create: "bg-blue-100 text-blue-800",
    payment: "bg-green-100 text-green-800",
    cancellation: "bg-red-100 text-red-800",
    update: "bg-yellow-100 text-yellow-800",
    status_change: "bg-purple-100 text-purple-800",
  };
  return colors[actionType] || "bg-gray-100 text-gray-800";
};

export function ActivityDetailsModal({
  isOpen,
  onClose,
  userId,
  userName,
  startDate,
  endDate,
}: ActivityDetailsModalProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchActivities();
    }
  }, [isOpen, userId, startDate, endDate]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch client interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from("client_interactions")
        .select(`
          id,
          interaction_type,
          from_status,
          to_status,
          notes,
          created_at,
          proposta_id,
          propostas!inner(
            "Nome do cliente",
            cpf,
            valor_proposta
          )
        `)
        .eq("user_id", userId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (interactionsError) throw interactionsError;

      // Fetch proposals created by user
      const { data: proposals, error: proposalsError } = await supabase
        .from("propostas")
        .select(`
          id,
          "Nome do cliente",
          cpf,
          valor_proposta,
          status,
          created_at
        `)
        .eq("created_by_id", userId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (proposalsError) throw proposalsError;

      // Fetch commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (commissionsError) throw commissionsError;

      // Combine and format activities
      const formattedActivities: ActivityLog[] = [];

      // Add proposal creations
      proposals?.forEach((proposal) => {
        formattedActivities.push({
          id: `proposal-${proposal.id}`,
          actionType: "create",
          clientName: proposal["Nome do cliente"],
          clientCpf: proposal.cpf,
          proposalNumber: `#${proposal.id}`,
          operationValue: proposal.valor_proposta,
          commissionValue: null,
          createdAt: proposal.created_at || "",
          fromStatus: null,
          toStatus: proposal.status,
        });
      });

      // Add interactions
      interactions?.forEach((interaction: any) => {
        formattedActivities.push({
          id: interaction.id,
          actionType: interaction.interaction_type || "status_change",
          clientName: interaction.propostas?.["Nome do cliente"],
          clientCpf: interaction.propostas?.cpf,
          proposalNumber: `#${interaction.proposta_id}`,
          operationValue: interaction.propostas?.valor_proposta,
          commissionValue: null,
          createdAt: interaction.created_at,
          fromStatus: interaction.from_status,
          toStatus: interaction.to_status,
        });
      });

      // Add commission records
      commissions?.forEach((commission) => {
        formattedActivities.push({
          id: commission.id,
          actionType: "payment",
          clientName: commission.client_name,
          clientCpf: commission.cpf,
          proposalNumber: commission.proposal_number,
          operationValue: commission.credit_value,
          commissionValue: commission.commission_amount,
          createdAt: commission.created_at,
          fromStatus: null,
          toStatus: "paga",
        });
      });

      // Sort by date
      formattedActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setActivities(formattedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Atividades de {userName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Período: {format(startDate, "dd/MM/yyyy", { locale: ptBR })} -{" "}
            {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma atividade encontrada no período selecionado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={getActionTypeBadgeColor(activity.actionType)}
                      >
                        {getActionTypeLabel(activity.actionType)}
                      </Badge>
                      {activity.proposalNumber && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {activity.proposalNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Cliente</p>
                      <p className="font-medium">
                        {activity.clientName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">CPF</p>
                      <p className="font-mono text-xs">
                        {maskCpf(activity.clientCpf)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Valor Operação</p>
                      <p className="font-medium">
                        {formatCurrency(activity.operationValue)}
                      </p>
                    </div>
                    {activity.commissionValue && (
                      <div>
                        <p className="text-muted-foreground text-xs">Comissão</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(activity.commissionValue)}
                        </p>
                      </div>
                    )}
                  </div>

                  {activity.fromStatus && activity.toStatus && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Status: </span>
                      <span className="text-red-600">{activity.fromStatus}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="text-green-600">{activity.toStatus}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
