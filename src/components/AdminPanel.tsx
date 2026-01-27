import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Megaphone, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Bell
} from "lucide-react";
import { UsersList } from "./UsersList";
import { ContaCorrente } from "./ContaCorrente";
import AdminIndicationsManagement from "./AdminIndicationsManagement";
import { AdminWhitelabel } from "./AdminWhitelabel";
import { AdminCompanies } from "./AdminCompanies";
import { AdminTelevendasBanks } from "./AdminTelevendasBanks";
import { AdminCommissionRules } from "./AdminCommissionRules";
import { AdminBankReuseSettings } from "./AdminBankReuseSettings";
import { AdminCreditsManagement } from "./AdminCreditsManagement";
import { AdminDuplicatesManager } from "./AdminDuplicatesManager";
import { AdminInactivitySettings } from "./AdminInactivitySettings";

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface CommissionTable {
  id: string;
  bank_name: string;
  product_name: string;
  term?: string;
  table_name?: string;
  commission_percentage: number;
  user_percentage: number;
  user_percentage_profile?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminPanel() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [commissionTable, setCommissionTable] = useState<CommissionTable[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showCommissionForm, setShowCommissionForm] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: ""
  });

  const [commissionForm, setCommissionForm] = useState({
    bank_name: "",
    product_name: "",
    term: "",
    table_name: "",
    commission_percentage: "",
    user_percentage: "",
    user_percentage_profile: "",
    description: ""
  });

  const [userForm, setUserForm] = useState({
    company: "",
    level: "home_office_junior",
    name: "",
    email: "",
    password: "",
    pix_key: "",
    cpf: "",
    phone: "",
  });

  const menuItems = [
    { id: 'announcements', label: 'Announcements', icon: Bell },
  ];

  useEffect(() => {
    fetchAnnouncements();
    fetchCommissionTable();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: "Error",
        description: "Error fetching announcements",
        variant: "destructive",
      });
    } else {
      setAnnouncements(data);
    }
  };

  const fetchCommissionTable = async () => {
    const { data, error } = await supabase
      .from('commission_table')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching commission table:', error);
      toast({
        title: "Error",
        description: "Error fetching commission table",
        variant: "destructive",
      });
    } else {
      setCommissionTable(data);
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([announcementForm]);
        if (error) throw error;
      }

      toast({
        title: "Aviso salvo com sucesso!",
        description: "O aviso foi publicado para os usuários.",
      });

      setAnnouncementForm({ title: "", content: "" });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao salvar aviso:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar aviso.",
        variant: "destructive",
      });
    }
  };

  const handleSaveCommission = async () => {
    try {
      // Validação dos campos obrigatórios
      if (!commissionForm.bank_name || !commissionForm.product_name || !commissionForm.commission_percentage) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha banco, produto e percentual de comissão.",
          variant: "destructive",
        });
        return;
      }

      if (!commissionForm.user_percentage_profile) {
        toast({
          title: "Nível obrigatório",
          description: "Selecione o nível do usuário (Bronze, Prata, Ouro ou Diamante).",
          variant: "destructive",
        });
        return;
      }

      const commissionData: any = {
        bank_name: commissionForm.bank_name,
        product_name: commissionForm.product_name,
        term: commissionForm.term || null,
        table_name: commissionForm.table_name || null,
        commission_percentage: parseFloat(commissionForm.commission_percentage),
        user_percentage: parseFloat(commissionForm.user_percentage || "0"),
        user_percentage_profile: commissionForm.user_percentage_profile,
        is_active: true,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };

      let error;

      if (editingItem?.id) {
        // Atualizar registro existente usando o ID
        const { error: updateError } = await supabase
          .from('commission_table')
          .update(commissionData)
          .eq('id', editingItem.id);
        error = updateError;
      } else {
        // Inserir novo registro
        const { error: insertError } = await supabase
          .from('commission_table')
          .insert(commissionData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: editingItem ? "Comissão atualizada!" : "Nova comissão criada!",
        description: `Regra para ${commissionForm.bank_name} - ${commissionForm.product_name} (${commissionForm.user_percentage_profile.toUpperCase()}) salva com sucesso.`,
      });

      setCommissionForm({
        bank_name: "",
        product_name: "",
        term: "",
        table_name: "",
        commission_percentage: "",
        user_percentage: "",
        user_percentage_profile: "",
        description: ""
      });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchCommissionTable();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar regra de comissão. Verifique se todos os campos estão preenchidos corretamente.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (table: 'announcements' | 'commission_table', id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      if (table === 'announcements') fetchAnnouncements();
      if (table === 'commission_table') fetchCommissionTable();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const deleteItem = async (table: 'announcements' | 'commission_table', id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Item excluído",
        description: "O item foi removido com sucesso.",
      });
      if (table === 'announcements') fetchAnnouncements();
      if (table === 'commission_table') fetchCommissionTable();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir item.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: any, type: string) => {
    setEditingItem(item);
    if (type === 'announcement') {
      setAnnouncementForm({
        title: item.title,
        content: item.content
      });
      setActiveTab('announcements');
    } else if (type === 'commission') {
      setCommissionForm({
        bank_name: item.bank_name || "",
        product_name: item.product_name,
        term: item.term || "",
        table_name: item.table_name || "",
        commission_percentage: item.commission_percentage.toString(),
        user_percentage: item.user_percentage.toString(),
        user_percentage_profile: item.user_percentage_profile || "",
        description: ""
      });
      setActiveTab('commissions');
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gerencie avisos e comissões do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Sair
          </Button>
          <Settings className="h-8 w-8 text-primary" />
        </div>
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-12' : 'grid-cols-1'}`}>
            <TabsTrigger value="announcements">Avisos</TabsTrigger>
            {isAdmin && <TabsTrigger value="duplicates">🗑️ Duplicatas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="credits">💰 Créditos</TabsTrigger>}
            {isAdmin && <TabsTrigger value="commission-rules">Regras Flexíveis</TabsTrigger>}
            {isAdmin && <TabsTrigger value="companies">Empresas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="televendas-banks">Banco Televendas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="bank-reuse">Alertas por Banco</TabsTrigger>}
            {isAdmin && <TabsTrigger value="inactivity">⚠️ Inatividade</TabsTrigger>}
            {isAdmin && <TabsTrigger value="indications">Indicações</TabsTrigger>}
            {isAdmin && <TabsTrigger value="conta-corrente">Conta Corrente</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
            {isAdmin && <TabsTrigger value="whitelabel">Whitelabel</TabsTrigger>}
          </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Avisos</h2>
            <Dialog open={isDialogOpen && activeTab === 'announcements'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  setAnnouncementForm({ title: "", content: "" });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Aviso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Aviso' : 'Novo Aviso'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="announcement-title">Título *</Label>
                    <Input
                      id="announcement-title"
                      placeholder="Título do aviso..."
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="announcement-content">Conteúdo *</Label>
                    <Textarea
                      id="announcement-content"
                      placeholder="Conteúdo do aviso..."
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button onClick={handleSaveAnnouncement} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">{announcement.title}</h3>
                        <Badge variant={announcement.is_active ? "default" : "secondary"}>
                          {announcement.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground">
                        Criado em: {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(announcement, 'announcement')}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={announcement.is_active ? "secondary" : "default"}
                        onClick={() => toggleActive('announcements', announcement.id.toString(), announcement.is_active)}
                      >
                        {announcement.is_active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('announcements', announcement.id.toString())}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Duplicates Management Tab */}
        {isAdmin && (
          <TabsContent value="duplicates" className="space-y-4">
            <AdminDuplicatesManager />
          </TabsContent>
        )}

        {/* Credits Management Tab */}
        {isAdmin && (
          <TabsContent value="credits" className="space-y-4">
            <AdminCreditsManagement />
          </TabsContent>
        )}

        {/* Commission Rules Tab - Regras Flexíveis */}
        {isAdmin && (
          <TabsContent value="commission-rules" className="space-y-4">
            <AdminCommissionRules />
          </TabsContent>
        )}

        {/* Companies Tab */}
        {isAdmin && (
          <TabsContent value="companies" className="space-y-4">
            <AdminCompanies />
          </TabsContent>
        )}

        {/* Indications Management Tab */}
        {isAdmin && (
          <TabsContent value="indications" className="space-y-4">
            <AdminIndicationsManagement />
          </TabsContent>
        )}

        {/* Conta Corrente Tab */}
        {isAdmin && (
          <TabsContent value="conta-corrente" className="space-y-4">
            <ContaCorrente />
          </TabsContent>
        )}

        {isAdmin && (
          <>
            <TabsContent value="televendas-banks">
              <AdminTelevendasBanks />
            </TabsContent>

            <TabsContent value="bank-reuse">
              <AdminBankReuseSettings />
            </TabsContent>

            <TabsContent value="inactivity">
              <AdminInactivitySettings />
            </TabsContent>

            <TabsContent value="users">
              <UsersList />
            </TabsContent>

            <TabsContent value="whitelabel">
              <AdminWhitelabel />
            </TabsContent>
          </>
        )}
        </Tabs>
    </div>
  );
}