export interface DateFilter {
  type: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface ReportFilters {
  dateFilter: DateFilter;
  userId: string | null;
  proposalStatus: string | null;
  origin: string | null;
}

export interface UserPerformance {
  userId: string;
  userName: string;
  // Leads separados
  premiumLeads: number;       // Leads da tabela leads_database/leads
  activatedLeads: number;     // Leads da tabela activate_leads
  // Propostas
  proposalsCreated: number;
  proposalsPaid: number;
  proposalsCancelled: number;
  conversionRate: number;
  // Valores
  totalSold: number;
  commissionGenerated: number;
  // Outros
  documentsSaved: number;
  savedProposals: number;
  lastActivity: string | null;
  averageResponseTime: number | null;
}

export interface ActivityLog {
  id: string;
  actionType: string;
  clientName: string | null;
  clientCpf: string | null;
  proposalNumber: string | null;
  operationValue: number | null;
  commissionValue: number | null;
  createdAt: string;
  fromStatus: string | null;
  toStatus: string | null;
}

export interface ReportSummary {
  totalActiveUsers: number;
  // Leads separados
  premiumLeadsWorked: number;
  activatedLeadsWorked: number;
  // Propostas
  totalProposalsCreated: number;
  proposalsPaid: number;
  proposalsCancelled: number;
  // Valores
  totalSoldValue: number;
  totalCommissions: number;
  // Outros
  documentsSaved: number;
  savedProposals: number;
}
