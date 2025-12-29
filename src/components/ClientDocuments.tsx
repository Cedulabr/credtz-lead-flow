import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Eye, Plus, Search, CheckCircle, XCircle } from "lucide-react";

interface ClientDocument {
  id: string;
  client_cpf: string;
  client_name: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

interface DocumentGroup {
  cpf: string;
  name: string;
  documents: ClientDocument[];
  hasRgFrente: boolean;
  hasRgVerso: boolean;
  hasExtrato: boolean;
}

const documentTypeLabels: Record<string, string> = {
  rg_frente: "RG (Frente)",
  rg_verso: "RG (Verso)",
  extrato_emprestimo: "Extrato de Empréstimo",
};

export function ClientDocuments() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [rgFrenteFile, setRgFrenteFile] = useState<File | null>(null);
  const [rgVersoFile, setRgVersoFile] = useState<File | null>(null);
  const [extratoFile, setExtratoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    groupDocumentsByCpf();
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupDocumentsByCpf = () => {
    const groups: Record<string, DocumentGroup> = {};

    documents.forEach((doc) => {
      if (!groups[doc.client_cpf]) {
        groups[doc.client_cpf] = {
          cpf: doc.client_cpf,
          name: doc.client_name,
          documents: [],
          hasRgFrente: false,
          hasRgVerso: false,
          hasExtrato: false,
        };
      }

      groups[doc.client_cpf].documents.push(doc);

      if (doc.document_type === "rg_frente") groups[doc.client_cpf].hasRgFrente = true;
      if (doc.document_type === "rg_verso") groups[doc.client_cpf].hasRgVerso = true;
      if (doc.document_type === "extrato_emprestimo") groups[doc.client_cpf].hasExtrato = true;
    });

    setGroupedDocuments(Object.values(groups));
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const uploadFile = async (file: File, documentType: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${clientCpf.replace(/\D/g, "")}/${documentType}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("client-documents")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("client-documents")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientCpf.trim()) {
      toast({
        title: "Erro",
        description: "Nome e CPF são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!rgFrenteFile || !rgVersoFile) {
      toast({
        title: "Erro",
        description: "RG (frente e verso) são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const filesToUpload = [
        { file: rgFrenteFile, type: "rg_frente" },
        { file: rgVersoFile, type: "rg_verso" },
      ];

      if (extratoFile) {
        filesToUpload.push({ file: extratoFile, type: "extrato_emprestimo" });
      }

      const cleanCpf = clientCpf.replace(/\D/g, "");

      for (const { file, type } of filesToUpload) {
        const fileUrl = await uploadFile(file, type);
        
        if (fileUrl) {
          const { error } = await supabase.from("client_documents").insert({
            client_cpf: cleanCpf,
            client_name: clientName,
            document_type: type,
            file_url: fileUrl,
            file_name: file.name,
            uploaded_by: user?.id,
          });

          if (error) throw error;
        }
      }

      toast({
        title: "Sucesso",
        description: "Documentos enviados com sucesso!",
      });

      // Reset form
      setClientName("");
      setClientCpf("");
      setRgFrenteFile(null);
      setRgVersoFile(null);
      setExtratoFile(null);
      setIsUploadDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documentos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: ClientDocument) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir documentos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete from storage
      const filePath = doc.file_url.split("/client-documents/")[1];
      if (filePath) {
        await supabase.storage.from("client-documents").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso",
      });

      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir documento",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groupedDocuments.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.cpf.includes(searchTerm.replace(/\D/g, ""))
  );

  const stats = {
    total: groupedDocuments.length,
    complete: groupedDocuments.filter((g) => g.hasRgFrente && g.hasRgVerso).length,
    pending: groupedDocuments.filter((g) => !g.hasRgFrente || !g.hasRgVerso).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Gestão de documentos dos clientes</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload de Documentos</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="clientCpf">CPF *</Label>
                <Input
                  id="clientCpf"
                  value={clientCpf}
                  onChange={(e) => setClientCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <Label htmlFor="rgFrente">RG (Frente) *</Label>
                <Input
                  id="rgFrente"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setRgFrenteFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="rgVerso">RG (Verso) *</Label>
                <Input
                  id="rgVerso"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setRgVersoFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="extrato">Extrato de Empréstimo (opcional)</Label>
                <Input
                  id="extrato"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setExtratoFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Documentos
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
            <p className="text-sm text-muted-foreground">Documentos Completos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes e Documentos</CardTitle>
          <CardDescription>Lista de clientes com seus documentos enviados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>RG Frente</TableHead>
                <TableHead>RG Verso</TableHead>
                <TableHead>Extrato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum documento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow key={group.cpf}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{formatCPF(group.cpf)}</TableCell>
                    <TableCell>
                      {group.hasRgFrente ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {group.hasRgVerso ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {group.hasExtrato ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.documents[0] &&
                        new Date(group.documents[0].created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {group.documents.map((doc) => (
                          <Button
                            key={doc.id}
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.file_url, "_blank")}
                            title={documentTypeLabels[doc.document_type]}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ))}
                        {isAdmin && group.documents.length > 0 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteDocument(group.documents[0])}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
