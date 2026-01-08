import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Trash2,
  Users,
  ArrowLeft,
  RefreshCcw,
  Calendar,
  UserCheck,
  CheckSquare,
  Square,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  convenio: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  created_by?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface DistributedLeadsManagerProps {
  onBack: () => void;
}

export function DistributedLeadsManager({ onBack }: DistributedLeadsManagerProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user && isAdmin) {
      fetchLeads();
      fetchUsers();
    }
  }, [user, isAdmin]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Get unique dates from leads
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    leads.forEach(lead => {
      if (lead.created_at) {
        dates.add(format(new Date(lead.created_at), 'yyyy-MM-dd'));
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [leads]);

  // Get unique users from assigned leads
  const assignedUsers = useMemo(() => {
    const userIds = new Set<string>();
    leads.forEach(lead => {
      if (lead.assigned_to) {
        userIds.add(lead.assigned_to);
      }
    });
    return users.filter(u => userIds.has(u.id));
  }, [leads, users]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.cpf || "").includes(searchTerm) ||
        (lead.phone || "").includes(searchTerm);
      
      const matchesUser = userFilter === "all" || lead.assigned_to === userFilter;
      
      const matchesDate = dateFilter === "all" || 
        (lead.created_at && format(new Date(lead.created_at), 'yyyy-MM-dd') === dateFilter);
      
      return matchesSearch && matchesUser && matchesDate;
    });
  }, [leads, searchTerm, userFilter, dateFilter]);

  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;

    setIsProcessing(true);
    try {
      const idsToDelete = Array.from(selectedLeads);
      const batchSize = 100;
      
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase
          .from('leads')
          .delete()
          .in('id', batch);

        if (error) throw error;
      }

      toast({
        title: "Leads excluídos",
        description: `${idsToDelete.length} leads foram excluídos com sucesso.`,
      });

      setSelectedLeads(new Set());
      setShowDeleteDialog(false);
      fetchLeads();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir leads",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDistributeSelected = async () => {
    if (selectedLeads.size === 0 || !targetUserId) return;

    setIsProcessing(true);
    try {
      const idsToDistribute = Array.from(selectedLeads);
      const batchSize = 100;
      
      for (let i = 0; i < idsToDistribute.length; i += batchSize) {
        const batch = idsToDistribute.slice(i, i + batchSize);
        const { error } = await supabase
          .from('leads')
          .update({ assigned_to: targetUserId })
          .in('id', batch);

        if (error) throw error;
      }

      const targetUser = users.find(u => u.id === targetUserId);
      toast({
        title: "Leads redistribuídos",
        description: `${idsToDistribute.length} leads foram redistribuídos para ${targetUser?.name || 'usuário'}.`,
      });

      setSelectedLeads(new Set());
      setShowDistributeDialog(false);
      setTargetUserId("");
      fetchLeads();
    } catch (error) {
      console.error('Error distributing leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao redistribuir leads",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Sem atribuição';
  };

  if (!isAdmin) {
    return (
      <Card className="border-2 border-destructive/20">
        <CardContent className="p-8 text-center">
          <p className="text-destructive font-semibold">
            Acesso restrito a gestores e administradores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="h-10 px-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Gerenciar Leads Distribuídos</h2>
            <p className="text-muted-foreground">
              Excluir ou redistribuir leads já solicitados em massa
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={fetchLeads}
          disabled={isLoading}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full md:w-56">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {assignedUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-56">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                {availableDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={toggleSelectAll}
                className="font-semibold"
              >
                {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Desmarcar Todos
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Selecionar Todos ({filteredLeads.length})
                  </>
                )}
              </Button>
              
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedLeads.size} selecionado(s)
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDistributeDialog(true)}
                disabled={selectedLeads.size === 0}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Redistribuir
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedLeads.size === 0}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Selecionados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="border-2">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Atribuído a</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id}
                    className={selectedLeads.has(lead.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleSelectLead(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="font-mono text-sm">{lead.cpf}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.convenio}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {lead.assigned_to ? getUserName(lead.assigned_to) : 'Sem atribuição'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {lead.status || 'new_lead'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum lead encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground">
              Você está prestes a excluir <strong className="text-foreground">{selectedLeads.size}</strong> lead(s).
            </p>
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Esta ação não pode ser desfeita.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isProcessing}
            >
              {isProcessing ? "Excluindo..." : `Excluir ${selectedLeads.size} Lead(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Redistribuir Leads
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">
              Redistribuir <strong className="text-foreground">{selectedLeads.size}</strong> lead(s) para outro usuário.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione o usuário destino</label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDistributeSelected}
              disabled={isProcessing || !targetUserId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? "Redistribuindo..." : `Redistribuir ${selectedLeads.size} Lead(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
