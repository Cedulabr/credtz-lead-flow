import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCcw,
  Search,
  ArrowLeft
} from "lucide-react";

interface DailyLeadRequest {
  requested_by: string;
  user_name: string;
  user_email: string;
  request_date: string;
  total_leads: number;
  leads_novos: number;
  em_andamento: number;
  clientes_fechados: number;
  recusados: number;
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  convenio: string;
  status: string;
  requested_at: string;
  requested_by: string;
}

interface DailyLeadsTrackingProps {
  onBack: () => void;
}

export function DailyLeadsTracking({ onBack }: DailyLeadsTrackingProps) {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyData, setDailyData] = useState<DailyLeadRequest[]>([]);
  const [detailLeads, setDetailLeads] = useState<LeadDetail[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  const fetchDailyData = async () => {
    setIsLoading(true);
    try {
      // Fetch aggregated data from daily_lead_requests view
      const { data, error } = await supabase
        .from('daily_lead_requests')
        .select('*')
        .eq('request_date', selectedDate);

      if (error) throw error;
      setDailyData(data || []);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      setDailyData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserLeads = async (userId: string) => {
    setIsLoading(true);
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, convenio, status, requested_at, requested_by')
        .eq('requested_by', userId)
        .gte('requested_at', startOfDay)
        .lte('requested_at', endOfDay)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setDetailLeads(data || []);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user leads:', error);
      setDetailLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new_lead: { label: "Novo", className: "bg-blue-100 text-blue-700" },
      em_andamento: { label: "Em Andamento", className: "bg-amber-100 text-amber-700" },
      cliente_fechado: { label: "Fechado", className: "bg-emerald-100 text-emerald-700" },
      recusou_oferta: { label: "Recusou", className: "bg-rose-100 text-rose-700" },
      sem_interesse: { label: "Sem Interesse", className: "bg-yellow-100 text-yellow-700" },
      contato_futuro: { label: "Contato Futuro", className: "bg-purple-100 text-purple-700" },
      agendamento: { label: "Agendado", className: "bg-indigo-100 text-indigo-700" },
    };
    
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const totalLeadsToday = dailyData.reduce((sum, d) => sum + d.total_leads, 0);
  const totalClosed = dailyData.reduce((sum, d) => sum + d.clientes_fechados, 0);
  const totalRejected = dailyData.reduce((sum, d) => sum + d.recusados, 0);

  const filteredDetailLeads = detailLeads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">📊 Leads Retirados</h2>
            <p className="text-muted-foreground">Acompanhe os leads solicitados por usuário</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" onClick={fetchDailyData} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Retirados</p>
                <p className="text-3xl font-bold text-blue-700">{totalLeadsToday}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Usuários Ativos</p>
                <p className="text-3xl font-bold text-amber-700">{dailyData.length}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Fechados</p>
                <p className="text-3xl font-bold text-emerald-700">{totalClosed}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Recusados</p>
                <p className="text-3xl font-bold text-rose-700">{totalRejected}</p>
              </div>
              <XCircle className="h-10 w-10 text-rose-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leads por Usuário - {format(new Date(selectedDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !selectedUser ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dailyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum lead retirado nesta data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyData.map((item) => (
                  <div 
                    key={item.requested_by}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedUser === item.requested_by 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => fetchUserLeads(item.requested_by)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.user_name || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">{item.user_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{item.total_leads}</p>
                        <p className="text-xs text-muted-foreground">leads</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {item.leads_novos} novos
                      </Badge>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {item.em_andamento} andamento
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        {item.clientes_fechados} fechados
                      </Badge>
                      <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                        {item.recusados} recusados
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Detalhes dos Leads
              </span>
              {selectedUser && (
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Selecione um usuário para ver os detalhes</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDetailLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum lead encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Convênio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetailLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.convenio}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {lead.requested_at ? format(new Date(lead.requested_at), "HH:mm", { locale: ptBR }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}