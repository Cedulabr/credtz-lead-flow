import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, FileText, Trash2, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { parseDateSafe } from "@/lib/date";
interface Transaction {
  id: string;
  company_id: string;
  description: string;
}

interface Receipt {
  id: string;
  transaction_id: string;
  company_id: string;
  name: string;
  payment_date: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

interface FinanceReceiptsProps {
  transaction: Transaction;
  companyId: string;
  isGestor: boolean;
}

export const FinanceReceipts = ({ transaction, companyId, isGestor }: FinanceReceiptsProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    file: null as File | null,
  });

  const formatDateDisplay = (dateStr: string) => {
    const d = parseDateSafe(dateStr);
    return d ? format(d, "dd/MM/yyyy") : "-";
  };

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchReceipts();
  }, [transaction.id]);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*")
        .eq("transaction_id", transaction.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      // Generate fresh signed URLs for each receipt
      const receiptsWithUrls = await Promise.all(
        (data || []).map(async (receipt) => {
          // Extract file path from stored URL or generate from pattern
          const filePath = `${receipt.company_id}/${receipt.transaction_id}/${receipt.file_name.split('/').pop() || receipt.id}`;
          
          // Try to create a signed URL
          const { data: urlData } = await supabase.storage
            .from("financial-receipts")
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          return {
            ...receipt,
            file_url: urlData?.signedUrl || receipt.file_url
          };
        })
      );

      setReceipts(receiptsWithUrls);
    } catch (error: any) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os comprovantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.payment_date || !formData.file) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos e selecione um arquivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = formData.file.name.split(".").pop();
      const fileName = `${companyId}/${transaction.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("financial-receipts")
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from("financial-receipts")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      if (urlError) throw urlError;

      // Save receipt record
      const { error: insertError } = await supabase
        .from("payment_receipts")
        .insert({
          transaction_id: transaction.id,
          company_id: companyId,
          name: formData.name,
          payment_date: formData.payment_date,
          file_url: urlData.signedUrl,
          file_name: formData.file.name,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: "Comprovante enviado",
        description: "O comprovante foi salvo com sucesso.",
      });

      setFormData({
        name: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        file: null,
      });
      setShowUploadForm(false);
      fetchReceipts();
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o comprovante.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receipt: Receipt) => {
    if (!confirm("Tem certeza que deseja excluir este comprovante?")) return;

    try {
      // Extract file path from URL
      const urlParts = receipt.file_url.split("/");
      const filePath = urlParts.slice(-3).join("/");

      // Delete from storage
      await supabase.storage
        .from("financial-receipts")
        .remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("payment_receipts")
        .delete()
        .eq("id", receipt.id);

      if (error) throw error;

      toast({
        title: "Comprovante excluído",
        description: "O comprovante foi removido com sucesso.",
      });

      fetchReceipts();
    } catch (error: any) {
      console.error("Error deleting receipt:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comprovante.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {isGestor && !showUploadForm && (
        <Button onClick={() => setShowUploadForm(true)} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Anexar Comprovante
        </Button>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt-name">Nome do Pagamento *</Label>
                <Input
                  id="receipt-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pagamento parcela janeiro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Data do Pagamento *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt-file">Arquivo (PDF, Imagem) *</Label>
                <Input
                  id="receipt-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 5MB. Formatos: PDF, JPG, PNG, WEBP
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receipts List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum comprovante anexado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{receipt.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateDisplay(receipt.payment_date)}</span>
                      <span>•</span>
                      <span>{receipt.file_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={receipt.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>

                  {isGestor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(receipt)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
