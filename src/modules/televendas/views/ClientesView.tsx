import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronRight, TrendingUp, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Televenda, STATUS_CONFIG } from "../types";
import { formatCPF, formatCurrency } from "../utils";

interface ClientesViewProps {
  televendas: Televenda[];
  onClientClick: (cpf: string) => void;
  isGestorOrAdmin: boolean;
}

interface ClientGroup {
  cpf: string;
  nome: string;
  propostas: Televenda[];
  valorTotal: number;
  ultimaAtualizacao: string;
  statusFinal: string;
  vendedor?: string;
}

const ITEMS_PER_PAGE = 10;

export const ClientesView = ({
  televendas,
  onClientClick,
  isGestorOrAdmin,
}: ClientesViewProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Group clients by CPF and sort alphabetically by name
  const clientGroups = useMemo(() => {
    const groups = new Map<string, ClientGroup>();

    televendas.forEach((tv) => {
      const cpfNormalized = tv.cpf.replace(/\D/g, "");
      
      if (!groups.has(cpfNormalized)) {
        groups.set(cpfNormalized, {
          cpf: cpfNormalized,
          nome: tv.nome,
          propostas: [],
          valorTotal: 0,
          ultimaAtualizacao: tv.created_at,
          statusFinal: tv.status,
          vendedor: tv.user?.name,
        });
      }

      const group = groups.get(cpfNormalized)!;
      group.propostas.push(tv);
      group.valorTotal += tv.parcela || 0;

      // Keep most recent update
      if (new Date(tv.created_at) > new Date(group.ultimaAtualizacao)) {
        group.ultimaAtualizacao = tv.created_at;
        group.statusFinal = tv.status;
      }
    });

    // Sort alphabetically by name (A-Z)
    return Array.from(groups.values()).sort(
      (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
    );
  }, [televendas]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [televendas]);

  // Calculate pagination
  const totalPages = Math.ceil(clientGroups.length / ITEMS_PER_PAGE);
  
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return clientGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [clientGroups, currentPage]);

  const getStatusSummary = (propostas: Televenda[]) => {
    const counts: Record<string, number> = {};
    propostas.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  if (clientGroups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 rounded-full bg-muted mb-4">
          <Users className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Nenhum cliente encontrado
        </h3>
        <p className="text-muted-foreground max-w-sm">
          Ajuste os filtros para ver clientes
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{clientGroups.length} cliente{clientGroups.length !== 1 ? 's' : ''} (A-Z)</span>
        <span>
          Total: {formatCurrency(clientGroups.reduce((sum, c) => sum + c.valorTotal, 0))}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {paginatedClients.map((client, index) => {
          const statusCounts = getStatusSummary(client.propostas);
          const hasPago = client.propostas.some(p => 
            p.status === "pago_aprovado" || p.status === "pago_aguardando" || p.status === "proposta_paga"
          );

          return (
            <motion.div
              key={client.cpf}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onClientClick(client.cpf)}
              className={`
                relative p-4 md:p-5 rounded-2xl border-2 cursor-pointer
                bg-card hover:bg-muted/50 transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                ${hasPago ? 'border-green-300 bg-green-500/5' : 'border-border/50'}
              `}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Client info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-semibold truncate">
                      {client.nome}
                    </h3>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {client.propostas.length} proposta{client.propostas.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatCPF(client.cpf)}
                  </p>
                  {/* Status badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(statusCounts).map(([status, count]) => {
                      const config = STATUS_CONFIG[status];
                      return (
                        <Badge
                          key={status}
                          variant="outline"
                          className={`text-xs ${config?.bgColor || ''} ${config?.color || ''}`}
                        >
                          {config?.emoji} {count}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Value and action */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-bold text-foreground flex items-center gap-1 justify-end">
                      {hasPago && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {formatCurrency(client.valorTotal)}
                    </p>
                    {isGestorOrAdmin && client.vendedor && (
                      <p className="text-xs text-muted-foreground">
                        👤 {client.vendedor}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
