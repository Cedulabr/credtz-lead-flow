import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, FileText, Trash2, Eye, Plus, Search, CheckCircle, XCircle, 
  Edit2, AlertCircle, ChevronLeft, ChevronRight, Loader2, Filter,
  FileUp, User, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  latestDate: Date;
}

const documentTypeLabels: Record<string, string> = {
  rg_frente: "📄 RG (Frente)",
  rg_verso: "📄 RG (Verso)",
  extrato_emprestimo: "📄 Extrato",
};

const documentTypeEmojis: Record<string, string> = {
  rg_frente: "📋",
  rg_verso: "📋",
  extrato_emprestimo: "📊",
};

// CPF Validation
const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30];

export function ClientDocuments() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "pending">("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<"all" | "rg_frente" | "rg_verso" | "extrato_emprestimo">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [rgFrenteFile, setRgFrenteFile] = useState<File | null>(null);
  const [rgVersoFile, setRgVersoFile] = useState<File | null>(null);
  const [extratoFile, setExtratoFile] = useState<File | null>(null);

  // Edit states
  const [editingGroup, setEditingGroup] = useState<DocumentGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editCpfError, setEditCpfError] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    groupDocumentsByCpf();
  }, [documents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, documentTypeFilter]);

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
          latestDate: new Date(doc.created_at),
        };
      }

      groups[doc.client_cpf].documents.push(doc);

      const docDate = new Date(doc.created_at);
      if (docDate > groups[doc.client_cpf].latestDate) {
        groups[doc.client_cpf].latestDate = docDate;
      }

      if (doc.document_type === "rg_frente") groups[doc.client_cpf].hasRgFrente = true;
      if (doc.document_type === "rg_verso") groups[doc.client_cpf].hasRgVerso = true;
      if (doc.document_type === "extrato_emprestimo") groups[doc.client_cpf].hasExtrato = true;
    });

    const sortedGroups = Object.values(groups).sort(
      (a, b) => b.latestDate.getTime() - a.latestDate.getTime()
    );

    setGroupedDocuments(sortedGroups);
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const handleCpfChange = (value: string, setField: (v: string) => void, setError: (v: string) => void) => {
    const formatted = formatCPF(value);
    setField(formatted);
    
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      if (!validateCPF(cleaned)) {
        setError("⚠️ CPF inválido. Verifique os números.");
      } else {
        setError("");
      }
    } else if (cleaned.length > 0) {
      setError("");
    }
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

    const cleanCpf = clientCpf.replace(/\D/g, "");

    if (!clientName.trim() || !cleanCpf) {
      toast({
        title: "Erro",
        description: "Nome e CPF são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (cleanCpf.length !== 11) {
      setCpfError("⚠️ CPF incompleto. Digite os 11 dígitos.");
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setCpfError("⚠️ CPF inválido. Verifique os números.");
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
        title: "✅ Sucesso!",
        description: "Documentos enviados com sucesso!",
      });

      // Reset form
      setClientName("");
      setClientCpf("");
      setCpfError("");
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

  const handleEditClient = (group: DocumentGroup) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditCpf(formatCPF(group.cpf));
    setEditCpfError("");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGroup) return;

    const cleanCpf = editCpf.replace(/\D/g, "");

    if (!editName.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (cleanCpf.length !== 11) {
      setEditCpfError("⚠️ CPF incompleto. Digite os 11 dígitos.");
      return;
    }

    if (!validateCPF(cleanCpf)) {
      setEditCpfError("⚠️ CPF inválido. Verifique os números.");
      return;
    }

    setSaving(true);

    try {
      // Update all documents for this client
      const { error } = await supabase
        .from("client_documents")
        .update({
          client_name: editName,
          client_cpf: cleanCpf,
        })
        .eq("client_cpf", editingGroup.cpf);

      if (error) throw error;

      toast({
        title: "✅ Sucesso!",
        description: "Dados do cliente atualizados!",
      });

      setIsEditDialogOpen(false);
      setEditingGroup(null);
      fetchDocuments();
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do cliente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

    if (!confirm("🗑️ Deseja realmente excluir este documento?")) return;

    try {
      const filePath = doc.file_url.split("/client-documents/")[1];
      if (filePath) {
        await supabase.storage.from("client-documents").remove([filePath]);
      }

      const { error } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast({
        title: "✅ Sucesso!",
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

  // Advanced filtering
  const filteredGroups = useMemo(() => {
    return groupedDocuments.filter((group) => {
      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        group.name.toLowerCase().includes(searchLower) ||
        group.cpf.includes(searchTerm.replace(/\D/g, "")) ||
        formatCPF(group.cpf).includes(searchTerm);

      // Status filter
      const isComplete = group.hasRgFrente && group.hasRgVerso;
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "complete" && isComplete) ||
        (statusFilter === "pending" && !isComplete);

      // Document type filter
      const matchesDocType = 
        documentTypeFilter === "all" ||
        (documentTypeFilter === "rg_frente" && group.hasRgFrente) ||
        (documentTypeFilter === "rg_verso" && group.hasRgVerso) ||
        (documentTypeFilter === "extrato_emprestimo" && group.hasExtrato);

      return matchesSearch && matchesStatus && matchesDocType;
    });
  }, [groupedDocuments, searchTerm, statusFilter, documentTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage, itemsPerPage]);

  // Stats
  const stats = useMemo(() => ({
    total: groupedDocuments.length,
    complete: groupedDocuments.filter((g) => g.hasRgFrente && g.hasRgVerso).length,
    pending: groupedDocuments.filter((g) => !g.hasRgFrente || !g.hasRgVerso).length,
    withExtrato: groupedDocuments.filter((g) => g.hasExtrato).length,
  }), [groupedDocuments]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            📁 Documentos
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Gestão de documentos dos clientes</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto gap-2 text-base py-6 sm:py-4">
              <Plus className="h-5 w-5" />
              📤 Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                ⬆️ Upload de Documentos
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Nome do Cliente *
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientCpf" className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> CPF *
                </Label>
                <Input
                  id="clientCpf"
                  value={clientCpf}
                  onChange={(e) => handleCpfChange(e.target.value, setClientCpf, setCpfError)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`h-12 text-base ${cpfError ? "border-destructive" : ""}`}
                  required
                />
                {cpfError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {cpfError}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rgFrente" className="text-base">📋 RG (Frente) *</Label>
                <div className="relative">
                  <Input
                    id="rgFrente"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setRgFrenteFile(e.target.files?.[0] || null)}
                    className="h-12 pt-3"
                    required
                  />
                  {rgFrenteFile && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/10 text-success">
                      ✓ {rgFrenteFile.name.slice(0, 15)}...
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rgVerso" className="text-base">📋 RG (Verso) *</Label>
                <div className="relative">
                  <Input
                    id="rgVerso"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setRgVersoFile(e.target.files?.[0] || null)}
                    className="h-12 pt-3"
                    required
                  />
                  {rgVersoFile && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/10 text-success">
                      ✓ {rgVersoFile.name.slice(0, 15)}...
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extrato" className="text-base">📊 Extrato de Empréstimo (opcional)</Label>
                <div className="relative">
                  <Input
                    id="extrato"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setExtratoFile(e.target.files?.[0] || null)}
                    className="h-12 pt-3"
                  />
                  {extratoFile && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-success/10 text-success">
                      ✓ {extratoFile.name.slice(0, 15)}...
                    </Badge>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-lg gap-2" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FileUp className="h-5 w-5" />
                    📤 Enviar Documentos
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-3xl md:text-4xl font-bold text-primary">{stats.total}</div>
            <p className="text-sm text-muted-foreground">📁 Total de Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="text-3xl md:text-4xl font-bold text-success">{stats.complete}</div>
            <p className="text-sm text-muted-foreground">✅ Completos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="text-3xl md:text-4xl font-bold text-warning">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">⏳ Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="text-3xl md:text-4xl font-bold text-accent-foreground">{stats.withExtrato}</div>
            <p className="text-sm text-muted-foreground">📊 Com Extrato</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search & Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="🔍 Buscar por nome, CPF ou tipo de documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[160px] h-10">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Todos</SelectItem>
              <SelectItem value="complete">✅ Completos</SelectItem>
              <SelectItem value="pending">⏳ Pendentes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={documentTypeFilter} onValueChange={(v) => setDocumentTypeFilter(v as typeof documentTypeFilter)}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <FileText className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📁 Todos os tipos</SelectItem>
              <SelectItem value="rg_frente">📋 RG Frente</SelectItem>
              <SelectItem value="rg_verso">📋 RG Verso</SelectItem>
              <SelectItem value="extrato_emprestimo">📊 Extrato</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-full sm:w-[140px] h-10">
              <SelectValue placeholder="Por página" />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt.toString()}>{opt} por página</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Documents List - Mobile Cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence mode="popLayout">
          {paginatedGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">Nenhum documento encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou adicione um novo documento</p>
            </motion.div>
          ) : (
            paginatedGroups.map((group, index) => (
              <motion.div
                key={group.cpf}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">{formatCPF(group.cpf)}</p>
                      </div>
                      <Badge variant={group.hasRgFrente && group.hasRgVerso ? "default" : "secondary"}>
                        {group.hasRgFrente && group.hasRgVerso ? "✅ Completo" : "⏳ Pendente"}
                      </Badge>
                    </div>

                    {/* Documents Status */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={group.hasRgFrente ? "outline" : "destructive"} className="gap-1">
                        {group.hasRgFrente ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        RG Frente
                      </Badge>
                      <Badge variant={group.hasRgVerso ? "outline" : "destructive"} className="gap-1">
                        {group.hasRgVerso ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        RG Verso
                      </Badge>
                      {group.hasExtrato && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Extrato
                        </Badge>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      📅 {group.latestDate.toLocaleDateString("pt-BR")}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {group.documents.map((doc) => (
                        <Button
                          key={doc.id}
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.file_url, "_blank")}
                          className="gap-1 flex-1 min-w-[100px]"
                        >
                          <Eye className="h-4 w-4" />
                          {documentTypeEmojis[doc.document_type]} {documentTypeLabels[doc.document_type]?.split("(")[1]?.replace(")", "") || doc.document_type}
                        </Button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditClient(group)}
                        className="flex-1 gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        ✏️ Editar
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Excluir todos os documentos deste cliente?")) {
                              group.documents.forEach(doc => handleDeleteDocument(doc));
                            }
                          }}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          🗑️
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Documents Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            📁 Clientes e Documentos
          </CardTitle>
          <CardDescription>
            Mostrando {paginatedGroups.length} de {filteredGroups.length} clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">👤 Cliente</TableHead>
                  <TableHead className="text-base">📋 CPF</TableHead>
                  <TableHead className="text-center">📋 RG Frente</TableHead>
                  <TableHead className="text-center">📋 RG Verso</TableHead>
                  <TableHead className="text-center">📊 Extrato</TableHead>
                  <TableHead className="text-base">📅 Data</TableHead>
                  <TableHead className="text-center">⚡ Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg">Nenhum documento encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group, index) => (
                      <motion.tr
                        key={group.cpf}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium text-base">{group.name}</TableCell>
                        <TableCell className="font-mono">{formatCPF(group.cpf)}</TableCell>
                        <TableCell className="text-center">
                          {group.hasRgFrente ? (
                            <CheckCircle className="h-6 w-6 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-6 w-6 text-destructive mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {group.hasRgVerso ? (
                            <CheckCircle className="h-6 w-6 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-6 w-6 text-destructive mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {group.hasExtrato ? (
                            <CheckCircle className="h-6 w-6 text-success mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{group.latestDate.toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {group.documents.map((doc) => (
                              <Button
                                key={doc.id}
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(doc.file_url, "_blank")}
                                title={`👁️ ${documentTypeLabels[doc.document_type]}`}
                                className="h-9 w-9"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ))}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditClient(group)}
                              title="✏️ Editar cliente"
                              className="h-9 w-9"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && group.documents.length > 0 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteDocument(group.documents[0])}
                                title="🗑️ Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4"
        >
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({filteredGroups.length} clientes)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Mobile: Load More Button */}
      {totalPages > 1 && currentPage < totalPages && (
        <div className="md:hidden">
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => setCurrentPage(p => p + 1)}
          >
            📥 Carregar mais ({filteredGroups.length - (currentPage * itemsPerPage)} restantes)
          </Button>
        </div>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              ✏️ Editar Dados do Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Nome do Cliente
              </Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome completo"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCpf" className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> CPF
              </Label>
              <Input
                id="editCpf"
                value={editCpf}
                onChange={(e) => handleCpfChange(e.target.value, setEditCpf, setEditCpfError)}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`h-12 text-base ${editCpfError ? "border-destructive" : ""}`}
              />
              {editCpfError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm flex items-center gap-1"
                >
                  <AlertCircle className="h-4 w-4" />
                  {editCpfError}
                </motion.p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  ✅ Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
