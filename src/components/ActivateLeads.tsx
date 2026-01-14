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
import { ActivateLeadHistoryModal } from '@/components/ActivateLeadHistoryModal';
import { motion, AnimatePresence } from 'framer-motion';
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
  CalendarClock,
  RotateCcw,
  ImageIcon,
  Camera,
  FileImage,
  History
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
  segunda_tentativa?: boolean;
  segunda_tentativa_at?: string;
  segunda_tentativa_by?: string;
}

// Modern status configuration with vibrant colors and emojis
const STATUS_CONFIG: Record<string, { 
  label: string; 
  emoji: string;
  color: string; 
  textColor: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  dotColor: string;
}> = {
  novo: { 
    label: 'Novo', 
    emoji: '✨',
    color: 'from-blue-500 to-blue-600', 
    textColor: 'text-blue-700 dark:text-blue-300', 
    bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    dotColor: 'bg-blue-500'
  },
  em_andamento: { 
    label: 'Em Andamento', 
    emoji: '📞',
    color: 'from-amber-500 to-orange-500', 
    textColor: 'text-amber-700 dark:text-amber-300', 
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    dotColor: 'bg-amber-500'
  },
  segunda_tentativa: {
    label: 'Segunda Tentativa',
    emoji: '🔁',
    color: 'from-cyan-500 to-teal-500',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-gradient-to-r from-cyan-50 to-teal-100 dark:from-cyan-950 dark:to-teal-900',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    dotColor: 'bg-cyan-500'
  },
  fechado: { 
    label: 'Fechado', 
    emoji: '✅',
    color: 'from-emerald-500 to-green-500', 
    textColor: 'text-emerald-700 dark:text-emerald-300', 
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-emerald-500'
  },
  sem_possibilidade: { 
    label: 'Sem Possibilidade', 
    emoji: '❌',
    color: 'from-rose-500 to-red-500', 
    textColor: 'text-rose-700 dark:text-rose-300', 
    bgColor: 'bg-gradient-to-r from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900',
    borderColor: 'border-rose-200 dark:border-rose-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-rose-500'
  },
  operacoes_recentes: { 
    label: 'Operações Recentes', 
    emoji: '⏳',
    color: 'from-orange-500 to-amber-600', 
    textColor: 'text-orange-700 dark:text-orange-300', 
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: <Clock className="h-3.5 w-3.5" />,
    dotColor: 'bg-orange-500'
  },
  fora_do_perfil: { 
    label: 'Fora do Perfil', 
    emoji: '👤',
    color: 'from-slate-500 to-gray-500', 
    textColor: 'text-slate-700 dark:text-slate-300', 
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
    icon: <UserX className="h-3.5 w-3.5" />,
    dotColor: 'bg-slate-500'
  },
  contato_futuro: { 
    label: 'Contato Futuro', 
    emoji: '📅',
    color: 'from-purple-500 to-violet-500', 
    textColor: 'text-purple-700 dark:text-purple-300', 
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    dotColor: 'bg-purple-500'
  },
  nao_e_cliente: { 
    label: 'Não é o cliente', 
    emoji: '🚫',
    color: 'from-gray-500 to-zinc-500', 
    textColor: 'text-gray-700 dark:text-gray-300', 
    bgColor: 'bg-gradient-to-r from-gray-50 to-zinc-100 dark:from-gray-900 dark:to-zinc-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    icon: <UserX className="h-3.5 w-3.5" />,
    dotColor: 'bg-gray-500'
  },
  sem_interesse: { 
    label: 'Sem Interesse', 
    emoji: '😔',
    color: 'from-red-400 to-rose-500', 
    textColor: 'text-red-700 dark:text-red-300', 
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-red-400'
  },
  sem_retorno: { 
    label: 'Sem retorno', 
    emoji: '📵',
    color: 'from-zinc-400 to-neutral-500', 
    textColor: 'text-zinc-700 dark:text-zinc-300', 
    bgColor: 'bg-gradient-to-r from-zinc-50 to-neutral-100 dark:from-zinc-900 dark:to-neutral-800',
    borderColor: 'border-zinc-200 dark:border-zinc-700',
    icon: <PhoneOff className="h-3.5 w-3.5" />,
    dotColor: 'bg-zinc-400'
  },
};

