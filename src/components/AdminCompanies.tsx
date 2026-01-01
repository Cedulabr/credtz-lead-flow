import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Edit, Trash2, Users, Eye, EyeOff } from "lucide-react";
import { AdminCompanyUsers } from "./AdminCompanyUsers";

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

export function AdminCompanies() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: ""
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get user count for each company
      const companiesWithCount = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count } = await supabase
            .from('user_companies')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          
          return { ...company, user_count: count || 0 };
        })
      );

      setCompanies(companiesWithCount);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar empresas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome da empresa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            cnpj: formData.cnpj || null
          })
          .eq('id', editingCompany.id);

        if (error) throw error;

        toast({
          title: "Empresa atualizada!",
          description: `A empresa ${formData.name} foi atualizada com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            name: formData.name,
            cnpj: formData.cnpj || null
          });

        if (error) throw error;

        toast({
          title: "Empresa criada!",
          description: `A empresa ${formData.name} foi criada com sucesso.`,
        });
      }

      setIsDialogOpen(false);
      setFormData({ name: "", cnpj: "" });
      setEditingCompany(null);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar empresa.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      cnpj: company.cnpj || ""
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: company.is_active ? "Empresa desativada" : "Empresa ativada",
        description: `A empresa ${company.name} foi ${company.is_active ? 'desativada' : 'ativada'}.`,
      });

      fetchCompanies();
    } catch (error) {
      console.error('Error toggling company status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status da empresa.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (company: Company) => {
    if (company.user_count && company.user_count > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Remova todos os usuários da empresa antes de excluí-la.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a empresa ${company.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: "Empresa excluída",
        description: `A empresa ${company.name} foi excluída com sucesso.`,
      });

      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir empresa.",
        variant: "destructive",
      });
    }
  };

  const handleManageUsers = (company: Company) => {
    setSelectedCompany(company);
    setShowUsersDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresas
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as empresas e seus usuários
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCompany(null);
            setFormData({ name: "", cnpj: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Nome da Empresa *</Label>
                <Input
                  id="company-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="company-cnpj">CNPJ (opcional)</Label>
                <Input
                  id="company-cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <Button onClick={handleSaveCompany} className="w-full">
                {editingCompany ? 'Atualizar' : 'Criar Empresa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma empresa cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.cnpj || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {company.user_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageUsers(company)}
                          title="Gerenciar usuários"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(company)}
                          title={company.is_active ? "Desativar" : "Ativar"}
                        >
                          {company.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(company)}
                          title="Excluir"
                          disabled={company.user_count && company.user_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para gerenciar usuários da empresa */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Usuários de {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <AdminCompanyUsers 
              company={selectedCompany} 
              onUpdate={fetchCompanies}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
