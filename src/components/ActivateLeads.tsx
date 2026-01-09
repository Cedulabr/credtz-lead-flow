import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ImportHistory } from '@/components/ImportHistory';
import { 
  Search, 
  Filter, 
  Upload, 
  RefreshCw, 
  Phone, 
  PhoneOff,
  User, 
  CalendarIcon, 
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  Zap,
  UserPlus,
  CheckSquare,
  Square,
  Shuffle,
  CalendarClock
} from 'lucide-react';
import { format, addDays, parseISO, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivateLead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  produto: string | null;
  status: string;
  assigned_to: string | null;
  company_id: string | null;
  motivo_recusa: string | null;
  data_proxima_operacao: string | null;
  ultima_interacao: string | null;
  proxima_acao: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Modern status configuration with vibrant colors
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  textColor: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  dotColor: string;
}> = {
  novo: { 
    label: 'Novo', 
    color: 'from-blue-500 to-blue-600', 
    textColor: 'text-blue-700', 
    bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    dotColor: 'bg-blue-500'
  },
  em_andamento: { 
    label: 'Em Andamento', 
    color: 'from-amber-500 to-orange-500', 
    textColor: 'text-amber-700', 
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100',
    borderColor: 'border-amber-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    dotColor: 'bg-amber-500'
  },
  fechado: { 
    label: 'Fechado', 
    color: 'from-emerald-500 to-green-500', 
    textColor: 'text-emerald-700', 
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100',
    borderColor: 'border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-emerald-500'
  },
  sem_possibilidade: { 
    label: 'Sem Possibilidade', 
    color: 'from-rose-500 to-red-500', 
    textColor: 'text-rose-700', 
    bgColor: 'bg-gradient-to-r from-rose-50 to-red-100',
    borderColor: 'border-rose-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-rose-500'
  },
  operacoes_recentes: { 
    label: 'Operações Recentes', 
    color: 'from-orange-500 to-amber-600', 
    textColor: 'text-orange-700', 
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-100',
    borderColor: 'border-orange-200',
    icon: <Clock className="h-3.5 w-3.5" />,
    dotColor: 'bg-orange-500'
  },
  fora_do_perfil: { 
    label: 'Fora do Perfil', 
    color: 'from-slate-500 to-gray-500', 
    textColor: 'text-slate-700', 
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-100',
    borderColor: 'border-slate-200',
    icon: <UserX className="h-3.5 w-3.5" />,
    dotColor: 'bg-slate-500'
  },
  contato_futuro: { 
    label: 'Contato Futuro', 
    color: 'from-purple-500 to-violet-500', 
    textColor: 'text-purple-700', 
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-100',
    borderColor: 'border-purple-200',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    dotColor: 'bg-purple-500'
  },
  nao_e_cliente: { 
    label: 'Não é o cliente', 
    color: 'from-gray-500 to-zinc-500', 
    textColor: 'text-gray-700', 
    bgColor: 'bg-gradient-to-r from-gray-50 to-zinc-100',
    borderColor: 'border-gray-200',
    icon: <UserX className="h-3.5 w-3.5" />,
    dotColor: 'bg-gray-500'
  },
  sem_interesse: { 
    label: 'Sem Interesse', 
    color: 'from-red-400 to-rose-500', 
    textColor: 'text-red-700', 
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-100',
    borderColor: 'border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-red-400'
  },
  sem_retorno: { 
    label: 'Sem retorno', 
    color: 'from-zinc-400 to-neutral-500', 
    textColor: 'text-zinc-700', 
    bgColor: 'bg-gradient-to-r from-zinc-50 to-neutral-100',
    borderColor: 'border-zinc-200',
    icon: <PhoneOff className="h-3.5 w-3.5" />,
    dotColor: 'bg-zinc-400'
  },
};

const ORIGEM_OPTIONS = ['site', 'aplicativo', 'importacao', 'indicacao'];
const ITEMS_PER_PAGE = 10;

