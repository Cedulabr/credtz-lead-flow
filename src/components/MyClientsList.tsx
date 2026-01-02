import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users,
  Phone,
  MessageCircle,
  Pencil,
  History,
  Plus,
  Filter,
  Calendar,
  User,
  Search,
  Trash2,
  Clock,
  XCircle,
  Send,
  UserCheck,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Eye,
  FileEdit,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Client {
  id: number;
  "Nome do cliente": string | null;
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  convenio: string | null;
  valor_proposta: number | null;
  valor: string | null;
  pipeline_stage: string;
  client_status: string | null;
  origem_lead: string;
  status: string | null;
  created_by_id: string | null;
  assigned_to: string | null;
  company_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
  rejection_offered_value: number | null;
  rejection_description: string | null;
  future_contact_date: string | null;
  last_contact_date: string | null;
}

interface Interaction {
  id: string;
  interaction_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

interface UserCompany {
  id: string;
  company_id: string;
  company_role: 'gestor' | 'colaborador';
  companies?: {
    id: string;
    name: string;
  };
}

const clientStatuses = [
  { id: "cliente_intencionado", label: "Cliente Intencionado", icon: UserCheck, color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-100" },
  { id: "proposta_enviada", label: "Proposta Enviada", icon: Send, color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-100", hasAlert: true },
  { id: "proposta_digitada", label: "Proposta Digitada", icon: FileEdit, color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-100" },
  { id: "proposta_recusada", label: "Proposta Recusada", icon: XCircle, color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-100" },
  { id: "contato_futuro", label: "Contato Futuro", icon: CalendarClock, color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-100" },
];

const rejectionReasons = [
  { id: "desinteresse_valor", label: "Desinteresse no valor", requiresValue: true },
  { id: "pegar_depois", label: "Pensa em pegar mais pra frente", requiresValue: false, autoFollowUp: true },
  { id: "outros", label: "Outros", requiresDescription: true },
];

const convenioOptions = [
  "INSS",
  "Servidor Público Federal",
  "Servidor Público Estadual",
  "Servidor Público Municipal",
  "FGTS",
  "Forças Armadas",
  "SIAPE",
  "Outros"
];

export function MyClientsList() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  
  // Gestor state
  const [isGestor, setIsGestor] = useState(false);
  const [gestorCompanyIds, setGestorCompanyIds] = useState<string[]>([]);
  const [gestorId, setGestorId] = useState<string | null>(null);
  
  // New client form
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [savingNewClient, setSavingNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    convenio: "",
    observacao: "",
  });

  // Filters
  const [users, setUsers] = useState<Profile[]>([]);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterConvenio, setFilterConvenio] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterFutureContact, setFilterFutureContact] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete state
  const [deletingClient, setDeletingClient] = useState(false);

  // Edit form states
  const [editForm, setEditForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    whatsapp: "",
    convenio: "",
    valor_proposta: "",
    notes: "",
  });

  // Status change modals
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isFutureContactModalOpen, setIsFutureContactModalOpen] = useState(false);
  const [statusChangeClient, setStatusChangeClient] = useState<Client | null>(null);
  const [rejectionForm, setRejectionForm] = useState({
    reason: "",
    offeredValue: "",
    description: "",
  });
  const [futureContactDate, setFutureContactDate] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Mobile expanded row
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Check if user is Gestor
  useEffect(() => {
    const checkGestorStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("user_companies")
          .select("id, company_id, company_role, companies(id, name), user_id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        
        if (error) throw error;
        
        const gestorCompanies = (data || []).filter(uc => uc.company_role === 'gestor');
        setIsGestor(gestorCompanies.length > 0);
        setGestorCompanyIds(gestorCompanies.map(uc => uc.company_id));
        
        // Find gestor for the company
        if (gestorCompanies.length > 0) {
          const { data: gestorData } = await supabase
            .from("user_companies")
            .select("user_id")
            .in("company_id", gestorCompanies.map(uc => uc.company_id))
            .eq("company_role", "gestor")
            .eq("is_active", true)
            .limit(1);
          
          if (gestorData && gestorData.length > 0) {
            setGestorId(gestorData[0].user_id);
          }
        }
      } catch (error) {
        console.error("Error checking gestor status:", error);
      }
    };
    
    checkGestorStatus();
  }, [user?.id]);

  useEffect(() => {
    fetchClients();
    if (isAdmin || isGestor) {
      fetchUsers();
    }
  }, [isAdmin, isGestor, gestorCompanyIds]);

  const fetchUsers = async () => {
    try {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email")
          .order("name");
        
        if (error) throw error;
        setUsers(data || []);
      } else if (isGestor && gestorCompanyIds.length > 0) {
        const { data: companyUsers, error } = await supabase
          .from("user_companies")
          .select("user_id, profiles(id, name, email)")
          .in("company_id", gestorCompanyIds)
          .eq("is_active", true);
        
        if (error) throw error;
        
        const uniqueUsers = new Map<string, Profile>();
        (companyUsers || []).forEach(cu => {
          const profile = cu.profiles as unknown as Profile;
          if (profile && !uniqueUsers.has(profile.id)) {
            uniqueUsers.set(profile.id, profile);
          }
        });
        setUsers(Array.from(uniqueUsers.values()));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchClients = async () => {
    try {
      let query = supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false });

      if (isAdmin) {
        // Admin sees all
      } else if (isGestor && gestorCompanyIds.length > 0) {
        query = query.in("company_id", gestorCompanyIds);
      } else {
        query = query.or(`created_by_id.eq.${user?.id},assigned_to.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async (clientId: number) => {
    setLoadingInteractions(true);
    try {
      const { data, error } = await supabase
        .from("client_interactions")
        .select("*")
        .eq("proposta_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error("Error fetching interactions:", error);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const formatCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  };

  const formatCurrency = (value: number | string | null) => {
    if (!value) return "R$ 0,00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const getStatusInfo = (statusId: string | null) => {
    return clientStatuses.find(s => s.id === statusId) || clientStatuses[0];
  };

  // Check if client has pending proposal alert
  const hasPendingProposalAlert = (client: Client) => {
    return client.client_status === "proposta_enviada";
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setEditForm({
      nome: client["Nome do cliente"] || "",
      cpf: client.cpf || "",
      telefone: client.telefone || "",
      whatsapp: client.whatsapp || "",
      convenio: client.convenio || "",
      valor_proposta: client.valor_proposta?.toString() || client.valor || "",
      notes: client.notes || "",
    });
    fetchInteractions(client.id);
    setIsDetailDialogOpen(true);
    setIsEditMode(false);
  };

  const handleStatusChange = async (client: Client, newStatus: string) => {
    if (newStatus === "proposta_recusada") {
      setStatusChangeClient(client);
      setRejectionForm({ reason: "", offeredValue: "", description: "" });
      setIsRejectionModalOpen(true);
    } else if (newStatus === "contato_futuro") {
      setStatusChangeClient(client);
      setFutureContactDate("");
      setIsFutureContactModalOpen(true);
    } else {
      await updateClientStatus(client, newStatus);
    }
  };

  const updateClientStatus = async (client: Client, newStatus: string, metadata?: any) => {
    setSavingStatus(true);
    try {
      const updateData: any = {
        client_status: newStatus,
        last_contact_date: new Date().toISOString(),
      };

      if (metadata?.rejection_reason) {
        updateData.rejection_reason = metadata.rejection_reason;
        updateData.rejection_offered_value = metadata.rejection_offered_value || null;
        updateData.rejection_description = metadata.rejection_description || null;
      }

      if (metadata?.future_contact_date) {
        updateData.future_contact_date = metadata.future_contact_date;
      }

      const { error: updateError } = await supabase
        .from("propostas")
        .update(updateData)
        .eq("id", client.id);

      if (updateError) throw updateError;

      // Create interaction record
      const { error: interactionError } = await supabase
        .from("client_interactions")
        .insert({
          proposta_id: client.id,
          user_id: user?.id,
          interaction_type: "status_change",
          from_status: client.client_status,
          to_status: newStatus,
          notes: metadata?.notes || null,
          metadata: metadata || null,
        });

      if (interactionError) console.error("Error creating interaction:", interactionError);

      // Create notification for future contact
      if (newStatus === "contato_futuro" && metadata?.future_contact_date) {
        const { error: notificationError } = await supabase
          .from("contact_notifications")
          .insert({
            proposta_id: client.id,
            user_id: user?.id,
            gestor_id: gestorId,
            scheduled_date: metadata.future_contact_date,
          });

        if (notificationError) console.error("Error creating notification:", notificationError);
      }

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });

      fetchClients();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(false);
      setIsRejectionModalOpen(false);
      setIsFutureContactModalOpen(false);
      setStatusChangeClient(null);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!statusChangeClient) return;

    const selectedReason = rejectionReasons.find(r => r.id === rejectionForm.reason);
    if (!selectedReason) {
      toast({ title: "Erro", description: "Selecione um motivo", variant: "destructive" });
      return;
    }

    if (selectedReason.requiresValue && !rejectionForm.offeredValue) {
      toast({ title: "Erro", description: "Informe o valor ofertado", variant: "destructive" });
      return;
    }

    if (selectedReason.requiresDescription && !rejectionForm.description) {
      toast({ title: "Erro", description: "Descreva o motivo", variant: "destructive" });
      return;
    }

    // Calculate follow-up date for "pegar_depois" reason (30 days)
    let futureFollowUpDate: string | null = null;
    if (selectedReason.autoFollowUp) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 30);
      futureFollowUpDate = followUpDate.toISOString().split('T')[0];
    }

    await updateClientStatus(statusChangeClient, "proposta_recusada", {
      rejection_reason: rejectionForm.reason,
      rejection_offered_value: rejectionForm.offeredValue ? parseFloat(rejectionForm.offeredValue.replace(/\D/g, '')) / 100 : null,
      rejection_description: rejectionForm.description,
      notes: `Recusado: ${selectedReason.label}${rejectionForm.offeredValue ? ` - Valor: ${rejectionForm.offeredValue}` : ""}${rejectionForm.description ? ` - ${rejectionForm.description}` : ""}`,
      future_contact_date: futureFollowUpDate,
    });

    // Create automatic follow-up notification for "pegar_depois"
    if (selectedReason.autoFollowUp && futureFollowUpDate) {
      try {
        await supabase.from("contact_notifications").insert({
          proposta_id: statusChangeClient.id,
          user_id: user?.id,
          gestor_id: gestorId,
          scheduled_date: futureFollowUpDate,
        });

        // Create interaction record for the scheduled follow-up
        await supabase.from("client_interactions").insert({
          proposta_id: statusChangeClient.id,
          user_id: user?.id,
          interaction_type: "auto_follow_up_scheduled",
          notes: `Follow-up automático agendado para ${new Date(futureFollowUpDate).toLocaleDateString('pt-BR')} - Cliente pensa em pegar mais pra frente`,
          metadata: { scheduled_date: futureFollowUpDate, reason: "pegar_depois" },
        });

        toast({
          title: "Follow-up Agendado",
          description: `Contato automático agendado para ${new Date(futureFollowUpDate).toLocaleDateString('pt-BR')}`,
        });
      } catch (error) {
        console.error("Error creating auto follow-up:", error);
      }
    }
  };

  const handleFutureContactSubmit = () => {
    if (!statusChangeClient || !futureContactDate) {
      toast({ title: "Erro", description: "Selecione a data do contato", variant: "destructive" });
      return;
    }

    updateClientStatus(statusChangeClient, "contato_futuro", {
      future_contact_date: futureContactDate,
      notes: `Contato agendado para ${new Date(futureContactDate).toLocaleDateString('pt-BR')}`,
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          "Nome do cliente": editForm.nome,
          cpf: editForm.cpf,
          telefone: editForm.telefone,
          whatsapp: editForm.whatsapp,
          convenio: editForm.convenio,
          valor_proposta: parseFloat(editForm.valor_proposta.replace(/\D/g, '')) / 100 || null,
          notes: editForm.notes,
          last_contact_date: new Date().toISOString(),
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      // Create interaction
      await supabase.from("client_interactions").insert({
        proposta_id: selectedClient.id,
        user_id: user?.id,
        interaction_type: "edit",
        notes: "Dados do cliente atualizados",
      });

      toast({ title: "Sucesso", description: "Cliente atualizado!" });
      fetchClients();
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating client:", error);
      toast({ title: "Erro", description: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleNewClientSubmit = async () => {
    if (!newClientForm.nome.trim() || !newClientForm.telefone.trim()) {
      toast({ title: "Erro", description: "Preencha nome e telefone", variant: "destructive" });
      return;
    }

    setSavingNewClient(true);
    try {
      const companyId = gestorCompanyIds.length > 0 ? gestorCompanyIds[0] : null;
      
      const { data, error } = await supabase.from("propostas").insert({
        "Nome do cliente": newClientForm.nome,
        cpf: newClientForm.cpf,
        telefone: newClientForm.telefone,
        convenio: newClientForm.convenio,
        notes: newClientForm.observacao,
        pipeline_stage: "contato_iniciado",
        client_status: "cliente_intencionado",
        origem_lead: "ativo",
        created_by_id: user?.id,
        company_id: companyId,
      }).select().single();

      if (error) throw error;

      // Create initial interaction
      if (data) {
        await supabase.from("client_interactions").insert({
          proposta_id: data.id,
          user_id: user?.id,
          interaction_type: "created",
          to_status: "cliente_intencionado",
          notes: "Cliente cadastrado",
        });
      }

      toast({ title: "Sucesso", description: "Cliente cadastrado!" });
      setNewClientForm({ nome: "", cpf: "", telefone: "", convenio: "", observacao: "" });
      setIsNewClientDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error("Error creating client:", error);
      toast({ title: "Erro", description: "Erro ao cadastrar", variant: "destructive" });
    } finally {
      setSavingNewClient(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    
    setDeletingClient(true);
    try {
      const { error } = await supabase
        .from("propostas")
        .delete()
        .eq("id", selectedClient.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Cliente excluído!" });
      setIsDetailDialogOpen(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeletingClient(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  // Filter logic
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const nome = (c["Nome do cliente"] || "").toLowerCase();
        const cpf = (c.cpf || "").replace(/\D/g, "");
        const telefone = (c.telefone || "").replace(/\D/g, "");
        const queryClean = query.replace(/\D/g, "");
        
        return nome.includes(query) || 
               (queryClean && cpf.includes(queryClean)) ||
               (queryClean && telefone.includes(queryClean));
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.client_status === filterStatus);
    }

    // User filter (for admin/gestor)
    if ((isAdmin || isGestor) && filterUser !== "all") {
      filtered = filtered.filter(c => 
        c.created_by_id === filterUser || c.assigned_to === filterUser
      );
    }

    // Convenio filter
    if (filterConvenio !== "all") {
      filtered = filtered.filter(c => c.convenio === filterConvenio);
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at) >= new Date(filterDateFrom);
      });
    }

    if (filterDateTo) {
      filtered = filtered.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at) <= new Date(filterDateTo + 'T23:59:59');
      });
    }

    // Future contact filter
    if (filterFutureContact === "today") {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(c => c.future_contact_date === today);
    } else if (filterFutureContact === "week") {
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(c => {
        if (!c.future_contact_date) return false;
        const contactDate = new Date(c.future_contact_date);
        return contactDate >= today && contactDate <= weekFromNow;
      });
    } else if (filterFutureContact === "overdue") {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(c => {
        if (!c.future_contact_date) return false;
        return c.future_contact_date < today && c.client_status === "contato_futuro";
      });
    }

    return filtered;
  }, [clients, searchQuery, filterStatus, filterUser, filterConvenio, filterDateFrom, filterDateTo, filterFutureContact, isAdmin, isGestor]);

  // Get unique convenios
  const uniqueConvenios = useMemo(() => {
    const convenios = new Set<string>();
    clients.forEach(c => {
      if (c.convenio) convenios.add(c.convenio);
    });
    return Array.from(convenios).sort();
  }, [clients]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredClients.length;
    const byStatus = clientStatuses.reduce((acc, status) => {
      acc[status.id] = filteredClients.filter(c => c.client_status === status.id).length;
      return acc;
    }, {} as Record<string, number>);
    
    const today = new Date().toISOString().split('T')[0];
    const contactsToday = filteredClients.filter(c => c.future_contact_date === today).length;
    
    // Clients registered today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const registeredToday = clients.filter(c => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= todayStart;
    }).length;

    // Pending proposal alerts count
    const pendingProposals = filteredClients.filter(c => c.client_status === "proposta_enviada").length;
    
    return { total, byStatus, contactsToday, registeredToday, pendingProposals };
  }, [filteredClients, clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Meus Clientes</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gestão da carteira de clientes</p>
        </div>
        <Button onClick={() => setIsNewClientDialogOpen(true)} className="gap-2 w-full md:w-auto">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>

        {/* Indicador de cadastros do dia - visível para gestores */}
        {(isAdmin || isGestor) && (
          <Card className="p-3 border-primary/50 bg-primary/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.registeredToday}</p>
            <p className="text-xs text-muted-foreground">cadastros</p>
          </Card>
        )}

        {/* Alerta de propostas pendentes */}
        {stats.pendingProposals > 0 && (
          <Card className="p-3 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pendingProposals}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500">aguardando retorno</p>
          </Card>
        )}

        {clientStatuses.map(status => (
          <Card key={status.id} className={`p-3 ${status.id === "proposta_enviada" && stats.byStatus[status.id] > 0 ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}>
            <div className="flex items-center gap-2">
              <status.icon className={`h-4 w-4 ${status.textColor}`} />
              <span className="text-xs text-muted-foreground truncate">{status.label}</span>
            </div>
            <p className="text-2xl font-bold">{stats.byStatus[status.id] || 0}</p>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Toggle filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {clientStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(isAdmin || isGestor) && (
                <div>
                  <Label className="text-xs">Vendedor</Label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs">Convênio</Label>
                <Select value={filterConvenio} onValueChange={setFilterConvenio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueConvenios.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Contatos Agendados</Label>
                <Select value={filterFutureContact} onValueChange={setFilterFutureContact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Próximos 7 dias</SelectItem>
                    <SelectItem value="overdue">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Data de cadastro (de)</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Data de cadastro (até)</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Clients List - Desktop */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contato Futuro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map(client => {
                  const statusInfo = getStatusInfo(client.client_status);
                  const isOverdue = client.future_contact_date && client.future_contact_date < new Date().toISOString().split('T')[0] && client.client_status === "contato_futuro";
                  const hasPendingAlert = hasPendingProposalAlert(client);
                  
                  return (
                    <TableRow key={client.id} className={`hover:bg-muted/50 ${hasPendingAlert ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}`}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {hasPendingAlert && (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{client["Nome do cliente"] || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{client.cpf ? formatCPF(client.cpf) : "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{client.telefone ? formatPhone(client.telefone) : "—"}</span>
                          {client.telefone && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(client.telefone!)}>
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.convenio ? (
                          <Badge variant="outline">{client.convenio}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={client.client_status || "cliente_intencionado"}
                          onValueChange={(value) => handleStatusChange(client, value)}
                        >
                          <SelectTrigger className={`w-[180px] ${statusInfo.bgLight} ${statusInfo.textColor} border-0`}>
                            <div className="flex items-center gap-2">
                              <statusInfo.icon className="h-4 w-4" />
                              <span className="text-xs font-medium">{statusInfo.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {clientStatuses.map(status => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-2">
                                  <status.icon className={`h-4 w-4 ${status.textColor}`} />
                                  {status.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {client.future_contact_date ? (
                          <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                            <CalendarClock className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
                            {new Date(client.future_contact_date).toLocaleDateString('pt-BR')}
                            {isOverdue && <span className="text-xs">(Atrasado)</span>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleClientClick(client)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              handleClientClick(client);
                              setTimeout(() => setIsEditMode(true), 100);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {client.telefone && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => window.open(`tel:${client.telefone}`, "_self")}>
                                  <Phone className="h-4 w-4 mr-2" /> Ligar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openWhatsApp(client.telefone!)}>
                                  <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Clients List - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredClients.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum cliente encontrado
          </Card>
        ) : (
          filteredClients.map(client => {
            const statusInfo = getStatusInfo(client.client_status);
            const isExpanded = expandedRowId === client.id;
            const isOverdue = client.future_contact_date && client.future_contact_date < new Date().toISOString().split('T')[0] && client.client_status === "contato_futuro";
            const hasPendingAlert = hasPendingProposalAlert(client);

            return (
              <Card key={client.id} className={`overflow-hidden ${hasPendingAlert ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}>
                <div 
                  className={`p-4 cursor-pointer ${hasPendingAlert ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}`}
                  onClick={() => setExpandedRowId(isExpanded ? null : client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      {hasPendingAlert && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0 animate-pulse" />
                      )}
                      <div>
                        <p className="font-medium">{client["Nome do cliente"] || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{client.cpf ? formatCPF(client.cpf) : "—"}</p>
                        {hasPendingAlert && (
                          <p className="text-xs text-yellow-600 font-medium mt-1">⚠️ Cobrar retorno do cliente</p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusInfo.bgLight} ${statusInfo.textColor} border-0`}>
                      <statusInfo.icon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {client.telefone ? formatPhone(client.telefone) : "—"}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>

                  {isOverdue && (
                    <div className="flex items-center gap-1 mt-2 text-red-600 text-xs font-medium">
                      <CalendarClock className="h-3 w-3" />
                      Contato atrasado: {new Date(client.future_contact_date!).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-muted/30 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Convênio</span>
                        <span className="font-medium">{client.convenio || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Valor</span>
                        <span className="font-medium">{formatCurrency(client.valor_proposta || client.valor)}</span>
                      </div>
                      {client.future_contact_date && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-xs">Contato Agendado</span>
                          <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                            {new Date(client.future_contact_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status selector */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Alterar Status</Label>
                      <Select
                        value={client.client_status || "cliente_intencionado"}
                        onValueChange={(value) => handleStatusChange(client, value)}
                      >
                        <SelectTrigger className={`${statusInfo.bgLight} ${statusInfo.textColor} border-0`}>
                          <div className="flex items-center gap-2">
                            <statusInfo.icon className="h-4 w-4" />
                            <span>{statusInfo.label}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {clientStatuses.map(status => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <status.icon className={`h-4 w-4 ${status.textColor}`} />
                                {status.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleClientClick(client)}>
                        <Eye className="h-4 w-4 mr-1" /> Detalhes
                      </Button>
                      {client.telefone && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => window.open(`tel:${client.telefone}`, "_self")}>
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" onClick={() => openWhatsApp(client.telefone!)}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Cliente</span>
              <div className="flex gap-2">
                {(isAdmin || isGestor) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={deletingClient}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground">
                          {deletingClient ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button size="sm" variant="outline" onClick={() => setIsEditMode(!isEditMode)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {isEditMode ? "Cancelar" : "Editar"}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {isEditMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={editForm.cpf} onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
                  </div>
                  <div>
                    <Label>Convênio</Label>
                    <Select value={editForm.convenio} onValueChange={(v) => setEditForm({ ...editForm, convenio: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {convenioOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Proposta</Label>
                    <Input value={editForm.valor_proposta} onChange={(e) => setEditForm({ ...editForm, valor_proposta: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Observações</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleSaveEdit} className="w-full">Salvar Alterações</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <p className="font-medium">{selectedClient?.["Nome do cliente"] || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">CPF</Label>
                      <p className="font-medium">{selectedClient?.cpf ? formatCPF(selectedClient.cpf) : "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Telefone</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedClient?.telefone ? formatPhone(selectedClient.telefone) : "N/A"}</p>
                        {selectedClient?.telefone && (
                          <Button size="sm" variant="ghost" onClick={() => openWhatsApp(selectedClient.telefone!)}>
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Convênio</Label>
                      <p className="font-medium">{selectedClient?.convenio || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Proposta</Label>
                      <p className="font-medium">{formatCurrency(selectedClient?.valor_proposta || selectedClient?.valor)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Contato Futuro</Label>
                      <p className="font-medium">
                        {selectedClient?.future_contact_date 
                          ? new Date(selectedClient.future_contact_date).toLocaleDateString('pt-BR')
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedClient?.notes && (
                    <div>
                      <Label className="text-muted-foreground">Observações</Label>
                      <p className="text-sm">{selectedClient.notes}</p>
                    </div>
                  )}

                  {selectedClient?.rejection_reason && (
                    <Card className="p-4 bg-red-50 border-red-200">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <XCircle className="h-4 w-4" /> Motivo da Recusa
                      </h4>
                      <p className="text-sm mt-1">
                        {rejectionReasons.find(r => r.id === selectedClient.rejection_reason)?.label || selectedClient.rejection_reason}
                      </p>
                      {selectedClient.rejection_offered_value && (
                        <p className="text-sm">Valor ofertado: {formatCurrency(selectedClient.rejection_offered_value)}</p>
                      )}
                      {selectedClient.rejection_description && (
                        <p className="text-sm mt-1">{selectedClient.rejection_description}</p>
                      )}
                    </Card>
                  )}

                  {/* Interactions History */}
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <History className="h-4 w-4" /> Histórico de Interações
                    </h4>
                    {loadingInteractions ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : interactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma interação registrada</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {interactions.map(interaction => (
                          <div key={interaction.id} className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium capitalize">{interaction.interaction_type.replace('_', ' ')}</p>
                              {interaction.notes && <p className="text-muted-foreground">{interaction.notes}</p>}
                              <p className="text-xs text-muted-foreground">
                                {new Date(interaction.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cadastre um novo cliente na sua carteira</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newClientForm.nome}
                onChange={(e) => setNewClientForm({ ...newClientForm, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={newClientForm.cpf}
                onChange={(e) => setNewClientForm({ ...newClientForm, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={newClientForm.telefone}
                onChange={(e) => setNewClientForm({ ...newClientForm, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>Convênio</Label>
              <Select value={newClientForm.convenio} onValueChange={(v) => setNewClientForm({ ...newClientForm, convenio: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {convenioOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                value={newClientForm.observacao}
                onChange={(e) => setNewClientForm({ ...newClientForm, observacao: e.target.value })}
                placeholder="Anotações sobre o cliente..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewClientSubmit} disabled={savingNewClient}>
              {savingNewClient ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" /> Registrar Recusa
            </DialogTitle>
            <DialogDescription>Informe o motivo da recusa da proposta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Recusa *</Label>
              <Select value={rejectionForm.reason} onValueChange={(v) => setRejectionForm({ ...rejectionForm, reason: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {rejectionReasons.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {rejectionForm.reason === "desinteresse_valor" && (
              <div>
                <Label>Valor Ofertado *</Label>
                <Input
                  value={rejectionForm.offeredValue}
                  onChange={(e) => setRejectionForm({ ...rejectionForm, offeredValue: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>
            )}

            {rejectionForm.reason === "outros" && (
              <div>
                <Label>Descreva o motivo *</Label>
                <Textarea
                  value={rejectionForm.description}
                  onChange={(e) => setRejectionForm({ ...rejectionForm, description: e.target.value })}
                  placeholder="Descreva o motivo da recusa..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRejectionSubmit} disabled={savingStatus} variant="destructive">
              {savingStatus ? "Salvando..." : "Confirmar Recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Future Contact Modal */}
      <Dialog open={isFutureContactModalOpen} onOpenChange={setIsFutureContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <CalendarClock className="h-5 w-5" /> Agendar Contato Futuro
            </DialogTitle>
            <DialogDescription>O vendedor e o gestor serão notificados na data agendada</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data do Contato *</Label>
              <Input
                type="date"
                value={futureContactDate}
                onChange={(e) => setFutureContactDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFutureContactModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleFutureContactSubmit} disabled={savingStatus}>
              {savingStatus ? "Salvando..." : "Agendar Contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
