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
  Webhook, 
  Megaphone, 
  Percent, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Users,
  DollarSign
} from "lucide-react";
import { PaymentLaunch } from "./PaymentLaunch";

interface Webhook {
  id: number;
  name: string;
  url: string;
  description: string;
  is_active: boolean;
}

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
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [commissionTable, setCommissionTable] = useState<CommissionTable[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("webhooks");

  // Estados para formulários
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    description: ""
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: ""
  });

  const [commissionForm, setCommissionForm] = useState({
    bank_name: "",
    product_name: "",
    term: "",
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
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [webhooksRes, announcementsRes, commissionsRes, banksRes] = await Promise.all([
        supabase.from('webhooks').select('*').order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('commission_table').select('*').order('created_at', { ascending: false }),
        supabase.from('banks').select('*').order('name')
      ]);

      if (webhooksRes.data) setWebhooks(webhooksRes.data);
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (commissionsRes.data) setCommissionTable(commissionsRes.data);
      if (banksRes.data) setBanks(banksRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('webhooks')
          .update(webhookForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('webhooks')
          .insert([webhookForm]);
        if (error) throw error;
      }

      toast({
        title: "Webhook salvo com sucesso!",
        description: "As configurações foram atualizadas.",
      });

      setWebhookForm({ name: "", url: "", description: "" });
      setEditingItem(null);
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar webhook.",
        variant: "destructive",
      });
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
      loadData();
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
      const commissionData = {
        bank_name: commissionForm.bank_name,
        product_name: commissionForm.product_name,
        term: commissionForm.term || null,
        commission_percentage: parseFloat(commissionForm.commission_percentage),
        user_percentage: parseFloat(commissionForm.user_percentage || "0"),
        user_percentage_profile: commissionForm.user_percentage_profile || null,
        is_active: true,
        created_by: user?.id
      };

      // Use upsert to update existing or insert new
      const { error } = await supabase
        .from('commission_table')
        .upsert(commissionData);

      if (error) throw error;

      toast({
        title: "Regra de comissão salva!",
        description: "As regras foram atualizadas.",
      });

      setCommissionForm({
        bank_name: "",
        product_name: "",
        term: "",
        commission_percentage: "",
        user_percentage: "",
        user_percentage_profile: "",
        description: ""
      });
      setEditingItem(null);
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar regra de comissão.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (table: 'webhooks' | 'announcements' | 'commission_table', id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const deleteItem = async (table: 'webhooks' | 'announcements' | 'commission_table', id: string) => {
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
      loadData();
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
    if (type === 'webhook') {
      setWebhookForm({
        name: item.name,
        url: item.url,
        description: item.description
      });
      setActiveTab('webhooks');
    } else if (type === 'announcement') {
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
            Gerencie webhooks, avisos e comissões do sistema
          </p>
        </div>
        <Settings className="h-8 w-8 text-primary" />
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="announcements">Avisos</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            {isAdmin && <TabsTrigger value="payments">Pagamentos</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
          </TabsList>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Webhooks</h2>
            <Dialog open={isDialogOpen && activeTab === 'webhooks'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  setWebhookForm({ name: "", url: "", description: "" });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Webhook' : 'Novo Webhook'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-name">Nome *</Label>
                    <Input
                      id="webhook-name"
                      placeholder="withdrawal_request, client_indication..."
                      value={webhookForm.name}
                      onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url">URL *</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://..."
                      value={webhookForm.url}
                      onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-desc">Descrição</Label>
                    <Textarea
                      id="webhook-desc"
                      placeholder="Descrição do webhook..."
                      value={webhookForm.description}
                      onChange={(e) => setWebhookForm({ ...webhookForm, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveWebhook} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Webhook className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">{webhook.name}</h3>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{webhook.url}</p>
                      {webhook.description && (
                        <p className="text-xs text-muted-foreground">{webhook.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(webhook, 'webhook')}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={webhook.is_active ? "secondary" : "default"}
                        onClick={() => toggleActive('webhooks', webhook.id.toString(), webhook.is_active)}
                      >
                        {webhook.is_active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('webhooks', webhook.id.toString())}
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
                        {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
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

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Regras de Comissão</h2>
            <Dialog open={isDialogOpen && activeTab === 'commissions'} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  setCommissionForm({
                    bank_name: "",
                    product_name: "",
                    term: "",
                    commission_percentage: "",
                    user_percentage: "",
                    user_percentage_profile: "",
                    description: ""
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Regra' : 'Nova Regra de Comissão'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bank-name">Banco *</Label>
                    <Select value={commissionForm.bank_name} onValueChange={(value) => setCommissionForm({ ...commissionForm, bank_name: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Banco BRB">Banco BRB</SelectItem>
                        <SelectItem value="Credtz Serviços">Credtz Serviços</SelectItem>
                        <SelectItem value="Happy">Happy</SelectItem>
                        <SelectItem value="Picpay">Picpay</SelectItem>
                        <SelectItem value="QualiBank">QualiBank</SelectItem>
                        <SelectItem value="Facta">Facta</SelectItem>
                        <SelectItem value="Mercantil">Mercantil</SelectItem>
                        <SelectItem value="PAN">PAN</SelectItem>
                        <SelectItem value="Safra">Safra</SelectItem>
                        <SelectItem value="Digio">Digio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="product-name">Produto *</Label>
                    <Select value={commissionForm.product_name} onValueChange={(value) => setCommissionForm({ ...commissionForm, product_name: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Novo', 'Refinanciamento', 'Portabilidade', 'Refinanciamento da Portabilidade', 'Cartão de Crédito', 'Saque Complementar'].map(product => (
                          <SelectItem key={product} value={product}>
                            {product}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="term">Prazo</Label>
                    <Input
                      id="term"
                      placeholder="96x, 120x..."
                      value={commissionForm.term}
                      onChange={(e) => setCommissionForm({ ...commissionForm, term: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="commission-pct">Comissão Total (%) *</Label>
                      <Input
                        id="commission-pct"
                        type="number"
                        step="0.01"
                        placeholder="3.00"
                        value={commissionForm.commission_percentage}
                        onChange={(e) => setCommissionForm({ ...commissionForm, commission_percentage: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-pct">Repasse de Comissão (%) *</Label>
                      <Input
                        id="user-pct"
                        type="number"
                        step="0.01"
                        placeholder="2.50"
                        value={commissionForm.user_percentage}
                        onChange={(e) => setCommissionForm({ ...commissionForm, user_percentage: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="user-profile">Perfil do Usuário</Label>
                    <Select value={commissionForm.user_percentage_profile} onValueChange={(value) => setCommissionForm({ ...commissionForm, user_percentage_profile: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home_office_senior">Home Office Senior</SelectItem>
                        <SelectItem value="home_office_junior">Home Office Junior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="commission-desc">Descrição</Label>
                    <Textarea
                      id="commission-desc"
                      placeholder="Descrição da regra..."
                      value={commissionForm.description}
                      onChange={(e) => setCommissionForm({ ...commissionForm, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveCommission} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {commissionTable.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">{rule.bank_name} - {rule.product_name}</h3>
                        {rule.term && <span className="text-sm text-muted-foreground">({rule.term})</span>}
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Comissão Total: {rule.commission_percentage}% | Repasse: {rule.user_percentage}%
                      </p>
                      {rule.user_percentage_profile && (
                        <p className="text-xs text-muted-foreground">Perfil: {rule.user_percentage_profile}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Atualizado em: {new Date(rule.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(rule, 'commission')}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={rule.is_active ? "secondary" : "default"}
                        onClick={() => toggleActive('commission_table', rule.id, rule.is_active)}
                      >
                        {rule.is_active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('commission_table', rule.id)}
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

        {/* Payment Launch Tab */}
        {isAdmin && (
          <TabsContent value="payments" className="space-y-4">
            <PaymentLaunch />
          </TabsContent>
        )}

        {/* Users Management Tab */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Gerenciar Usuários
              </h2>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Criar novo usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      placeholder="Nome da empresa"
                      value={userForm.company}
                      onChange={(e) => setUserForm({ ...userForm, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nível da empresa</Label>
                    <Select
                      value={userForm.level}
                      onValueChange={(val) => setUserForm({ ...userForm, level: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home_office_senior">Home office Senior</SelectItem>
                        <SelectItem value="home_office_junior">Home office Junior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome do usuário</Label>
                    <Input
                      placeholder="Nome completo"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      placeholder="Defina uma senha temporária"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Chave Pix</Label>
                    <Input
                      placeholder="Informe a chave Pix"
                      value={userForm.pix_key}
                      onChange={(e) => setUserForm({ ...userForm, pix_key: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const { error } = await supabase.functions.invoke('admin-create-user', {
                        body: {
                          company: userForm.company,
                          level: userForm.level,
                          name: userForm.name,
                          email: userForm.email,
                          password: userForm.password,
                          pix_key: userForm.pix_key,
                        },
                      });
                      if (error) throw error;
                      toast({
                        title: 'Usuário criado com sucesso!',
                        description: 'O novo usuário já pode acessar a plataforma.',
                      });
                      setUserForm({ company: '', level: 'home_office_junior', name: '', email: '', password: '', pix_key: '' });
                    } catch (err: any) {
                      console.error('Erro ao criar usuário:', err);
                      toast({ title: 'Erro', description: err.message || 'Não foi possível criar o usuário.', variant: 'destructive' });
                    }
                  }}
                >
                  Criar usuário
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