export const ActivateLeads = () => {
  const { user, profile, isAdmin } = useAuth();
  const [leads, setLeads] = useState<ActivateLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [gestorId, setGestorId] = useState<string | null>(null);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPullLeadsModalOpen, setIsPullLeadsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isFutureContactModalOpen, setIsFutureContactModalOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<ActivateLead | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dataProximaOperacao, setDataProximaOperacao] = useState<Date | undefined>();
  const [valorOfertado, setValorOfertado] = useState('');
  
  // Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<{ nome: string; telefone: string }[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Pull leads states
  const [pullSource, setPullSource] = useState<string>('');
  const [pullCount, setPullCount] = useState(10);
  const [pulling, setPulling] = useState(false);

  // Assign lead states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<ActivateLead | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Bulk selection states
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkAssignMode, setBulkAssignMode] = useState<'single' | 'distribute'>('single');
  const [selectedBulkUsers, setSelectedBulkUsers] = useState<string[]>([]);
  const [maxLeadsPerUser, setMaxLeadsPerUser] = useState<number>(10);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const isGestor = gestorId !== null;
  const canImport = isAdmin || isGestor;

  const fetchGestorId = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Evita maybeSingle() (pode falhar se houver múltiplos vínculos como gestor)
      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('company_role', 'gestor')
        .eq('is_active', true);

      if (error) throw error;

      // Se for gestor em qualquer empresa, habilita permissões de gestor
      setGestorId(data && data.length > 0 ? user.id : null);
    } catch (error) {
      console.error('Error checking gestor role:', error);
      setGestorId(null);
    }
  }, [user?.id]);

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Para Gestor: primeiro buscar os IDs dos usuários da mesma empresa
      let companyUserIds: string[] = [];
      
      if (isGestor && !isAdmin) {
        // Buscar empresas do gestor
        const { data: gestorCompanies } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('company_role', 'gestor')
          .eq('is_active', true);
        
        if (gestorCompanies && gestorCompanies.length > 0) {
          const companyIds = gestorCompanies.map(gc => gc.company_id);
          
          // Buscar usuários dessas empresas
          const { data: companyUsers } = await supabase
            .from('user_companies')
            .select('user_id')
            .in('company_id', companyIds)
            .eq('is_active', true);
          
          if (companyUsers) {
            companyUserIds = [...new Set(companyUsers.map(cu => cu.user_id))];
          }
        }
      }

      let query = supabase
        .from('activate_leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Regra de visibilidade:
      // - Admin vê todos os leads
      // - Gestor vê leads atribuídos aos usuários da sua empresa
      // - Usuário comum só vê leads atribuídos a ele
      if (!isAdmin) {
        if (isGestor && companyUserIds.length > 0) {
          // Gestor vê leads atribuídos aos usuários da sua empresa
          query = query.in('assigned_to', companyUserIds);
        } else if (!isGestor) {
          // Usuário comum só vê seus próprios leads
          query = query.eq('assigned_to', user.id);
        } else {
          // Gestor sem usuários na empresa, não mostra nada
          setLeads([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads((data as ActivateLead[]) || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Erro ao carregar leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin, isGestor]);

  const fetchAvailableUsers = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingUsers(true);
    try {
      // Para Admin: buscar todos os usuários ativos
      if (isAdmin) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching all users:', error);
        } else if (profiles) {
          console.log('Usuários encontrados (admin):', profiles.length);
          setAvailableUsers(profiles.map(p => ({
            id: p.id,
            name: p.name || p.email || 'Sem nome',
            email: p.email || ''
          })));
        }
        return;
      }

      // Para Gestor: buscar usuários da mesma empresa
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      console.log('Empresas do usuário:', userCompanies, ucError);

      if (userCompanies && userCompanies.length > 0) {
        const companyIds = userCompanies.map(uc => uc.company_id);
        
        // Buscar todos os usuários das mesmas empresas
        const { data: companyUsers, error: cuError } = await supabase
          .from('user_companies')
          .select('user_id')
          .in('company_id', companyIds)
          .eq('is_active', true);

        console.log('Usuários das empresas:', companyUsers, cuError);

        if (companyUsers && companyUsers.length > 0) {
          const userIds = [...new Set(companyUsers.map(cu => cu.user_id))];
          
          // Buscar perfis dos usuários
          const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds)
            .eq('is_active', true)
            .order('name');

          console.log('Perfis encontrados:', profiles, profError);

          if (profiles) {
            setAvailableUsers(profiles.map(p => ({
              id: p.id,
              name: p.name || p.email || 'Sem nome',
              email: p.email || ''
            })));
          }
        }
      } else {
        // Fallback: se não tem empresa, buscar todos os usuários ativos
        console.log('Nenhuma empresa encontrada, buscando todos os usuários...');
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('is_active', true)
          .order('name');

        if (profiles) {
          setAvailableUsers(profiles.map(p => ({
            id: p.id,
            name: p.name || p.email || 'Sem nome',
            email: p.email || ''
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.id, isAdmin]);

  // Primeiro busca o papel de gestor
  useEffect(() => {
    fetchGestorId();
  }, [fetchGestorId]);

  // Depois que isAdmin e isGestor estão definidos, busca os leads
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Busca usuários disponíveis para atribuição se for admin ou gestor
  useEffect(() => {
    if (isAdmin || isGestor) {
      fetchAvailableUsers();
    }
  }, [isAdmin, isGestor, fetchAvailableUsers]);

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const canEditLead = (lead: ActivateLead) => {
    if (isAdmin) return true;
    if (isGestor) return true;
    // Colaborador só pode editar leads exclusivamente atribuídos a ele
    return lead.assigned_to === user?.id;
  };

  const canAssignLead = isAdmin || isGestor;

  // Bulk selection helpers
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
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
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  const getSelectedLeads = () => {
    return leads.filter(l => selectedLeadIds.has(l.id));
  };

  // Bulk assign handler
  const handleBulkAssign = async () => {
    if (selectedLeadIds.size === 0) return;
    
    setBulkAssigning(true);
    try {
      const selectedLeads = getSelectedLeads();
      
      if (bulkAssignMode === 'single' && selectedUserId) {
        // Assign all selected leads to a single user
        const leadIds = selectedLeads.map(l => l.id);
        
        const { error } = await supabase
          .from('activate_leads')
          .update({ 
            assigned_to: selectedUserId,
            ultima_interacao: new Date().toISOString()
          })
          .in('id', leadIds);

        if (error) throw error;

        // Record history for each lead
        const historyEntries = selectedLeads.map(lead => ({
          lead_id: lead.id,
          user_id: user!.id,
          action_type: 'bulk_assignment',
          from_status: lead.status,
          to_status: lead.status,
          notes: `Atribuição em massa para ${availableUsers.find(u => u.id === selectedUserId)?.name}`,
          metadata: { assigned_to: selectedUserId, assigned_by: user!.id, bulk: true }
        }));

        await supabase.from('activate_leads_history').insert(historyEntries);

        toast({
          title: 'Leads atribuídos!',
          description: `${selectedLeads.length} leads atribuídos para ${availableUsers.find(u => u.id === selectedUserId)?.name}`,
        });

      } else if (bulkAssignMode === 'distribute' && selectedBulkUsers.length > 0) {
        // Distribute leads among multiple users
        const leadsToDistribute = [...selectedLeads];
        const usersCount = selectedBulkUsers.length;
        const leadsPerUser = Math.min(
          Math.ceil(leadsToDistribute.length / usersCount),
          maxLeadsPerUser
        );

        const assignments: { leadId: string; userId: string }[] = [];
        let userIndex = 0;
        let userLeadCount = 0;

        for (const lead of leadsToDistribute) {
          if (userLeadCount >= leadsPerUser) {
            userIndex = (userIndex + 1) % usersCount;
            userLeadCount = 0;
          }
          
          assignments.push({
            leadId: lead.id,
            userId: selectedBulkUsers[userIndex]
          });
          userLeadCount++;
        }

        // Update leads in batches by user
        for (const userId of selectedBulkUsers) {
          const userLeadIds = assignments.filter(a => a.userId === userId).map(a => a.leadId);
          if (userLeadIds.length > 0) {
            const { error } = await supabase
              .from('activate_leads')
              .update({ 
                assigned_to: userId,
                ultima_interacao: new Date().toISOString()
              })
              .in('id', userLeadIds);

            if (error) throw error;
          }
        }

        // Record history
        const historyEntries = assignments.map(({ leadId, userId }) => {
          const lead = selectedLeads.find(l => l.id === leadId)!;
          return {
            lead_id: leadId,
            user_id: user!.id,
            action_type: 'bulk_distribution',
            from_status: lead.status,
            to_status: lead.status,
            notes: `Distribuição em massa para ${availableUsers.find(u => u.id === userId)?.name}`,
            metadata: { assigned_to: userId, assigned_by: user!.id, bulk: true, distribution: true }
          };
        });

        await supabase.from('activate_leads_history').insert(historyEntries);

        const summary = selectedBulkUsers.map(userId => {
          const count = assignments.filter(a => a.userId === userId).length;
          const userName = availableUsers.find(u => u.id === userId)?.name;
          return `${userName}: ${count}`;
        }).join(', ');

        toast({
          title: 'Distribuição concluída!',
          description: `${selectedLeads.length} leads distribuídos: ${summary}`,
        });
      }

      setIsBulkAssignModalOpen(false);
      clearSelection();
      setSelectedUserId('');
      setSelectedBulkUsers([]);
      fetchLeads();
    } catch (error: any) {
      console.error('Error in bulk assignment:', error);
      toast({
        title: 'Erro na atribuição em massa',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  const toggleBulkUserSelection = (userId: string) => {
    setSelectedBulkUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const openAssignModal = (lead: ActivateLead) => {
    setLeadToAssign(lead);
    setSelectedUserId(lead.assigned_to || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignLead = async () => {
    if (!leadToAssign || !user?.id) return;

    try {
      // Tratar 'none' como null para remover atribuição
      const assignedTo = (selectedUserId && selectedUserId !== 'none') ? selectedUserId : null;
      
      // Atualiza apenas assigned_to - status permanece inalterado
      const updateData: any = {
        assigned_to: assignedTo,
        ultima_interacao: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('activate_leads')
        .update(updateData)
        .eq('id', leadToAssign.id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('activate_leads_history').insert({
        lead_id: leadToAssign.id,
        user_id: user.id,
        action_type: 'assignment',
        from_status: leadToAssign.status,
        to_status: leadToAssign.status,
        notes: assignedTo 
          ? `Lead atribuído ao usuário ${availableUsers.find(u => u.id === assignedTo)?.name || assignedTo}`
          : 'Atribuição do lead removida',
        metadata: { assigned_to: assignedTo, assigned_by: user.id }
      });

      toast({
        title: assignedTo ? 'Lead atribuído!' : 'Atribuição removida',
        description: assignedTo 
          ? `Lead atribuído para ${availableUsers.find(u => u.id === assignedTo)?.name || 'usuário'}`
          : 'O lead agora está disponível para distribuição',
      });

      setIsAssignModalOpen(false);
      setLeadToAssign(null);
      setSelectedUserId('');
      fetchLeads();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      toast({
        title: 'Erro ao atribuir lead',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (lead: ActivateLead, status: string) => {
    if (!canEditLead(lead)) {
      toast({
        title: 'Sem permissão',
        description: 'Você só pode alterar leads que você trabalha.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLead(lead);
    setNewStatus(status);
    setMotivoRecusa('');
    setDataProximaOperacao(undefined);
    setValorOfertado('');

    if (status === 'sem_possibilidade' || status === 'fora_do_perfil') {
      setIsStatusModalOpen(true);
    } else if (status === 'operacoes_recentes') {
      setIsDateModalOpen(true);
    } else if (status === 'contato_futuro') {
      setIsFutureContactModalOpen(true);
    } else if (status === 'fechado') {
      await handleFechado(lead);
    } else {
      updateLeadStatus(lead, status);
    }
  };

  const handleFechado = async (lead: ActivateLead) => {
    try {
      // Get user's company first
      const { data: userCompanies, error: companyError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .limit(1);

      if (companyError) {
        console.error('Error fetching user company:', companyError);
      }

      const companyId = userCompanies?.[0]?.company_id || null;

      // Create client in "Meus Clientes" (propostas table)
      const { error: propostaError } = await supabase
        .from('propostas')
        .insert({
          "Nome do cliente": lead.nome,
          telefone: lead.telefone,
          pipeline_stage: "contato_iniciado",
          client_status: "cliente_intencionado",
          origem_lead: "activate_leads",
          created_by_id: user?.id,
          assigned_to: user?.id,
          company_id: companyId,
          notes: `Convertido de Activate Leads em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
        });

      if (propostaError) {
        console.error('Error creating proposta:', propostaError);
        throw propostaError;
      }

      // Update lead status only after successful proposta creation
      await updateLeadStatus(lead, 'fechado');

      toast({
        title: 'Cliente Fechado!',
        description: "Lead convertido e adicionado em Meus Clientes como 'Cliente Intencionado'.",
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error handling fechado:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao converter lead em cliente',
        variant: 'destructive',
      });
    }
  };

  const updateLeadStatus = async (lead: ActivateLead, status: string, extraData: Partial<ActivateLead> = {}) => {
    if (!user?.id) return;

    try {
      const updateData: any = {
        status,
        ultima_interacao: new Date().toISOString(),
        ...extraData,
      };

      // Auto-atribuir lead ao usuário se ainda não estiver atribuído (trava de exclusividade)
      if (!lead.assigned_to) {
        updateData.assigned_to = user.id;
      }

      const { error: updateError } = await supabase
        .from('activate_leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('activate_leads_history').insert({
        lead_id: lead.id,
        user_id: user.id,
        action_type: 'status_change',
        from_status: lead.status,
        to_status: status,
        notes: extraData.motivo_recusa || null,
        metadata: extraData.data_proxima_operacao 
          ? { data_proxima_operacao: extraData.data_proxima_operacao } 
          : null,
      });

      // Create notification for operacoes_recentes
      if (status === 'operacoes_recentes' && extraData.data_proxima_operacao) {
        await supabase.from('activate_leads_notifications').insert([
          {
            lead_id: lead.id,
            user_id: user.id,
            scheduled_date: extraData.data_proxima_operacao,
            notification_type: 'operacao_disponivel',
          },
          ...(gestorId ? [{
            lead_id: lead.id,
            user_id: gestorId,
            gestor_id: gestorId,
            scheduled_date: extraData.data_proxima_operacao,
            notification_type: 'operacao_disponivel',
          }] : []),
        ]);
      }

      toast({
        title: 'Status atualizado',
        description: `Lead atualizado para: ${STATUS_CONFIG[status]?.label || status}`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusModalSubmit = () => {
    if (!selectedLead || !motivoRecusa.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o motivo.',
        variant: 'destructive',
      });
      return;
    }

    updateLeadStatus(selectedLead, newStatus, { motivo_recusa: motivoRecusa });
    setIsStatusModalOpen(false);
  };

  const handleDateModalSubmit = () => {
    if (!selectedLead || !dataProximaOperacao) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione a data da próxima operação.',
        variant: 'destructive',
      });
      return;
    }

    updateLeadStatus(selectedLead, newStatus, { 
      data_proxima_operacao: format(dataProximaOperacao, 'yyyy-MM-dd'),
      proxima_acao: `Contato em ${format(dataProximaOperacao, 'dd/MM/yyyy')}`,
    });
    setIsDateModalOpen(false);
  };

  const handleFutureContactSubmit = () => {
    if (!selectedLead || !dataProximaOperacao) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione a data do contato futuro.',
        variant: 'destructive',
      });
      return;
    }

    updateLeadStatus(selectedLead, 'contato_futuro', { 
      data_proxima_operacao: format(dataProximaOperacao, 'yyyy-MM-dd'),
      proxima_acao: `Retornar contato em ${format(dataProximaOperacao, 'dd/MM/yyyy')}`,
    });
    setIsFutureContactModalOpen(false);
  };

  // Mensagens motivacionais para exibir ao gerar leads
  const MOTIVATIONAL_MESSAGES = [
    // 🔥 Motivação em Vendas
    'Cada "não" te aproxima do próximo "sim".',
    'Venda é constância, não sorte.',
    'Quem acredita no produto, vende com verdade.',
    'Meta não é pressão, é direção.',
    'Hoje é dia de fechar negócio.',
    'Disciplina vende mais que talento.',
    'O cliente sente quando você confia.',
    'Vendedor forte não desiste, ajusta.',
    'Venda é serviço, não insistência.',
    'Resultado é consequência da ação diária.',
    // 🚀 Crescimento Profissional
    'Evoluir um pouco todo dia muda tudo.',
    'Quem se prepara, se destaca.',
    'Profissional bom aprende. Excelente aplica.',
    'Seu crescimento começa na sua atitude.',
    'Conhecimento abre portas, ação atravessa.',
    'Seja referência, não apenas mais um.',
    'Crescer dói, mas ficar parado dói mais.',
    'Aprender é investir em si mesmo.',
    'Quem assume responsabilidade, assume o controle.',
    'O profissional do futuro começa hoje.',
    // 💼 Foco, Disciplina e Resultado
    'Sem foco, não há crescimento.',
    'Resultado gosta de rotina.',
    'Faça bem feito, mesmo quando ninguém vê.',
    'Pequenas ações geram grandes comissões.',
    'Profissional consistente vence o improviso.',
    'Quem acompanha números, melhora resultados.',
    'Trabalhe como dono, colha como líder.',
    'Persistência transforma metas em realidade.',
    'Seu esforço de hoje paga o amanhã.',
    'Compromisso gera confiança e sucesso.',
  ];

  const getRandomMotivationalMessage = () => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    return MOTIVATIONAL_MESSAGES[randomIndex];
  };

  const handleGenerateLeads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data: availableLeads, error } = await supabase
        .from('activate_leads')
        .select('*')
        .is('assigned_to', null)
        .eq('status', 'novo')
        .limit(3);

      if (error) throw error;

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: 'Sem leads disponíveis',
          description: 'Não há leads disponíveis para distribuição no momento.',
        });
        return;
      }

      const leadIds = availableLeads.map(l => l.id);
      
      const { error: updateError } = await supabase
        .from('activate_leads')
        .update({ assigned_to: user.id, ultima_interacao: new Date().toISOString() })
        .in('id', leadIds);

      if (updateError) throw updateError;

      const distributions = availableLeads.map(lead => ({
        lead_id: lead.id,
        user_id: user.id,
      }));

      await supabase.from('activate_leads_distribution').insert(distributions);

      // Exibir mensagem motivacional junto com a confirmação
      const motivationalMessage = getRandomMotivationalMessage();
      
      toast({
        title: `🚀 ${availableLeads.length} leads gerados!`,
        description: `💡 "${motivationalMessage}"`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error generating leads:', error);
      toast({
        title: 'Erro ao gerar leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim());
      
      const nomeIndex = headers.findIndex(h => h.includes('nome'));
      const telefoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('phone'));

      if (nomeIndex === -1 || telefoneIndex === -1) {
        toast({
          title: 'Formato inválido',
          description: 'O arquivo deve conter colunas "Nome" e "Telefone".',
          variant: 'destructive',
        });
        return;
      }

      const parsed = lines.slice(1).map(line => {
        const values = line.split(/[,;]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
        return {
          nome: values[nomeIndex] || '',
          telefone: normalizePhone(values[telefoneIndex] || ''),
        };
      }).filter(l => l.nome && l.telefone);

      setParsedLeads(parsed);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSV(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!user?.id || parsedLeads.length === 0 || !csvFile) return;

    setImporting(true);
    try {
      // Verificar duplicidade: nome + telefone
      const phonesToCheck = parsedLeads.map(l => normalizePhone(l.telefone));
      
      const { data: existingLeads, error: checkError } = await supabase
        .from('activate_leads')
        .select('id, nome, telefone, created_at')
        .in('telefone', phonesToCheck);

      if (checkError) throw checkError;

      // Criar mapa de leads existentes por nome+telefone
      const existingMap = new Map<string, { nome: string; telefone: string; created_at: string }>();
      (existingLeads || []).forEach(lead => {
        const key = `${lead.nome.toLowerCase().trim()}_${normalizePhone(lead.telefone)}`;
        existingMap.set(key, {
          nome: lead.nome,
          telefone: lead.telefone,
          created_at: lead.created_at
        });
      });

      // Separar leads válidos e duplicados
      const duplicates: Array<{ nome: string; telefone: string; importado_em: string }> = [];
      const validLeads: Array<{ nome: string; telefone: string }> = [];

      parsedLeads.forEach(lead => {
        const normalizedPhone = normalizePhone(lead.telefone);
        const key = `${lead.nome.toLowerCase().trim()}_${normalizedPhone}`;
        
        if (existingMap.has(key)) {
          const existing = existingMap.get(key)!;
          duplicates.push({
            nome: lead.nome,
            telefone: lead.telefone,
            importado_em: existing.created_at
          });
        } else {
          validLeads.push(lead);
          // Adicionar ao mapa para evitar duplicatas dentro do mesmo arquivo
          existingMap.set(key, { nome: lead.nome, telefone: lead.telefone, created_at: new Date().toISOString() });
        }
      });

      let successCount = 0;

      if (validLeads.length > 0) {
        const leadsToInsert = validLeads.map(lead => ({
          nome: lead.nome,
          telefone: normalizePhone(lead.telefone),
          origem: 'importacao',
          status: 'novo',
          created_by: user.id,
        }));

        const { error } = await supabase
          .from('activate_leads')
          .insert(leadsToInsert);

        if (error) throw error;
        successCount = validLeads.length;
      }

      // Registrar log de importação - buscar company_id correto (UUID)
      let companyId: string | null = null;
      
      // 1. Tentar buscar da tabela user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (userCompany?.company_id) {
        companyId = userCompany.company_id;
      } else if (profile?.company) {
        // 2. Fallback: buscar pelo nome da empresa
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', profile.company)
          .limit(1)
          .single();
        
        companyId = company?.id || null;
      }
      
      await supabase.from('import_logs').insert({
        module: 'activate_leads',
        file_name: csvFile.name,
        total_records: parsedLeads.length,
        success_count: successCount,
        error_count: 0,
        duplicate_count: duplicates.length,
        status: 'completed',
        imported_by: user.id,
        company_id: companyId,
        error_details: duplicates.length > 0 ? { duplicates: duplicates.slice(0, 100) } : null,
      });

      // Montar mensagem de resultado
      if (duplicates.length > 0) {
        const duplicateList = duplicates.slice(0, 5).map(d => 
          `• ${d.nome} (${formatPhone(d.telefone)}) - Importado em ${format(parseISO(d.importado_em), 'dd/MM/yyyy', { locale: ptBR })}`
        ).join('\n');

        toast({
          title: successCount > 0 ? 'Importação parcial' : 'Nenhum lead importado',
          description: (
            <div className="space-y-2">
              <p>{successCount} leads importados, {duplicates.length} duplicados.</p>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Ver duplicados</summary>
                <pre className="mt-2 whitespace-pre-wrap">{duplicateList}</pre>
                {duplicates.length > 5 && <p className="text-muted-foreground">e mais {duplicates.length - 5}...</p>}
              </details>
            </div>
          ),
          variant: successCount === 0 ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'Importação concluída!',
          description: `${successCount} leads foram importados com sucesso.`,
        });
      }

      setIsImportModalOpen(false);
      setCsvFile(null);
      setParsedLeads([]);
      fetchLeads();
    } catch (error: any) {
      console.error('Error importing leads:', error);
      
      // Registrar log de erro
      if (csvFile) {
        const companyId = profile?.company || null;
        await supabase.from('import_logs').insert({
          module: 'activate_leads',
          file_name: csvFile.name,
          total_records: parsedLeads.length,
          success_count: 0,
          error_count: parsedLeads.length,
          duplicate_count: 0,
          status: 'failed',
          imported_by: user.id,
          company_id: companyId,
          error_details: { message: error.message },
        });
      }
      
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const content = 'Nome,Telefone\nJoão Silva,11999998888\nMaria Santos,21988887777';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_activate_leads.csv';
    link.click();
  };

  // Filters - Exclusividade de leads por usuário
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesOrigem = origemFilter === 'all' || lead.origem === origemFilter;
      
      // Filtro por usuário (apenas para admin/gestor)
      const matchesUserFilter = userFilter === 'all' || 
        (userFilter === 'unassigned' ? lead.assigned_to === null : lead.assigned_to === userFilter);
      
      // Regra de exclusividade:
      // - Admin e Gestor veem todos os leads
      // - Colaborador vê apenas leads atribuídos a ele (exclusivos)
      // - Leads não atribuídos (assigned_to = null) só aparecem quando colaborador solicita via "Gerar Leads"
      const matchesUser = isAdmin || isGestor || lead.assigned_to === user?.id;
      
      return matchesSearch && matchesStatus && matchesOrigem && matchesUser && matchesUserFilter;
    });
  }, [leads, searchTerm, statusFilter, origemFilter, userFilter, isAdmin, isGestor, user?.id]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => ({
    total: filteredLeads.length,
    novos: filteredLeads.filter(l => l.status === 'novo').length,
    emAndamento: filteredLeads.filter(l => l.status === 'em_andamento').length,
    fechados: filteredLeads.filter(l => l.status === 'fechado').length,
    semPossibilidade: filteredLeads.filter(l => l.status === 'sem_possibilidade').length,
    alertas: filteredLeads.filter(l => 
      l.data_proxima_operacao && 
      (isToday(parseISO(l.data_proxima_operacao)) || isBefore(parseISO(l.data_proxima_operacao), new Date()))
    ).length,
  }), [filteredLeads]);

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Modern Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Activate Leads
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Gerencie e ative seus leads de múltiplas fontes
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchLeads}
              disabled={loading}
              className="hover:bg-primary/10"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            
            <Button 
              onClick={handleGenerateLeads} 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
            >
              <Zap className="h-4 w-4 mr-2" />
              Gerar Leads (3)
            </Button>
            
            {canImport && (
              <>
                <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="hover:bg-primary/10">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(true)} className="hover:bg-primary/10">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Puxar</span>
                </Button>
                <ImportHistory module="activate_leads" title="Activate Leads" />
              </>
            )}
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.novos}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Novos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.emAndamento}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.fechados}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Fechados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 border-rose-200 dark:border-rose-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-2">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.semPossibilidade}</p>
              <p className="text-xs text-rose-600 dark:text-rose-400">Sem Possibilidade</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.alertas}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Alertas</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modern Filters */}
      <Card className="border-2 border-muted/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 border-2 focus:border-primary">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Todos os Status
                    </span>
                  </SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", config.dotColor)}></span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={origemFilter} onValueChange={setOrigemFilter}>
                <SelectTrigger className="w-full md:w-40 border-2 focus:border-primary">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {ORIGEM_OPTIONS.map(origem => (
                    <SelectItem key={origem} value={origem}>
                      {origem.charAt(0).toUpperCase() + origem.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(isAdmin || isGestor) && (
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full md:w-48 border-2 focus:border-primary">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Todos Usuários
                      </span>
                    </SelectItem>
                    <SelectItem value="unassigned">
                      <span className="flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        Não Atribuídos
                      </span>
                    </SelectItem>
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {u.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {canAssignLead && selectedLeadIds.size > 0 && (
        <Card className="border-2 border-primary/50 bg-primary/5 shadow-lg animate-in slide-in-from-top-2">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                  <CheckSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedLeadIds.size} lead(s) selecionado(s)</p>
                  <p className="text-sm text-muted-foreground">Selecione uma ação para aplicar em massa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsBulkAssignModalOpen(true)}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Distribuir Leads
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modern Table */}
      <Card className="border-2 border-muted/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/60 hover:to-muted/40">
                {canAssignLead && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Origem</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Atribuído</TableHead>
                <TableHead className="font-semibold">Próxima Ação</TableHead>
                <TableHead className="font-semibold text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canAssignLead ? 8 : 7} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-muted to-muted/50 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground">Nenhum lead encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou gerar novos leads</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                  const hasAlert = lead.data_proxima_operacao && 
                    (isToday(parseISO(lead.data_proxima_operacao)) || 
                     isBefore(parseISO(lead.data_proxima_operacao), new Date()));
                  const isSelected = selectedLeadIds.has(lead.id);
                  const assignedUser = availableUsers.find(u => u.id === lead.assigned_to);
                  
                  return (
                    <TableRow 
                      key={lead.id} 
                      className={cn(
                        "group hover:bg-muted/30 transition-colors",
                        hasAlert && "bg-orange-50/50 dark:bg-orange-950/20",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      {canAssignLead && (
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                            aria-label={`Selecionar ${lead.nome}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{lead.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{formatPhone(lead.telefone)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium capitalize">
                          {lead.origem}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                          statusConfig.bgColor,
                          statusConfig.textColor,
                          statusConfig.borderColor
                        )}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignedUser ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm">{assignedUser.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Disponível
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.proxima_acao || (lead.data_proxima_operacao 
                          ? `Operação em ${format(parseISO(lead.data_proxima_operacao), "dd/MM/yyyy", { locale: ptBR })}`
                          : <span className="text-muted-foreground">-</span>)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`tel:${lead.telefone}`, '_self')}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank')}
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>

                          {/* Botão de contato futuro */}
                          {canEditLead(lead) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(lead, 'contato_futuro')}
                              className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-700"
                              title="Agendar contato futuro"
                            >
                              <CalendarClock className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Botão de atribuir - só para Gestor/Admin */}
                          {canAssignLead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAssignModal(lead)}
                              className="h-8 w-8 p-0 hover:bg-indigo-100 hover:text-indigo-700"
                              title={lead.assigned_to ? 'Reatribuir lead' : 'Atribuir lead'}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}

                          <Select 
                            value={lead.status}
                            onValueChange={(value) => handleStatusChange(lead, value)}
                            disabled={!canEditLead(lead)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", config.dotColor)}></span>
                                    {config.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Modern Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="hover:bg-primary/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Leads Activate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="hover:bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>
            
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste o arquivo CSV
                </p>
                {csvFile && (
                  <p className="mt-2 text-sm text-primary font-medium">{csvFile.name}</p>
                )}
              </label>
            </div>

            {parsedLeads.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 10).map((lead, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{lead.nome}</TableCell>
                        <TableCell className="font-mono">{formatPhone(lead.telefone)}</TableCell>
                      </TableRow>
                    ))}
                    {parsedLeads.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          ... e mais {parsedLeads.length - 10} leads
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportSubmit} 
              disabled={parsedLeads.length === 0 || importing}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {parsedLeads.length} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {newStatus === 'sem_possibilidade' ? (
                <XCircle className="h-5 w-5 text-rose-500" />
              ) : (
                <UserX className="h-5 w-5 text-slate-500" />
              )}
              {newStatus === 'sem_possibilidade' ? 'Sem Possibilidade' : 'Cliente Fora do Perfil'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm">
                <strong>Lead:</strong> {selectedLead?.nome}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (obrigatório)</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={4}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStatusModalSubmit} 
              disabled={!motivoRecusa.trim()}
              className="bg-gradient-to-r from-rose-500 to-red-500"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Modal */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Operações Recentes (INSS)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Selecione quando o cliente poderá realizar uma nova operação
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Data da Próxima Operação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2",
                      !dataProximaOperacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataProximaOperacao 
                      ? format(dataProximaOperacao, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataProximaOperacao}
                    onSelect={setDataProximaOperacao}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 365)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDateModalSubmit} 
              disabled={!dataProximaOperacao}
              className="bg-gradient-to-r from-orange-500 to-amber-500"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Future Contact Modal */}
      <Dialog open={isFutureContactModalOpen} onOpenChange={setIsFutureContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-purple-500" />
              Agendar Contato Futuro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <CalendarClock className="h-4 w-4 inline mr-2" />
                Agende uma data para retornar o contato com este cliente
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm">
                <strong>Lead:</strong> {selectedLead?.nome}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedLead?.telefone && formatPhone(selectedLead.telefone)}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Data do Contato Futuro</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2",
                      !dataProximaOperacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataProximaOperacao 
                      ? format(dataProximaOperacao, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataProximaOperacao}
                    onSelect={setDataProximaOperacao}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 365)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFutureContactModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFutureContactSubmit} 
              disabled={!dataProximaOperacao}
              className="bg-gradient-to-r from-purple-500 to-violet-500"
            >
              Agendar Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pull Leads Modal */}
      <Dialog open={isPullLeadsModalOpen} onOpenChange={setIsPullLeadsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Puxar Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Origem dos Leads</Label>
              <Select value={pullSource} onValueChange={setPullSource}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="aplicativo">Aplicativo</SelectItem>
                  <SelectItem value="base_antiga">Base Antiga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={pullCount}
                onChange={(e) => setPullCount(Number(e.target.value))}
                min={1}
                max={100}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: 'Em desenvolvimento',
                  description: 'Funcionalidade em implementação.',
                });
                setIsPullLeadsModalOpen(false);
              }}
              disabled={!pullSource || pulling}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {pulling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Puxar Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Atribuir Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {leadToAssign && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{leadToAssign.nome}</p>
                <p className="text-sm text-muted-foreground">{formatPhone(leadToAssign.telefone)}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Atribuir para</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <UserX className="h-4 w-4" />
                      Remover atribuição
                    </span>
                  </SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {u.name}
                        {u.email && <span className="text-xs text-muted-foreground">({u.email})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingUsers && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Carregando usuários...
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignLead}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Confirmar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={isBulkAssignModalOpen} onOpenChange={setIsBulkAssignModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-primary" />
              Distribuir {selectedLeadIds.size} Lead(s)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setBulkAssignMode('single')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  bulkAssignMode === 'single' 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold">Usuário Único</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Atribuir todos os leads selecionados para um único usuário
                </p>
              </button>
              
              <button
                onClick={() => setBulkAssignMode('distribute')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  bulkAssignMode === 'distribute' 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold">Distribuição</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Distribuir leads de forma equilibrada entre vários usuários
                </p>
              </button>
            </div>

            {/* Single User Mode */}
            {bulkAssignMode === 'single' && (
              <div className="space-y-2">
                <Label>Selecione o usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="border-2 focus:border-primary">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {u.name}
                          {u.email && <span className="text-xs text-muted-foreground">({u.email})</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Distribute Mode */}
            {bulkAssignMode === 'distribute' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Máximo de leads por usuário</Label>
                  <Input
                    type="number"
                    value={maxLeadsPerUser}
                    onChange={(e) => setMaxLeadsPerUser(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="border-2 focus:border-primary w-32"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Selecione os usuários para distribuição</Label>
                  <div className="border-2 rounded-lg max-h-64 overflow-y-auto">
                    {availableUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => toggleBulkUserSelection(u.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 transition-colors",
                          selectedBulkUsers.includes(u.id) 
                            ? "bg-primary/10" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedBulkUsers.includes(u.id)}
                          onCheckedChange={() => toggleBulkUserSelection(u.id)}
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedBulkUsers.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedBulkUsers.length} usuário(s) selecionado(s) • 
                      ~{Math.ceil(selectedLeadIds.size / selectedBulkUsers.length)} leads por usuário
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <h4 className="font-medium mb-2">Resumo da Distribuição</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Leads selecionados:</span>
                  <span className="ml-2 font-semibold">{selectedLeadIds.size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modo:</span>
                  <span className="ml-2 font-semibold">
                    {bulkAssignMode === 'single' ? 'Usuário único' : 'Distribuição'}
                  </span>
                </div>
                {bulkAssignMode === 'single' && selectedUserId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Atribuir para:</span>
                    <span className="ml-2 font-semibold">
                      {availableUsers.find(u => u.id === selectedUserId)?.name}
                    </span>
                  </div>
                )}
                {bulkAssignMode === 'distribute' && selectedBulkUsers.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Distribuir entre:</span>
                    <span className="ml-2 font-semibold">
                      {selectedBulkUsers.map(id => availableUsers.find(u => u.id === id)?.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkAssign}
              disabled={
                bulkAssigning || 
                (bulkAssignMode === 'single' && !selectedUserId) ||
                (bulkAssignMode === 'distribute' && selectedBulkUsers.length === 0)
              }
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {bulkAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Shuffle className="h-4 w-4 mr-2" />
              Distribuir Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
