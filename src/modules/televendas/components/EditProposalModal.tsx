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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Save, Loader2 } from "lucide-react";
import { Televenda, PRODUCT_OPTIONS } from "../types";
import { formatCPF, formatPhone, formatCurrency } from "../utils";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(11, "CPF inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  banco: z.string().min(1, "Banco é obrigatório"),
  tipo_operacao: z.string().min(1, "Tipo de operação é obrigatório"),
  data_venda: z.string().min(1, "Data da venda é obrigatória"),
  parcela: z.string().min(1, "Parcela é obrigatória"),
  troco: z.string().optional(),
  saldo_devedor: z.string().optional(),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  televenda: Televenda | null;
  onSave: (id: string, data: Partial<Televenda>) => Promise<void>;
  banks: string[];
}

export const EditProposalModal = ({
  open,
  onOpenChange,
  televenda,
  onSave,
  banks,
}: EditProposalModalProps) => {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      telefone: "",
      banco: "",
      tipo_operacao: "",
      data_venda: "",
      parcela: "",
      troco: "",
      saldo_devedor: "",
      observacao: "",
    },
  });

  // Reset form when modal opens with televenda data
  useEffect(() => {
    if (open && televenda) {
      form.reset({
        nome: televenda.nome || "",
        cpf: formatCPF(televenda.cpf) || "",
        telefone: formatPhone(televenda.telefone) || "",
        banco: televenda.banco || "",
        tipo_operacao: televenda.tipo_operacao || "",
        data_venda: televenda.data_venda || "",
        parcela: televenda.parcela?.toString() || "",
        troco: televenda.troco?.toString() || "",
        saldo_devedor: televenda.saldo_devedor?.toString() || "",
        observacao: televenda.observacao || "",
      });
    }
  }, [open, televenda, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!televenda) return;
    
    setSaving(true);
    try {
      // Clean and parse values
      const cleanCpf = values.cpf.replace(/\D/g, "");
      const cleanPhone = values.telefone.replace(/\D/g, "");
      const parcela = parseFloat(values.parcela.replace(/[^\d,.]/g, "").replace(",", ".")) || 0;
      const troco = values.troco ? parseFloat(values.troco.replace(/[^\d,.]/g, "").replace(",", ".")) : null;
      const saldoDevedor = values.saldo_devedor ? parseFloat(values.saldo_devedor.replace(/[^\d,.]/g, "").replace(",", ".")) : null;

      await onSave(televenda.id, {
        nome: values.nome,
        cpf: cleanCpf,
        telefone: cleanPhone,
        banco: values.banco,
        tipo_operacao: values.tipo_operacao,
        data_venda: values.data_venda,
        parcela,
        troco,
        saldo_devedor: saldoDevedor,
        observacao: values.observacao || null,
      });
      
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Format handlers
  const handleCpfChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  if (!televenda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Proposta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CPF and Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(handleCpfChange(e.target.value))}
                        placeholder="000.000.000-00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(handlePhoneChange(e.target.value))}
                        placeholder="(00) 00000-0000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Banco and Tipo Operação */}
            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="tipo_operacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Operação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_OPTIONS.filter(p => p.value !== "all").map((product) => (
                          <SelectItem key={product.value} value={product.value}>
                            {product.icon} {product.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data Venda */}
            <FormField
              control={form.control}
              name="data_venda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Venda</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="parcela"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcela (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="troco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Troco (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,00" />
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
                    <FormLabel>Saldo Devedor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observação */}
            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações adicionais..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
