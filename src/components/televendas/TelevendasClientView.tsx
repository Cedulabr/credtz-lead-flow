import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  FileText, 
  Clock, 
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { STATUS_CONFIG } from "./TelevendasFilters";

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  status: string;
  created_at: string;
  user?: { name: string } | null;
}

interface ClientViewProps {
  televendas: Televenda[];
  onClientClick: (cpf: string) => void;
  formatCPF: (cpf: string) => string;
  formatCurrency: (value: number) => string;
}

interface ClientGroup {
  cpf: string;
  nome: string;
  telefone: string;
  propostas: Televenda[];
  totalPropostas: number;
  valorTotal: number;
  ultimaAcao: string;
  statusFinal: string;
  vendedor: string | null;
}

export const TelevendasClientView = ({
  televendas,
  onClientClick,
  formatCPF,
  formatCurrency
}: ClientViewProps) => {
  // Group by CPF
  const clientGroups = useMemo(() => {
    const groups = new Map<string, ClientGroup>();
    
    televendas.forEach((tv) => {
      const cpf = tv.cpf.replace(/\D/g, "");
      
      if (!groups.has(cpf)) {
        groups.set(cpf, {
          cpf,
          nome: tv.nome,
          telefone: tv.telefone,
          propostas: [],
          totalPropostas: 0,
          valorTotal: 0,
          ultimaAcao: tv.created_at,
          statusFinal: tv.status,
          vendedor: tv.user?.name || null
        });
      }
      
      const group = groups.get(cpf)!;
      group.propostas.push(tv);
      group.totalPropostas++;
      group.valorTotal += tv.parcela || 0;
      
      // Update latest action
      if (new Date(tv.created_at) > new Date(group.ultimaAcao)) {
        group.ultimaAcao = tv.created_at;
        group.statusFinal = tv.status;
      }
    });
    
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.ultimaAcao).getTime() - new Date(a.ultimaAcao).getTime()
    );
  }, [televendas]);

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      shortLabel: status,
      color: "bg-gray-500/10 text-gray-600 border-gray-300"
    };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR");
  };

  if (clientGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum cliente encontrado</p>
        <p className="text-sm">Ajuste os filtros para ver resultados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clientGroups.map((client, index) => {
        const statusConfig = getStatusConfig(client.statusFinal);
        
        return (
          <motion.div
            key={client.cpf}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onClientClick(client.cpf)}
            className="
              group relative overflow-hidden
              p-4 md:p-5 rounded-xl border bg-card
              cursor-pointer transition-all duration-300
              hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]
            "
          >
            <div className="flex items-start justify-between gap-4">
              {/* Client info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base md:text-lg truncate">
                      {client.nome}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      CPF: ***.***.{client.cpf.slice(-6, -2)}-{client.cpf.slice(-2)}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{client.totalPropostas}</span>
                    <span>proposta{client.totalPropostas > 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold text-foreground">
                      {formatCurrency(client.valorTotal)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(client.ultimaAcao)}</span>
                  </div>
                </div>

                {/* Vendedor */}
                {client.vendedor && (
                  <p className="text-xs text-muted-foreground">
                    Vendedor: <span className="font-medium">{client.vendedor}</span>
                  </p>
                )}
              </div>

              {/* Status + Arrow */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusConfig.color}>
                  {statusConfig.shortLabel}
                </Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>

            {/* Hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
};