const PROOF_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'ligacao', label: 'Ligação', emoji: '📞' },
  { value: 'mensagem', label: 'SMS/Mensagem', emoji: '📱' },
  { value: 'outro', label: 'Outro', emoji: '📎' },
];

const ORIGEM_OPTIONS = ['site', 'aplicativo', 'importacao', 'indicacao'];
const ITEMS_PER_PAGE = 10;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

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
  const [isSecondAttemptModalOpen, setIsSecondAttemptModalOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<ActivateLead | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dataProximaOperacao, setDataProximaOperacao] = useState<Date | undefined>();
  const [valorOfertado, setValorOfertado] = useState('');
  
  // Second attempt states
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofType, setProofType] = useState<string>('whatsapp');
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  
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

  // History modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState<ActivateLead | null>(null);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isGestor = gestorId !== null;
  const canImport = isAdmin || isGestor;

  const fetchGestorId = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('company_role', 'gestor')
        .eq('is_active', true);

      if (error) throw error;
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
      let companyUserIds: string[] = [];
      
      if (isGestor && !isAdmin) {
        const { data: gestorCompanies } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('company_role', 'gestor')
          .eq('is_active', true);
        
        if (gestorCompanies && gestorCompanies.length > 0) {
          const companyIds = gestorCompanies.map(gc => gc.company_id);
          
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

      if (!isAdmin) {
        if (isGestor && companyUserIds.length > 0) {
          query = query.in('assigned_to', companyUserIds);
        } else if (!isGestor) {
          query = query.eq('assigned_to', user.id);
        } else {
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
        title: '❌ Erro ao carregar leads',
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
      if (isAdmin) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching all users:', error);
        } else if (profiles) {
          setAvailableUsers(profiles.map(p => ({
            id: p.id,
            name: p.name || p.email || 'Sem nome',
            email: p.email || ''
          })));
        }
        return;
      }

      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (userCompanies && userCompanies.length > 0) {
        const companyIds = userCompanies.map(uc => uc.company_id);
        
        const { data: companyUsers, error: cuError } = await supabase
          .from('user_companies')
          .select('user_id')
          .in('company_id', companyIds)
          .eq('is_active', true);

        if (companyUsers && companyUsers.length > 0) {
          const userIds = [...new Set(companyUsers.map(cu => cu.user_id))];
          
          const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds)
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
      } else {
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

  useEffect(() => {
    fetchGestorId();
  }, [fetchGestorId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
    return lead.assigned_to === user?.id;
  };

  const canAssignLead = isAdmin || isGestor;

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

  const handleBulkAssign = async () => {
    if (selectedLeadIds.size === 0) return;
    
    setBulkAssigning(true);
    try {
      const selectedLeads = getSelectedLeads();
      
      if (bulkAssignMode === 'single' && selectedUserId) {
        const leadIds = selectedLeads.map(l => l.id);
        
        const { error } = await supabase
          .from('activate_leads')
          .update({ 
            assigned_to: selectedUserId,
            ultima_interacao: new Date().toISOString()
          })
          .in('id', leadIds);

        if (error) throw error;

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
          title: '✅ Leads atribuídos!',
          description: `${selectedLeads.length} leads atribuídos para ${availableUsers.find(u => u.id === selectedUserId)?.name}`,
        });

      } else if (bulkAssignMode === 'distribute' && selectedBulkUsers.length > 0) {
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
          title: '🔄 Distribuição concluída!',
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
        title: '❌ Erro na atribuição em massa',
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

  const openHistoryModal = async (lead: ActivateLead) => {
    setHistoryLead(lead);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    
    try {
      const { data, error } = await supabase
        .from('activate_leads_history')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeadHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching lead history:', error);
      toast({
        title: '❌ Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAssignLead = async () => {
    if (!leadToAssign || !user?.id) return;

    try {
      const assignedTo = (selectedUserId && selectedUserId !== 'none') ? selectedUserId : null;
      
      const updateData: any = {
        assigned_to: assignedTo,
        ultima_interacao: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('activate_leads')
        .update(updateData)
        .eq('id', leadToAssign.id);

      if (error) throw error;

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
        title: assignedTo ? '👤 Lead atribuído!' : '🔓 Atribuição removida',
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
        title: '❌ Erro ao atribuir lead',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (lead: ActivateLead, status: string) => {
    if (!canEditLead(lead)) {
      toast({
        title: '🔒 Sem permissão',
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
    setProofFile(null);
    setProofPreview(null);
    setProofNotes('');
    setProofType('whatsapp');

    if (status === 'segunda_tentativa') {
      setIsSecondAttemptModalOpen(true);
    } else if (status === 'sem_possibilidade' || status === 'fora_do_perfil') {
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

      await updateLeadStatus(lead, 'fechado');

      toast({
        title: '🎉 Cliente Fechado!',
        description: "Lead convertido e adicionado em Meus Clientes como 'Cliente Intencionado'.",
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error handling fechado:', error);
      toast({
        title: '❌ Erro',
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

      if (!lead.assigned_to) {
        updateData.assigned_to = user.id;
      }

      const { error: updateError } = await supabase
        .from('activate_leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) throw updateError;

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
        title: `${STATUS_CONFIG[status]?.emoji || '📋'} Status atualizado`,
        description: `Lead atualizado para: ${STATUS_CONFIG[status]?.label || status}`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: '❌ Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast({
          title: '⚠️ Formato inválido',
          description: 'Apenas arquivos JPG ou PNG são aceitos.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: '⚠️ Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 5MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setProofFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecondAttemptSubmit = async () => {
    if (!selectedLead || !user?.id) return;
    
    if (!proofFile) {
      toast({
        title: '📎 Comprovante obrigatório',
        description: 'É necessário anexar um print da conversa como comprovação.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingProof(true);
    try {
      // Upload file to storage
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${selectedLead.id}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('contact-proofs')
        .upload(filePath, proofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contact-proofs')
        .getPublicUrl(filePath);

      // Count existing attempts
      const { data: existingProofs, error: countError } = await supabase
        .from('activate_leads_contact_proofs')
        .select('id')
        .eq('lead_id', selectedLead.id);

      if (countError) throw countError;

      const attemptNumber = (existingProofs?.length || 0) + 1;

      // Insert proof record
      const { error: proofError } = await supabase
        .from('activate_leads_contact_proofs')
        .insert({
          lead_id: selectedLead.id,
          user_id: user.id,
          attempt_number: attemptNumber,
          proof_type: proofType,
          proof_url: publicUrl,
          file_name: proofFile.name,
          notes: proofNotes || null,
        });

      if (proofError) throw proofError;

      // Update lead status
      await supabase
        .from('activate_leads')
        .update({
          status: 'segunda_tentativa',
          segunda_tentativa: true,
          segunda_tentativa_at: new Date().toISOString(),
          segunda_tentativa_by: user.id,
          ultima_interacao: new Date().toISOString(),
        })
        .eq('id', selectedLead.id);

      // Add to history
      await supabase.from('activate_leads_history').insert({
        lead_id: selectedLead.id,
        user_id: user.id,
        action_type: 'segunda_tentativa',
        from_status: selectedLead.status,
        to_status: 'segunda_tentativa',
        notes: `Segunda tentativa de contato via ${PROOF_TYPES.find(p => p.value === proofType)?.label}. ${proofNotes || ''}`,
        metadata: { 
          proof_url: publicUrl, 
          proof_type: proofType,
          attempt_number: attemptNumber 
        },
      });

      toast({
        title: '🔁 Segunda tentativa registrada!',
        description: 'Comprovante anexado com sucesso.',
      });

      setIsSecondAttemptModalOpen(false);
      setProofFile(null);
      setProofPreview(null);
      setProofNotes('');
      setSelectedLead(null);
      fetchLeads();
    } catch (error: any) {
      console.error('Error submitting second attempt:', error);
      toast({
        title: '❌ Erro ao registrar tentativa',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleStatusModalSubmit = () => {
    if (!selectedLead || !motivoRecusa.trim()) {
      toast({
        title: '⚠️ Campo obrigatório',
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
        title: '⚠️ Campo obrigatório',
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
        title: '⚠️ Campo obrigatório',
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

  const MOTIVATIONAL_MESSAGES = [
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
          title: '📭 Sem leads disponíveis',
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

      const motivationalMessage = getRandomMotivationalMessage();
      
      toast({
        title: `🚀 ${availableLeads.length} leads gerados!`,
        description: `💡 "${motivationalMessage}"`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error generating leads:', error);
      toast({
        title: '❌ Erro ao gerar leads',
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
          title: '⚠️ Formato inválido',
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
      const phonesToCheck = parsedLeads.map(l => normalizePhone(l.telefone));
      
      const { data: existingLeads, error: checkError } = await supabase
        .from('activate_leads')
        .select('id, nome, telefone, created_at')
        .in('telefone', phonesToCheck);

      if (checkError) throw checkError;

      const existingMap = new Map<string, { nome: string; telefone: string; created_at: string }>();
      (existingLeads || []).forEach(lead => {
        const key = `${lead.nome.toLowerCase().trim()}_${normalizePhone(lead.telefone)}`;
        existingMap.set(key, {
          nome: lead.nome,
          telefone: lead.telefone,
          created_at: lead.created_at
        });
      });

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

      let companyId: string | null = null;
      
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

      if (duplicates.length > 0) {
        const duplicateList = duplicates.slice(0, 5).map(d => 
          `• ${d.nome} (${formatPhone(d.telefone)}) - Importado em ${format(parseISO(d.importado_em), 'dd/MM/yyyy', { locale: ptBR })}`
        ).join('\n');

        toast({
          title: successCount > 0 ? '⚠️ Importação parcial' : '❌ Nenhum lead importado',
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
          title: '✅ Importação concluída!',
          description: `${successCount} leads foram importados com sucesso.`,
        });
      }

      setIsImportModalOpen(false);
      setCsvFile(null);
      setParsedLeads([]);
      fetchLeads();
    } catch (error: any) {
      console.error('Error importing leads:', error);
      
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
        title: '❌ Erro na importação',
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

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesOrigem = origemFilter === 'all' || lead.origem === origemFilter;
      
      const matchesUserFilter = userFilter === 'all' || 
        (userFilter === 'unassigned' ? lead.assigned_to === null : lead.assigned_to === userFilter);
      
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
    segundaTentativa: filteredLeads.filter(l => l.status === 'segunda_tentativa').length,
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
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 md:p-6 space-y-6 pb-20 md:pb-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen"
    >
      {/* Modern Header */}
      <motion.div variants={itemVariants} className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              🚀 Activate Leads
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Gerencie e ative seus leads de múltiplas fontes
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchLeads}
              disabled={loading}
              className="hover:bg-primary/10 transition-all duration-300"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            
            <Button 
              onClick={handleGenerateLeads} 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
            >
              <Zap className="h-4 w-4 mr-2" />
              ⚡ Gerar Leads (3)
            </Button>
            
            {canImport && (
              <>
                <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="hover:bg-primary/10 transition-all duration-300">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">📤 Importar</span>
                </Button>
                <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(true)} className="hover:bg-primary/10 transition-all duration-300">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">📥 Puxar</span>
                </Button>
                <ImportHistory module="activate_leads" title="Activate Leads" />
              </>
            )}
          </div>
        </div>

        {/* Modern Stats Cards */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4"
        >
          {[
            { label: 'Total', value: stats.total, emoji: '🎯', color: 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800', iconBg: 'from-slate-500 to-slate-600', icon: Target, textColor: 'text-foreground' },
            { label: 'Novos', value: stats.novos, emoji: '✨', color: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900', iconBg: 'from-blue-500 to-blue-600', icon: Sparkles, textColor: 'text-blue-700 dark:text-blue-300' },
            { label: 'Em Andamento', value: stats.emAndamento, emoji: '📞', color: 'from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900', iconBg: 'from-amber-500 to-orange-500', icon: TrendingUp, textColor: 'text-amber-700 dark:text-amber-300' },
            { label: '2ª Tentativa', value: stats.segundaTentativa, emoji: '🔁', color: 'from-cyan-50 to-teal-100 dark:from-cyan-950 dark:to-teal-900', iconBg: 'from-cyan-500 to-teal-500', icon: RotateCcw, textColor: 'text-cyan-700 dark:text-cyan-300' },
            { label: 'Fechados', value: stats.fechados, emoji: '✅', color: 'from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900', iconBg: 'from-emerald-500 to-green-500', icon: CheckCircle, textColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'Sem Possibilidade', value: stats.semPossibilidade, emoji: '❌', color: 'from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900', iconBg: 'from-rose-500 to-red-500', icon: XCircle, textColor: 'text-rose-700 dark:text-rose-300' },
            { label: 'Alertas', value: stats.alertas, emoji: '⚠️', color: 'from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900', iconBg: 'from-orange-500 to-amber-500', icon: AlertTriangle, textColor: 'text-orange-700 dark:text-orange-300' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={cardVariants}
              whileHover="hover"
            >
              <Card className={cn(`bg-gradient-to-br ${stat.color} border-0 shadow-sm hover:shadow-lg transition-all duration-300`)}>
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${stat.iconBg} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className={cn("text-2xl md:text-3xl font-bold", stat.textColor)}>{stat.value}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.emoji} {stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Modern Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-muted/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="🔍 Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 focus:border-primary transition-all duration-300 text-base"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-52 border-2 focus:border-primary transition-all duration-300">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2 text-base">
                        📋 Todos os Status
                      </span>
                    </SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2 text-base">
                          {config.emoji} {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(isAdmin || isGestor) && (
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full md:w-48 border-2 focus:border-primary transition-all duration-300">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 Todos</SelectItem>
                      <SelectItem value="unassigned">🆓 Não atribuídos</SelectItem>
                      {availableUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          👤 {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedLeadIds.size > 0 && canAssignLead && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <span className="font-medium text-lg">
                      ✅ {selectedLeadIds.size} lead(s) selecionado(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSelection} className="transition-all duration-300">
                      ❌ Limpar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsBulkAssignModalOpen(true)}
                      className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:scale-105"
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      🔄 Distribuir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leads Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-muted/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {canAssignLead && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-bold text-base">👤 Nome</TableHead>
                  <TableHead className="font-bold text-base">📞 Telefone</TableHead>
                  <TableHead className="font-bold text-base">📍 Origem</TableHead>
                  <TableHead className="font-bold text-base">📊 Status</TableHead>
                  <TableHead className="font-bold text-base">🎯 Atribuído</TableHead>
                  <TableHead className="font-bold text-base">📅 Próxima Ação</TableHead>
                  <TableHead className="font-bold text-base text-center">⚡ Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canAssignLead ? 8 : 7} className="h-40">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-muted to-muted/50 flex items-center justify-center mb-4">
                          <Users className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-xl text-foreground">📭 Nenhum lead encontrado</h3>
                        <p className="text-base text-muted-foreground mt-2">Tente ajustar os filtros ou gerar novos leads</p>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead, index) => {
                    const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                    const hasAlert = lead.data_proxima_operacao && 
                      (isToday(parseISO(lead.data_proxima_operacao)) || 
                       isBefore(parseISO(lead.data_proxima_operacao), new Date()));
                    const isSelected = selectedLeadIds.has(lead.id);
                    const assignedUser = availableUsers.find(u => u.id === lead.assigned_to);
                    
                    return (
                      <motion.tr 
                        key={lead.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className={cn(
                          "group hover:bg-muted/40 transition-all duration-300",
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
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-semibold text-base">{lead.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-base">{formatPhone(lead.telefone)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium capitalize text-sm">
                            {lead.origem}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border transition-all duration-300",
                            statusConfig.bgColor,
                            statusConfig.textColor,
                            statusConfig.borderColor
                          )}>
                            <span>{statusConfig.emoji}</span>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignedUser ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium">{assignedUser.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              🆓 Disponível
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {lead.proxima_acao || (lead.data_proxima_operacao 
                              ? `📅 Operação em ${format(parseISO(lead.data_proxima_operacao), "dd/MM/yyyy", { locale: ptBR })}`
                              : <span className="text-muted-foreground">-</span>)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`tel:${lead.telefone}`, '_self')}
                              className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-700 transition-all duration-300"
                              title="Ligar"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const primeiroNome = lead.nome.split(' ')[0];
                                const mensagem = encodeURIComponent(`Olá ${primeiroNome}, tudo bem?`);
                                window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}?text=${mensagem}`, '_blank');
                              }}
                              className="h-9 w-9 p-0 hover:bg-green-100 hover:text-green-700 transition-all duration-300"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openHistoryModal(lead)}
                              className="h-9 w-9 p-0 hover:bg-amber-100 hover:text-amber-700 transition-all duration-300"
                              title="📜 Ver histórico do lead"
                            >
                              <History className="h-4 w-4" />
                            </Button>

                            {canEditLead(lead) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(lead, 'segunda_tentativa')}
                                  className="h-9 w-9 p-0 hover:bg-cyan-100 hover:text-cyan-700 transition-all duration-300"
                                  title="🔁 Segunda tentativa de contato"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(lead, 'contato_futuro')}
                                  className="h-9 w-9 p-0 hover:bg-purple-100 hover:text-purple-700 transition-all duration-300"
                                  title="📅 Agendar contato futuro"
                                >
                                  <CalendarClock className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {canAssignLead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openAssignModal(lead)}
                                className="h-9 w-9 p-0 hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-300"
                                title={lead.assigned_to ? '👤 Reatribuir lead' : '👤 Atribuir lead'}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}

                            <Select 
                              value={lead.status}
                              onValueChange={(value) => handleStatusChange(lead, value)}
                              disabled={!canEditLead(lead)}
                            >
                              <SelectTrigger className="w-40 h-9 text-sm transition-all duration-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <span className="flex items-center gap-2">
                                      <span>{config.emoji}</span>
                                      {config.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Modern Pagination */}
          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-4 border-t bg-muted/20"
            >
              <p className="text-sm text-muted-foreground">
                📄 Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="hover:bg-primary/10 transition-all duration-300"
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
                  className="hover:bg-primary/10 transition-all duration-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Second Attempt Modal */}
      <Dialog open={isSecondAttemptModalOpen} onOpenChange={setIsSecondAttemptModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-white" />
              </div>
              🔁 Segunda Tentativa de Contato
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 py-4"
          >
            {selectedLead && (
              <div className="p-4 rounded-xl bg-muted/50 border">
                <p className="text-lg font-semibold">👤 {selectedLead.nome}</p>
                <p className="text-muted-foreground">📞 {formatPhone(selectedLead.telefone)}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">📱 Tipo de Contato</Label>
              <Select value={proofType} onValueChange={setProofType}>
                <SelectTrigger className="border-2 focus:border-primary h-12 text-base">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PROOF_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2 text-base">
                        {type.emoji} {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                📎 Comprovante da Tentativa 
                <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-all duration-300 cursor-pointer relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleProofFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="proof-upload"
                />
                <AnimatePresence mode="wait">
                  {proofPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="space-y-3"
                    >
                      <img 
                        src={proofPreview} 
                        alt="Preview" 
                        className="max-h-40 mx-auto rounded-lg shadow-lg"
                      />
                      <p className="text-sm text-primary font-medium">✅ {proofFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Clique para alterar</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Camera className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-base text-muted-foreground">
                        Clique ou arraste para anexar o print
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        📷 JPG ou PNG • Máximo 5MB
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">📝 Observações (opcional)</Label>
              <Textarea
                placeholder="Adicione observações sobre a tentativa..."
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                rows={3}
                className="border-2 focus:border-primary text-base resize-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800">
              <p className="text-sm text-cyan-700 dark:text-cyan-300 flex items-start gap-2">
                <span className="text-lg">💡</span>
                <span>O print serve como comprovação da tentativa de contato e ficará registrado para auditoria.</span>
              </p>
            </div>
          </motion.div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSecondAttemptModalOpen(false);
                setProofFile(null);
                setProofPreview(null);
              }}
              className="transition-all duration-300"
            >
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleSecondAttemptSubmit} 
              disabled={!proofFile || uploadingProof}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 transition-all duration-300"
            >
              {uploadingProof ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ✅ Confirmar Tentativa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              📤 Importar Leads Activate
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="hover:bg-primary/10 transition-all duration-300">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                📄 Baixar Template CSV
              </Button>
            </div>
            
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-all duration-300">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-base text-muted-foreground">
                  📂 Clique para selecionar ou arraste o arquivo CSV
                </p>
                {csvFile && (
                  <p className="mt-2 text-primary font-medium text-lg">✅ {csvFile.name}</p>
                )}
              </label>
            </div>

            <AnimatePresence>
              {parsedLeads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-h-60 overflow-y-auto border-2 rounded-xl"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">👤 Nome</TableHead>
                        <TableHead className="font-bold">📞 Telefone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedLeads.slice(0, 10).map((lead, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleImportSubmit} 
              disabled={parsedLeads.length === 0 || importing}
              className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              📥 Importar {parsedLeads.length} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {newStatus === 'sem_possibilidade' ? (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-slate-500 to-gray-500 flex items-center justify-center">
                  <UserX className="h-6 w-6 text-white" />
                </div>
              )}
              {newStatus === 'sem_possibilidade' ? '❌ Sem Possibilidade' : '👤 Cliente Fora do Perfil'}
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="p-4 rounded-xl bg-muted/50 border">
              <p className="text-lg font-semibold">👤 {selectedLead?.nome}</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">📝 Motivo (obrigatório)</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={4}
                className="border-2 focus:border-primary text-base"
              />
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleStatusModalSubmit} 
              disabled={!motivoRecusa.trim()}
              className="bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-300"
            >
              ✅ Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Modal */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              ⏳ Operações Recentes (INSS)
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-base text-orange-700 dark:text-orange-300 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <span>Selecione quando o cliente poderá realizar uma nova operação</span>
              </p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">📅 Data da Próxima Operação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2 h-12 text-base",
                      !dataProximaOperacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
                    disabled={(date) => isBefore(date, new Date())}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleDateModalSubmit} 
              disabled={!dataProximaOperacao}
              className="bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
            >
              ✅ Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Future Contact Modal */}
      <Dialog open={isFutureContactModalOpen} onOpenChange={setIsFutureContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center">
                <CalendarClock className="h-6 w-6 text-white" />
              </div>
              📅 Agendar Contato Futuro
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            {selectedLead && (
              <div className="p-4 rounded-xl bg-muted/50 border">
                <p className="text-lg font-semibold">👤 {selectedLead.nome}</p>
                <p className="text-muted-foreground">📞 {formatPhone(selectedLead.telefone)}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">📅 Data do Contato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2 h-12 text-base",
                      !dataProximaOperacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
                    disabled={(date) => isBefore(date, new Date())}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFutureContactModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleFutureContactSubmit} 
              disabled={!dataProximaOperacao}
              className="bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300"
            >
              ✅ Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pull Leads Modal */}
      <Dialog open={isPullLeadsModalOpen} onOpenChange={setIsPullLeadsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              📥 Puxar Leads
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="space-y-3">
              <Label className="text-base font-semibold">📍 Origem</Label>
              <Select value={pullSource} onValueChange={setPullSource}>
                <SelectTrigger className="border-2 focus:border-primary h-12 text-base">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_off">📊 Base OFF</SelectItem>
                  <SelectItem value="leads_database">🗄️ Leads Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">🔢 Quantidade</Label>
              <Input
                type="number"
                value={pullCount}
                onChange={(e) => setPullCount(Number(e.target.value))}
                min={1}
                max={100}
                className="border-2 focus:border-primary h-12 text-base"
              />
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: '🚧 Em desenvolvimento',
                  description: 'Funcionalidade em implementação.',
                });
                setIsPullLeadsModalOpen(false);
              }}
              disabled={!pullSource || pulling}
              className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            >
              {pulling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              📥 Puxar Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              👤 Atribuir Lead
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            {leadToAssign && (
              <div className="p-4 bg-muted/50 rounded-xl border">
                <p className="text-lg font-semibold">👤 {leadToAssign.nome}</p>
                <p className="text-muted-foreground">📞 {formatPhone(leadToAssign.telefone)}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-base font-semibold">🎯 Atribuir para</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="border-2 focus:border-primary h-12 text-base">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <UserX className="h-4 w-4" />
                      🔓 Remover atribuição
                    </span>
                  </SelectItem>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        👤 {u.name}
                        {u.email && <span className="text-xs text-muted-foreground">({u.email})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingUsers && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando usuários...
                </p>
              )}
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleAssignLead}
              className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              ✅ Confirmar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={isBulkAssignModalOpen} onOpenChange={setIsBulkAssignModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                <Shuffle className="h-6 w-6 text-primary" />
              </div>
              🔄 Distribuir {selectedLeadIds.size} Lead(s)
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-4"
          >
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setBulkAssignMode('single')}
                className={cn(
                  "p-5 rounded-xl border-2 text-left transition-all duration-300",
                  bulkAssignMode === 'single' 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-bold text-lg">👤 Usuário Único</span>
                </div>
                <p className="text-muted-foreground">
                  Atribuir todos os leads selecionados para um único usuário
                </p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setBulkAssignMode('distribute')}
                className={cn(
                  "p-5 rounded-xl border-2 text-left transition-all duration-300",
                  bulkAssignMode === 'distribute' 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-bold text-lg">👥 Distribuição</span>
                </div>
                <p className="text-muted-foreground">
                  Distribuir leads de forma equilibrada entre vários usuários
                </p>
              </motion.button>
            </div>

            {/* Single User Mode */}
            <AnimatePresence mode="wait">
              {bulkAssignMode === 'single' && (
                <motion.div
                  key="single"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Label className="text-base font-semibold">🎯 Selecione o usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="border-2 focus:border-primary h-12 text-base">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            👤 {u.name}
                            {u.email && <span className="text-xs text-muted-foreground">({u.email})</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Distribute Mode */}
            <AnimatePresence mode="wait">
              {bulkAssignMode === 'distribute' && (
                <motion.div
                  key="distribute"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">🔢 Máximo de leads por usuário</Label>
                    <Input
                      type="number"
                      value={maxLeadsPerUser}
                      onChange={(e) => setMaxLeadsPerUser(Number(e.target.value))}
                      min={1}
                      max={100}
                      className="border-2 focus:border-primary w-32 h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">👥 Selecione os usuários para distribuição</Label>
                    <div className="border-2 rounded-xl max-h-64 overflow-y-auto">
                      {availableUsers.map(u => (
                        <motion.div
                          key={u.id}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                          onClick={() => toggleBulkUserSelection(u.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer border-b last:border-b-0 transition-all duration-300",
                            selectedBulkUsers.includes(u.id) && "bg-primary/10"
                          )}
                        >
                          <Checkbox
                            checked={selectedBulkUsers.includes(u.id)}
                            onCheckedChange={() => toggleBulkUserSelection(u.id)}
                          />
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">👤 {u.name}</p>
                            {u.email && <p className="text-sm text-muted-foreground">{u.email}</p>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {selectedBulkUsers.length > 0 && (
                      <p className="text-muted-foreground">
                        ✅ {selectedBulkUsers.length} usuário(s) selecionado(s) • 
                        ~{Math.ceil(selectedLeadIds.size / selectedBulkUsers.length)} leads por usuário
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary */}
            <div className="p-5 bg-muted/50 rounded-xl border">
              <h4 className="font-bold text-lg mb-3">📊 Resumo da Distribuição</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Leads selecionados:</span>
                  <span className="ml-2 font-bold text-lg">{selectedLeadIds.size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modo:</span>
                  <span className="ml-2 font-bold">
                    {bulkAssignMode === 'single' ? '👤 Usuário único' : '👥 Distribuição'}
                  </span>
                </div>
                {bulkAssignMode === 'single' && selectedUserId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Atribuir para:</span>
                    <span className="ml-2 font-bold">
                      👤 {availableUsers.find(u => u.id === selectedUserId)?.name}
                    </span>
                  </div>
                )}
                {bulkAssignMode === 'distribute' && selectedBulkUsers.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Distribuir entre:</span>
                    <span className="ml-2 font-bold">
                      {selectedBulkUsers.map(id => availableUsers.find(u => u.id === id)?.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkAssignModalOpen(false)} className="transition-all duration-300">
              ❌ Cancelar
            </Button>
            <Button 
              onClick={handleBulkAssign}
              disabled={
                bulkAssigning || 
                (bulkAssignMode === 'single' && !selectedUserId) ||
                (bulkAssignMode === 'distribute' && selectedBulkUsers.length === 0)
              }
              className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
            >
              {bulkAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Shuffle className="h-4 w-4 mr-2" />
              🔄 Distribuir Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <ActivateLeadHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryLead(null);
          setLeadHistory([]);
        }}
        leadName={historyLead?.nome || ''}
        history={leadHistory}
        users={availableUsers}
      />
    </motion.div>
  );
};
