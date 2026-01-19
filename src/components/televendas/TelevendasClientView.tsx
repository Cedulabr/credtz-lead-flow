import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Phone, 
  FileText, 
  Clock, 
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp
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
  user_id: string;
  user?: { name: string } | null;
}

interface ClientViewProps {
  televendas: Televenda[];
  onClientClick: (cpf: string) => void;
  formatCPF: (cpf: string) => string;
  formatCurrency: (value: number) => string;
  isGestorOrAdmin: boolean;
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
  vendedorId: string | null;
  // Status breakdown
  digitados: number;
  pagosAprovados: number;
  pagosAguardando: number;
  cancelados: number;
  pendentes: number;
}

interface VendedorGroup {
  vendedorId: string;
  vendedorName: string;
  clients: ClientGroup[];
  totalClientes: number;
  totalPropostas: number;
  valorTotal: number;
  digitados: number;
  pagosAprovados: number;
  pagosAguardando: number;
  cancelados: number;
  pendentes: number;
}

export const TelevendasClientView = ({
  televendas,
  onClientClick,
  formatCPF,
  formatCurrency,
  isGestorOrAdmin
}: ClientViewProps) => {
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);

  // Group by CPF first
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
          vendedor: tv.user?.name || null,
          vendedorId: tv.user_id || null,
          digitados: 0,
          pagosAprovados: 0,
          pagosAguardando: 0,
          cancelados: 0,
          pendentes: 0,
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

      // Count by status
      switch (tv.status) {
        case "proposta_digitada":
        case "solicitado_digitacao":
          group.digitados++;
          break;
        case "pago_aprovado":
        case "pago":
          group.pagosAprovados++;
          break;
        case "pago_aguardando":
          group.pagosAguardando++;
          break;
        case "cancelado_confirmado":
        case "cancelado":
        case "cancelado_aguardando":
          group.cancelados++;
          break;
        case "pendente":
        case "devolvido":
          group.pendentes++;
          break;
      }
    });
    
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.ultimaAcao).getTime() - new Date(a.ultimaAcao).getTime()
    );
  }, [televendas]);

  // Group by Vendedor for gestor view
  const vendedorGroups = useMemo(() => {
    if (!isGestorOrAdmin) return [];

    const groups = new Map<string, VendedorGroup>();

    clientGroups.forEach((client) => {
      const vendedorId = client.vendedorId || "sem-vendedor";
      const vendedorName = client.vendedor || "Sem vendedor";

      if (!groups.has(vendedorId)) {
        groups.set(vendedorId, {
          vendedorId,
          vendedorName,
          clients: [],
          totalClientes: 0,
          totalPropostas: 0,
          valorTotal: 0,
          digitados: 0,
          pagosAprovados: 0,
          pagosAguardando: 0,
          cancelados: 0,
          pendentes: 0,
        });
      }

      const group = groups.get(vendedorId)!;
      group.clients.push(client);
      group.totalClientes++;
      group.totalPropostas += client.totalPropostas;
      group.valorTotal += client.valorTotal;
      group.digitados += client.digitados;
      group.pagosAprovados += client.pagosAprovados;
      group.pagosAguardando += client.pagosAguardando;
      group.cancelados += client.cancelados;
      group.pendentes += client.pendentes;
    });

    return Array.from(groups.values()).sort((a, b) => b.totalPropostas - a.totalPropostas);
  }, [clientGroups, isGestorOrAdmin]);

  // Totals
  const totals = useMemo(() => {
    return clientGroups.reduce(
      (acc, client) => ({
        clientes: acc.clientes + 1,
        propostas: acc.propostas + client.totalPropostas,
        digitados: acc.digitados + client.digitados,
        pagosAprovados: acc.pagosAprovados + client.pagosAprovados,
        pagosAguardando: acc.pagosAguardando + client.pagosAguardando,
        cancelados: acc.cancelados + client.cancelados,
        pendentes: acc.pendentes + client.pendentes,
        valorTotal: acc.valorTotal + client.valorTotal,
      }),
      {
        clientes: 0,
        propostas: 0,
        digitados: 0,
        pagosAprovados: 0,
        pagosAguardando: 0,
        cancelados: 0,
        pendentes: 0,
        valorTotal: 0,
      }
    );
  }, [clientGroups]);

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

  // Summary Cards for Client View
  const SummaryCard = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Resumo de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
            <div className="text-center p-2 md:p-3 rounded-lg bg-background/60 border">
              <div className="text-xl md:text-2xl font-bold text-foreground">{totals.clientes}</div>
              <div className="text-xs text-muted-foreground">👥 Clientes</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-background/60 border">
              <div className="text-xl md:text-2xl font-bold text-foreground">{totals.propostas}</div>
              <div className="text-xs text-muted-foreground">📄 Propostas</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{totals.digitados}</div>
              <div className="text-xs text-muted-foreground">📝 Digitados</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-xl md:text-2xl font-bold text-amber-600">{totals.pagosAguardando}</div>
              <div className="text-xs text-muted-foreground">⏳ Aguardando</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-xl md:text-2xl font-bold text-green-600">{totals.pagosAprovados}</div>
              <div className="text-xs text-muted-foreground">✅ Pagos</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="text-xl md:text-2xl font-bold text-orange-600">{totals.pendentes}</div>
              <div className="text-xs text-muted-foreground">⚠️ Pendentes</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-xl md:text-2xl font-bold text-red-600">{totals.cancelados}</div>
              <div className="text-xs text-muted-foreground">❌ Cancelados</div>
            </div>
            <div className="text-center p-2 md:p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xl md:text-2xl font-bold text-emerald-600 text-sm md:text-base">
                {formatCurrency(totals.valorTotal)}
              </div>
              <div className="text-xs text-muted-foreground">💰 Valor</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Gestor View - Grouped by Vendedor
  if (isGestorOrAdmin && vendedorGroups.length > 0) {
    return (
      <div className="space-y-4">
        <SummaryCard />

        <div className="space-y-3">
          {vendedorGroups.map((vendedor, index) => (
            <motion.div
              key={vendedor.vendedorId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                {/* Vendedor Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedVendedor(
                    expandedVendedor === vendedor.vendedorId ? null : vendedor.vendedorId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{vendedor.vendedorName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {vendedor.totalClientes} cliente{vendedor.totalClientes !== 1 ? "s" : ""} • {vendedor.totalPropostas} proposta{vendedor.totalPropostas !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status badges */}
                      <div className="hidden md:flex items-center gap-1.5">
                        {vendedor.pagosAprovados > 0 && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            ✅ {vendedor.pagosAprovados}
                          </Badge>
                        )}
                        {vendedor.pagosAguardando > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">
                            ⏳ {vendedor.pagosAguardando}
                          </Badge>
                        )}
                        {vendedor.pendentes > 0 && (
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            ⚠️ {vendedor.pendentes}
                          </Badge>
                        )}
                        {vendedor.cancelados > 0 && (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            ❌ {vendedor.cancelados}
                          </Badge>
                        )}
                      </div>
                      
                      <Badge variant="outline" className="font-semibold">
                        {formatCurrency(vendedor.valorTotal)}
                      </Badge>

                      {expandedVendedor === vendedor.vendedorId ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Mobile status badges */}
                  <div className="flex md:hidden items-center gap-1.5 mt-3 flex-wrap">
                    {vendedor.digitados > 0 && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                        📝 {vendedor.digitados}
                      </Badge>
                    )}
                    {vendedor.pagosAguardando > 0 && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs animate-pulse">
                        ⏳ {vendedor.pagosAguardando}
                      </Badge>
                    )}
                    {vendedor.pagosAprovados > 0 && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        ✅ {vendedor.pagosAprovados}
                      </Badge>
                    )}
                    {vendedor.pendentes > 0 && (
                      <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                        ⚠️ {vendedor.pendentes}
                      </Badge>
                    )}
                    {vendedor.cancelados > 0 && (
                      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                        ❌ {vendedor.cancelados}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded Clients List */}
                <AnimatePresence>
                  {expandedVendedor === vendedor.vendedorId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t"
                    >
                      <div className="divide-y">
                        {vendedor.clients.map((client) => (
                          <ClientCard
                            key={client.cpf}
                            client={client}
                            onClientClick={onClientClick}
                            formatCPF={formatCPF}
                            formatCurrency={formatCurrency}
                            formatDate={formatDate}
                            getStatusConfig={getStatusConfig}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Regular user view - Simple client list
  return (
    <div className="space-y-4">
      <SummaryCard />

      <div className="space-y-3">
        {clientGroups.map((client, index) => (
          <motion.div
            key={client.cpf}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <ClientCard
              client={client}
              onClientClick={onClientClick}
              formatCPF={formatCPF}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusConfig={getStatusConfig}
              showVendedor
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Client Card Component
interface ClientCardProps {
  client: ClientGroup;
  onClientClick: (cpf: string) => void;
  formatCPF: (cpf: string) => string;
  formatCurrency: (value: number) => string;
  formatDate: (dateStr: string) => string;
  getStatusConfig: (status: string) => { label: string; shortLabel: string; color: string };
  showVendedor?: boolean;
}

const ClientCard = ({
  client,
  onClientClick,
  formatCPF,
  formatCurrency,
  formatDate,
  getStatusConfig,
  showVendedor = false,
}: ClientCardProps) => {
  const statusConfig = getStatusConfig(client.statusFinal);

  return (
    <div
      onClick={() => onClientClick(client.cpf)}
      className="
        group relative overflow-hidden
        p-4 bg-card
        cursor-pointer transition-all duration-300
        hover:bg-muted/50
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
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{client.totalPropostas}</span>
              <span className="hidden sm:inline">proposta{client.totalPropostas > 1 ? 's' : ''}</span>
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

          {/* Status breakdown */}
          <div className="flex flex-wrap items-center gap-1.5">
            {client.digitados > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                📝 {client.digitados}
              </Badge>
            )}
            {client.pagosAguardando > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                ⏳ {client.pagosAguardando}
              </Badge>
            )}
            {client.pagosAprovados > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                ✅ {client.pagosAprovados}
              </Badge>
            )}
            {client.pendentes > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                ⚠️ {client.pendentes}
              </Badge>
            )}
            {client.cancelados > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                ❌ {client.cancelados}
              </Badge>
            )}
          </div>

          {/* Vendedor */}
          {showVendedor && client.vendedor && (
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
    </div>
  );
};
