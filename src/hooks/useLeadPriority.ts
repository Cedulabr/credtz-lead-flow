import { useMemo } from 'react';

export interface LeadPriority {
  score: number;
  slaStatus: 'ok' | 'atencao' | 'critico';
  ageHours: number;
  inactivityHours: number;
  suggestedAction: string;
}

export interface LeadWithPriority {
  id: string;
  nome: string;
  telefone: string;
  status: string;
  created_at: string;
  ultima_interacao: string | null;
  proxima_acao: string | null;
  priority: LeadPriority;
}

interface UseLeadPriorityOptions {
  leads: Array<{
    id: string;
    nome: string;
    telefone: string;
    status: string;
    created_at: string;
    ultima_interacao?: string | null;
    proxima_acao?: string | null;
  }>;
}

export function calculateLeadPriority(
  createdAt: string,
  status: string,
  ultimaInteracao: string | null,
  proximaAcao: string | null
): LeadPriority {
  const now = new Date();
  const created = new Date(createdAt);
  const lastInteraction = ultimaInteracao ? new Date(ultimaInteracao) : null;
  
  // Calculate hours
  const ageHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const inactivityHours = lastInteraction 
    ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60))
    : ageHours;
  
  let score = 0;
  
  // Status-based scoring
  switch (status) {
    case 'novo':
      score += 40;
      break;
    case 'interessado':
      score += 35;
      break;
    case 'em_andamento':
    case 'em_contato':
      score += 30;
      break;
    case 'segunda_tentativa':
      score += 25;
      break;
    default:
      score += 10;
  }
  
  // Inactivity scoring - more inactivity = higher priority
  if (inactivityHours > 48) {
    score += 30;
  } else if (inactivityHours > 24) {
    score += 20;
  } else if (inactivityHours > 12) {
    score += 10;
  }
  
  // Age scoring - sweet spot is 2-24 hours
  if (ageHours >= 2 && ageHours <= 24) {
    score += 15;
  } else if (ageHours > 24 && ageHours <= 72) {
    score += 10;
  }
  
  // Determine SLA status
  let slaStatus: LeadPriority['slaStatus'] = 'ok';
  if (status === 'novo' && ageHours > 4) {
    slaStatus = 'critico';
  } else if (status === 'novo' && ageHours > 2) {
    slaStatus = 'atencao';
  } else if (inactivityHours > 24) {
    slaStatus = 'atencao';
  }
  
  // Suggest next action
  let suggestedAction = 'Verificar situação';
  if (proximaAcao) {
    suggestedAction = proximaAcao;
  } else if (status === 'novo') {
    suggestedAction = 'Fazer primeiro contato';
  } else if ((status === 'em_andamento' || status === 'em_contato') && inactivityHours > 24) {
    suggestedAction = 'Retornar contato';
  } else if (status === 'interessado') {
    suggestedAction = 'Enviar proposta';
  } else if (status === 'segunda_tentativa') {
    suggestedAction = 'Nova tentativa de contato';
  }
  
  return {
    score: Math.min(100, score),
    slaStatus,
    ageHours,
    inactivityHours,
    suggestedAction,
  };
}

export function useLeadPriority({ leads }: UseLeadPriorityOptions) {
  const leadsWithPriority = useMemo<LeadWithPriority[]>(() => {
    return leads.map(lead => ({
      ...lead,
      ultima_interacao: lead.ultima_interacao || null,
      proxima_acao: lead.proxima_acao || null,
      priority: calculateLeadPriority(
        lead.created_at,
        lead.status,
        lead.ultima_interacao || null,
        lead.proxima_acao || null
      ),
    }));
  }, [leads]);
  
  // Sort by priority score (highest first)
  const sortedLeads = useMemo(() => {
    return [...leadsWithPriority].sort((a, b) => b.priority.score - a.priority.score);
  }, [leadsWithPriority]);
  
  // Get leads by SLA status
  const criticalLeads = useMemo(() => 
    sortedLeads.filter(l => l.priority.slaStatus === 'critico'), 
    [sortedLeads]
  );
  
  const attentionLeads = useMemo(() => 
    sortedLeads.filter(l => l.priority.slaStatus === 'atencao'), 
    [sortedLeads]
  );
  
  const okLeads = useMemo(() => 
    sortedLeads.filter(l => l.priority.slaStatus === 'ok'), 
    [sortedLeads]
  );
  
  return {
    leadsWithPriority: sortedLeads,
    criticalLeads,
    attentionLeads,
    okLeads,
    stats: {
      total: sortedLeads.length,
      critical: criticalLeads.length,
      attention: attentionLeads.length,
      ok: okLeads.length,
    },
  };
}
