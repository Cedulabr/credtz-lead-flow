import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Filter, Calendar, AlertTriangle, CheckCircle, Clock, RefreshCw, Search, FileText, Trash2, Edit, Eye } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FinanceTransactionForm } from "./FinanceTransactionForm";
import { FinanceReceipts } from "./FinanceReceipts";
import { FinanceAlerts } from "./FinanceAlerts";

interface Transaction {
  id: string;
  company_id: string;
  description: string;
  value: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  type: string;
  responsible_id: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurring_day: number | null;
  parent_transaction_id: string | null;
  is_recurring_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UserCompany {
  company_id: string;
  company_role: string;
  companies: {
    id: string;
    name: string;
  };
}

const statusColumns = [
  { id: "pendente", label: "Pendente", color: "bg-yellow-500", icon: Clock },
  { id: "recorrente", label: "Recorrente", color: "bg-blue-500", icon: RefreshCw },
  { id: "em_analise", label: "Em Análise", color: "bg-orange-500", icon: AlertTriangle },
  { id: "pago", label: "Pago", color: "bg-green-500", icon: CheckCircle },
];

export const FinanceKanban = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showReceipts, setShowReceipts] = useState(false);
  const [selectedTransactionForReceipts, setSelectedTransactionForReceipts] = useState<Transaction | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserCompanies();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchTransactions();
    }
  }, [selectedCompanyId, filterMonth]);

  const fetchUserCompanies = async () => {
    try {
      console.log("FinanceKanban: Fetching companies for user, isAdmin:", isAdmin);
      
      // Admin can see all companies
      if (isAdmin) {
        const { data: allCompanies, error: companiesError } = await supabase
          .from("companies")
          .select("id, name")
          .eq("is_active", true);

        if (companiesError) throw companiesError;

        console.log("FinanceKanban: Admin - found", allCompanies?.length || 0, "companies");

        const companies = (allCompanies || []).map(c => ({
          company_id: c.id,
          company_role: "gestor" as const,
          companies: { id: c.id, name: c.name }
        })) as UserCompany[];

        setUserCompanies(companies);
        setIsGestor(true);

        if (companies.length > 0) {
          console.log("FinanceKanban: Admin - selecting first company:", companies[0].company_id);
          setSelectedCompanyId(companies[0].company_id);
        }
        setLoading(false);
        return;
      }

      // Regular users - fetch their company associations
      const { data, error } = await supabase
        .from("user_companies")
        .select(`
          company_id,
          company_role,
          companies (
            id,
            name
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;

      const companies = (data || []).filter(uc => uc.companies) as UserCompany[];
      console.log("FinanceKanban: User - found", companies.length, "companies");
      setUserCompanies(companies);

      if (companies.length > 0) {
        setSelectedCompanyId(companies[0].company_id);
        setIsGestor(companies[0].company_role === "gestor");
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching user companies:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedCompanyId) {
      console.log("FinanceKanban: No company selected, skipping fetch");
      return;
    }

    setLoading(true);
    try {
      const startDate = startOfMonth(new Date(filterMonth + "-01"));
      const endDate = endOfMonth(startDate);

      console.log("FinanceKanban: Fetching transactions for company:", selectedCompanyId, "month:", filterMonth);

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .gte("due_date", format(startDate, "yyyy-MM-dd"))
        .lte("due_date", format(endDate, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });

      if (error) {
        console.error("FinanceKanban: Error fetching transactions:", error);
        throw error;
      }

      console.log("FinanceKanban: Fetched", data?.length || 0, "transactions");
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = userCompanies.find(uc => uc.company_id === companyId);
    setIsGestor(company?.company_role === "gestor" || isAdmin);
  };

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    if (!isGestor) return;

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "pago") {
        updateData.payment_date = format(new Date(), "yyyy-MM-dd");
      }

      const { error } = await supabase
        .from("financial_transactions")
        .update(updateData)
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status da transação foi alterado com sucesso.",
      });

      fetchTransactions();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!isGestor) return;
    
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });

      fetchTransactions();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  const getTransactionsByStatus = (status: string) => {
    return filteredTransactions.filter(t => t.status === status);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    for (let i = -6; i <= 6; i++) {
      const date = addMonths(today, i);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: ptBR }),
      });
    }
    
    return months;
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const threeDaysFromNow = addDays(today, 3);
    return isAfter(due, today) && isBefore(due, threeDaysFromNow);
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "pago") return false;
    const due = new Date(dueDate);
    const today = new Date();
    return isBefore(due, today);
  };

  if (userCompanies.length === 0 && !loading) {
    return (
      <Card className="m-4">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sem acesso ao módulo financeiro</h3>
          <p className="text-muted-foreground">
            Você precisa estar vinculado a uma empresa para acessar o módulo financeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanças</h1>
          <p className="text-muted-foreground">Gerencie as despesas e comissões da empresa</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isGestor && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          )}
        </div>
      </div>

      {/* Alerts Widget */}
      <FinanceAlerts 
        transactions={transactions} 
        companyId={selectedCompanyId}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Company Filter */}
            {userCompanies.length > 1 && (
              <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {userCompanies.map((uc) => (
                    <SelectItem key={uc.company_id} value={uc.company_id}>
                      {uc.companies.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Month Filter */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
                <SelectItem value="comissao">Comissões</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusColumns.map((column) => {
            const columnTransactions = getTransactionsByStatus(column.id);
            const columnTotal = columnTransactions.reduce((sum, t) => sum + Number(t.value), 0);
            const Icon = column.icon;

            return (
              <Card key={column.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <CardTitle className="text-sm font-medium">{column.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnTransactions.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {formatCurrency(columnTotal)}
                  </p>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-auto max-h-[500px] space-y-2">
                  {columnTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum lançamento
                    </div>
                  ) : (
                    columnTransactions.map((transaction) => (
                      <Card 
                        key={transaction.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isOverdue(transaction.due_date, transaction.status) 
                            ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                            : isDueSoon(transaction.due_date) && transaction.status !== "pago"
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                            : ""
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{transaction.description}</p>
                              <p className={`text-lg font-bold ${
                                transaction.type === "comissao" ? "text-green-600" : "text-red-600"
                              }`}>
                                {transaction.type === "comissao" ? "+" : "-"}
                                {formatCurrency(Number(transaction.value))}
                              </p>
                            </div>
                            {transaction.is_recurring && (
                              <Badge variant="outline" className="shrink-0">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Mensal
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(transaction.due_date), "dd/MM/yyyy")}
                            </span>
                            <Badge variant={transaction.type === "despesa" ? "destructive" : "default"} className="text-xs">
                              {transaction.type === "despesa" ? "Despesa" : "Comissão"}
                            </Badge>
                          </div>

                          {(isOverdue(transaction.due_date, transaction.status) || 
                            (isDueSoon(transaction.due_date) && transaction.status !== "pago")) && (
                            <div className={`flex items-center gap-1 text-xs ${
                              isOverdue(transaction.due_date, transaction.status) 
                                ? "text-red-600" 
                                : "text-yellow-600"
                            }`}>
                              <AlertTriangle className="h-3 w-3" />
                              {isOverdue(transaction.due_date, transaction.status) 
                                ? "Vencida" 
                                : "Vence em breve"}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                setSelectedTransactionForReceipts(transaction);
                                setShowReceipts(true);
                              }}
                              title="Ver comprovantes"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Comprovantes</span>
                            </Button>
                            
                            {isGestor && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setEditingTransaction(transaction);
                                    setShowForm(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(transaction.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>

                                {/* Quick status change */}
                                <Select
                                  value={transaction.status}
                                  onValueChange={(value) => handleStatusChange(transaction.id, value)}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusColumns.map((col) => (
                                      <SelectItem key={col.id} value={col.id}>
                                        {col.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
            </DialogTitle>
          </DialogHeader>
          <FinanceTransactionForm
            companyId={selectedCompanyId}
            transaction={editingTransaction}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Receipts Dialog */}
      <Dialog open={showReceipts} onOpenChange={(open) => {
        setShowReceipts(open);
        if (!open) setSelectedTransactionForReceipts(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Comprovantes - {selectedTransactionForReceipts?.description}
            </DialogTitle>
          </DialogHeader>
          {selectedTransactionForReceipts && (
            <FinanceReceipts
              transaction={selectedTransactionForReceipts}
              companyId={selectedCompanyId}
              isGestor={isGestor}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
