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
  totalLeads: number;
  activatedLeads: number;
  proposalsCreated: number;
  proposalsPaid: number;
  proposalsCancelled: number;
  conversionRate: number;
  totalSold: number;
  commissionGenerated: number;
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
  totalLeadsWorked: number;
  activatedLeads: number;
  totalProposalsCreated: number;
  proposalsPaid: number;
  proposalsCancelled: number;
  totalSoldValue: number;
  totalCommissions: number;
  documentsSaved: number;
  savedProposals: number;
}
