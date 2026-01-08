import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Users,
  RefreshCw,
  CheckCircle
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  convenio: string;
  cpf: string;
  is_available: boolean;
  created_at: string;
}

export function LeadsDatabase() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchLeads();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterLeads();
  }, [searchTerm, leads]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('leads_database')
        .select('*', { count: 'exact', head: true });
      
      setTotalCount(count || 0);

      // Fetch leads with limit for performance
      const { data, error } = await supabase
        .from('leads_database')
        .select('id, name, phone, convenio, cpf, is_available, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível carregar a lista de leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = () => {
    if (!searchTerm.trim()) {
      setFilteredLeads(leads);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = leads.filter(lead => 
      lead.name?.toLowerCase().includes(term) ||
      lead.phone?.includes(term) ||
      lead.convenio?.toLowerCase().includes(term) ||
      lead.cpf?.includes(term)
    );
    setFilteredLeads(filtered);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;

    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedLeads);
      
      const { error } = await supabase
        .from('leads_database')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast({
        title: "Leads excluídos",
        description: `${idsToDelete.length} lead(s) foram excluídos com sucesso`,
      });

      setSelectedLeads(new Set());
      setShowDeleteDialog(false);
      fetchLeads();
    } catch (error: any) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir os leads selecionados",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return phone;
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (phone.length === 10) {
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Base de Leads Importados
            </CardTitle>
            <CardDescription>
              {totalCount} leads na base • Mostrando {filteredLeads.length} de {leads.length}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLeads} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {selectedLeads.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selectedLeads.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, convênio ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
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
                    <TableHead>Telefone</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Disponível</TableHead>
                    <TableHead>Importado em</TableHead>
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
                      <TableCell className="font-mono text-sm">{formatPhone(lead.phone)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.convenio}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.is_available ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {leads.length < totalCount && (
          <p className="text-sm text-muted-foreground text-center">
            Mostrando os 500 leads mais recentes. Use a busca para encontrar leads específicos.
          </p>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir <strong>{selectedLeads.size}</strong> lead(s) da base.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Atenção:</strong> Os leads excluídos não poderão ser recuperados e não serão 
              mais distribuídos aos usuários.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir {selectedLeads.size} Lead(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
