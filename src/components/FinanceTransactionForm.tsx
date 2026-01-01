import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

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
}

interface FinanceTransactionFormProps {
  companyId: string;
  transaction?: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "recorrente", label: "Recorrente" },
  { value: "em_analise", label: "Em Análise" },
  { value: "pago", label: "Pago" },
];

const typeOptions = [
  { value: "despesa", label: "Despesa" },
  { value: "comissao", label: "Comissão Recebida" },
];

export const FinanceTransactionForm = ({
  companyId,
  transaction,
  onSuccess,
  onCancel,
}: FinanceTransactionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    value: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
    status: "pendente",
    type: "despesa",
    notes: "",
    is_recurring: false,
    recurring_months: 12,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (transaction) {
      // Parse the date correctly - just use the date string as-is since it's already in YYYY-MM-DD format
      const dueDate = transaction.due_date;
      
      setFormData({
        description: transaction.description,
        value: String(transaction.value),
        due_date: dueDate,
        status: transaction.status,
        type: transaction.type,
        notes: transaction.notes || "",
        is_recurring: transaction.is_recurring,
        recurring_months: 12,
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.value || !formData.due_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Parse the date correctly from the input (YYYY-MM-DD format)
      // The input type="date" always returns YYYY-MM-DD format
      const dueDateStr = formData.due_date; // Already in YYYY-MM-DD format
      const [year, month, day] = dueDateStr.split('-').map(Number);
      const recurringDay = day;

      console.log("Saving transaction with date:", dueDateStr, "parsed day:", day);

      const baseData = {
        company_id: companyId,
        description: formData.description,
        value: parseFloat(formData.value.replace(/[^\d.,]/g, "").replace(",", ".")),
        due_date: dueDateStr, // Use the date string directly - no conversion needed
        status: formData.is_recurring ? "recorrente" : formData.status,
        type: formData.type,
        notes: formData.notes || null,
        is_recurring: formData.is_recurring,
        recurring_day: formData.is_recurring ? recurringDay : null,
        created_by: user?.id,
      };

      if (transaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            ...baseData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Lançamento atualizado",
          description: "O lançamento foi atualizado com sucesso.",
        });
      } else {
        // Create new transaction
        if (formData.is_recurring) {
          // Create multiple transactions for recurring
          const transactionsToInsert = [];
          const [baseYear, baseMonth, baseDay] = dueDateStr.split('-').map(Number);
          
          // Helper function to get the last day of a month
          const getLastDayOfMonth = (year: number, month: number) => {
            // month is 1-indexed here (1 = January)
            return new Date(year, month, 0).getDate();
          };
          
          for (let i = 0; i < formData.recurring_months; i++) {
            // Calculate target year and month (1-indexed)
            let targetMonth = baseMonth + i;
            let targetYear = baseYear;
            
            // Handle year overflow
            while (targetMonth > 12) {
              targetMonth -= 12;
              targetYear += 1;
            }
            
            // Clamp the day to the last valid day of the target month
            const lastDayOfTargetMonth = getLastDayOfMonth(targetYear, targetMonth);
            const targetDay = Math.min(baseDay, lastDayOfTargetMonth);
            
            // Format the date as YYYY-MM-DD
            const formattedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
            
            transactionsToInsert.push({
              ...baseData,
              due_date: formattedDate,
              parent_transaction_id: i === 0 ? null : undefined,
            });
          }

          // First, create the parent transaction
          const { data: parentData, error: parentError } = await supabase
            .from("financial_transactions")
            .insert(transactionsToInsert[0])
            .select()
            .single();

          if (parentError) throw parentError;

          // Then create child transactions
          if (transactionsToInsert.length > 1) {
            const childTransactions = transactionsToInsert.slice(1).map(t => ({
              ...t,
              parent_transaction_id: parentData.id,
            }));

            const { error: childError } = await supabase
              .from("financial_transactions")
              .insert(childTransactions);

            if (childError) throw childError;
          }

          toast({
            title: "Lançamentos criados",
            description: `${formData.recurring_months} lançamentos recorrentes foram criados.`,
          });
        } else {
          const { error } = await supabase
            .from("financial_transactions")
            .insert(baseData);

          if (error) throw error;

          toast({
            title: "Lançamento criado",
            description: "O lançamento foi criado com sucesso.",
          });
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o lançamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (!numericValue) return "";
    
    const number = parseInt(numericValue) / 100;
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição *</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Aluguel, Conta de luz..."
            required
          />
        </div>

        {/* Value and Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$) *</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => setFormData({ 
                ...formData, 
                value: formatCurrencyInput(e.target.value) 
              })}
              placeholder="0,00"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Date and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="due_date">Data de Vencimento *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={formData.is_recurring}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recurring */}
        {!transaction && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_recurring">Despesa Recorrente (Mensal)</Label>
              <p className="text-sm text-muted-foreground">
                Criar lançamentos automáticos para os próximos meses
              </p>
            </div>
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
          </div>
        )}

        {formData.is_recurring && !transaction && (
          <div className="space-y-2">
            <Label htmlFor="recurring_months">Quantidade de Meses</Label>
            <Select
              value={String(formData.recurring_months)}
              onValueChange={(value) => setFormData({ ...formData, recurring_months: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
                <SelectItem value="24">24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observações adicionais..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
};
