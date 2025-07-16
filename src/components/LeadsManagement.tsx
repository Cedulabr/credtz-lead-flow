import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Phone, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star,
  MapPin,
  DollarSign,
  Target,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export function LeadsManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [leads, setLeads] = useState([
    {
      id: 1,
      name: "Maria Silva",
      phone: "(11) 98765-4321",
      city: "São Paulo - SP",
      creditType: "Crédito Consignado INSS",
      value: "R$ 15.000",
      commission: "R$ 450",
      status: "new",
      priority: "alta",
      deadline: "2 dias",
      income: "R$ 3.200",
      createdAt: "2024-01-15"
    },
    {
      id: 2,
      name: "João Santos",
      phone: "(21) 99876-5432",
      city: "Rio de Janeiro - RJ",
      creditType: "Empréstimo Pessoal",
      value: "R$ 8.000",
      commission: "R$ 240",
      status: "contacted",
      priority: "média",
      deadline: "1 dia",
      income: "R$ 2.800",
      createdAt: "2024-01-14"
    },
    {
      id: 3,
      name: "Ana Costa",
      phone: "(31) 97654-3210",
      city: "Belo Horizonte - MG",
      creditType: "Crédito Imobiliário",
      value: "R$ 120.000",
      commission: "R$ 2.400",
      status: "proposal_sent",
      priority: "alta",
      deadline: "5 dias",
      income: "R$ 8.500",
      createdAt: "2024-01-13"
    },
    {
      id: 4,
      name: "Carlos Oliveira",
      phone: "(85) 96543-2109",
      city: "Fortaleza - CE",
      creditType: "Crédito Consignado",
      value: "R$ 25.000",
      commission: "R$ 750",
      status: "approved",
      priority: "alta",
      deadline: "Finalizado",
      income: "R$ 4.200",
      createdAt: "2024-01-10"
    },
    {
      id: 5,
      name: "Lucia Ferreira",
      phone: "(62) 95432-1098",
      city: "Goiânia - GO",
      creditType: "Empréstimo Pessoal",
      value: "R$ 12.000",
      commission: "R$ 360",
      status: "rejected",
      priority: "baixa",
      deadline: "Finalizado",
      income: "R$ 2.100",
      createdAt: "2024-01-08"
    }
  ]);

  const statusConfig = {
    new: { label: "Novo", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
    contacted: { label: "Contatado", color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
    proposal_sent: { label: "Proposta Enviada", color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50" },
    approved: { label: "Aprovado", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
    rejected: { label: "Recusado", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" }
  };

  const priorityConfig = {
    alta: { label: "Alta", color: "border-red-500 text-red-700" },
    média: { label: "Média", color: "border-yellow-500 text-yellow-700" },
    baixa: { label: "Baixa", color: "border-green-500 text-green-700" }
  };

  const updateLeadStatus = (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));

    toast({
      title: "Status atualizado!",
      description: `Lead atualizado para: ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.creditType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    inProgress: leads.filter(l => ["contacted", "proposal_sent"].includes(l.status)).length,
    completed: leads.filter(l => ["approved", "rejected"].includes(l.status)).length,
    totalCommission: leads
      .filter(l => l.status === "approved")
      .reduce((sum, lead) => sum + parseFloat(lead.commission.replace("R$ ", "").replace(".", "")), 0)
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Gerenciar Leads
          </h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie suas oportunidades de negócio
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.new}</p>
              <p className="text-sm text-muted-foreground">Novos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                R$ {stats.totalCommission.toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">Comissões</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cidade ou tipo de crédito..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="contacted">Contatados</SelectItem>
                  <SelectItem value="proposal_sent">Proposta Enviada</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Recusados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="média">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => {
          const status = statusConfig[lead.status as keyof typeof statusConfig];
          const priority = priorityConfig[lead.priority as keyof typeof priorityConfig];
          
          return (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Lead Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {lead.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4" />
                          {lead.city}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={priority.color}>
                          {priority.label}
                        </Badge>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.textColor} ${status.bgColor}`}>
                          {status.label}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo de Crédito</p>
                        <p className="font-medium">{lead.creditType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Solicitado</p>
                        <p className="font-medium">{lead.value}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Comissão</p>
                        <p className="font-medium text-success">{lead.commission}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Renda: {lead.income}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {lead.deadline}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                      className="flex-1 md:w-32"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Ligar
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
                      className="flex-1 md:w-32"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>

                    {lead.status === "new" && (
                      <Button
                        size="sm"
                        onClick={() => updateLeadStatus(lead.id, "contacted")}
                        className="flex-1 md:w-32"
                      >
                        Marcar Contatado
                      </Button>
                    )}

                    {lead.status === "contacted" && (
                      <Button
                        size="sm"
                        onClick={() => updateLeadStatus(lead.id, "proposal_sent")}
                        className="flex-1 md:w-32"
                      >
                        Proposta Enviada
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum lead encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou aguarde novos leads serem atribuídos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}