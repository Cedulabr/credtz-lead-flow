import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";

const formSchema = z.object({
  banco: z.string().min(1, "Banco é obrigatório"),
  parcela: z.string().min(1, "Parcela é obrigatória"),
  troco: z.string().optional(),
  saldo_devedor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CollaboratorEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  televenda: Televenda | null;
  onSave: (
    id: string, 
    data: { banco: string; parcela: number; troco: number | null; saldo_devedor: number | null },
    originalData: { banco: string; parcela: number; troco: number | null; saldo_devedor: number | null }
  ) => Promise<void>;
  banks: string[];
}

export const CollaboratorEditModal = ({
  open,
  onOpenChange,
  televenda,
  onSave,
  banks,
}: CollaboratorEditModalProps) => {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banco: "",
      parcela: "",
      troco: "",
      saldo_devedor: "",
    },
  });

  // Reset form when modal opens with televenda data
  useEffect(() => {
    if (open && televenda) {
      form.reset({
        banco: televenda.banco || "",
        parcela: televenda.parcela?.toString() || "",
        troco: televenda.troco?.toString() || "",
        saldo_devedor: televenda.saldo_devedor?.toString() || "",
      });
    }
  }, [open, televenda, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!televenda) return;
    
    setSaving(true);
    try {
      // Parse values
      const parcela = parseFloat(values.parcela.replace(/[^\d,.]/g, "").replace(",", ".")) || 0;
      const troco = values.troco ? parseFloat(values.troco.replace(/[^\d,.]/g, "").replace(",", ".")) : null;
      const saldoDevedor = values.saldo_devedor ? parseFloat(values.saldo_devedor.replace(/[^\d,.]/g, "").replace(",", ".")) : null;

      // Original data for history
      const originalData = {
        banco: televenda.banco,
        parcela: televenda.parcela,
        troco: televenda.troco,
        saldo_devedor: televenda.saldo_devedor,
      };

      await onSave(
        televenda.id, 
        { banco: values.banco, parcela, troco, saldo_devedor: saldoDevedor },
        originalData
      );
      
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!televenda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Dados da Proposta</DialogTitle>
          <DialogDescription>
            Alteração para: <strong>{televenda.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As alterações serão registradas no histórico para auditoria.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Banco */}
            <FormField
              control={form.control}
              name="banco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valores */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="parcela"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcela (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,00" inputMode="decimal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="troco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Troco (R$)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0,00" inputMode="decimal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="saldo_devedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo Devedor (R$)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0,00" inputMode="decimal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Current values display */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p className="font-medium text-muted-foreground">Valores atuais:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span>Banco: <strong className="text-foreground">{televenda.banco}</strong></span>
                <span>Parcela: <strong className="text-foreground">{formatCurrency(televenda.parcela)}</strong></span>
                <span>Troco: <strong className="text-foreground">{televenda.troco ? formatCurrency(televenda.troco) : "-"}</strong></span>
                <span>Saldo: <strong className="text-foreground">{televenda.saldo_devedor ? formatCurrency(televenda.saldo_devedor) : "-"}</strong></span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
