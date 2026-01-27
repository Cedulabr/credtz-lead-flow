import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FolderOpen, ExternalLink, Search, FileIcon, Download } from "lucide-react";
import { CollaborativeDocument } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FILE_TYPES = [
  { value: "pdf", label: "PDF", color: "bg-red-500/10 text-red-500" },
  { value: "xlsx", label: "Excel", color: "bg-green-500/10 text-green-500" },
  { value: "docx", label: "Word", color: "bg-blue-500/10 text-blue-500" },
  { value: "pptx", label: "PowerPoint", color: "bg-violet-500/10 text-violet-500" },
  { value: "link", label: "Link", color: "bg-purple-500/10 text-purple-500" },
  { value: "other", label: "Outro", color: "bg-gray-500/10 text-gray-500" },
];

export function DocumentsManager() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CollaborativeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CollaborativeDocument | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    file_url: "",
    file_type: "pdf",
    description: "",
    category: "",
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaborative_documents")
      .select("*")
      .order("category")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar documentos");
      console.error(error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingDocument) {
      const { error } = await supabase
        .from("collaborative_documents")
        .update({
          name: formData.name,
          file_url: formData.file_url || null,
          file_type: formData.file_type || null,
          description: formData.description || null,
          category: formData.category || null,
          updated_by: user?.id,
        })
        .eq("id", editingDocument.id);

      if (error) {
        toast.error("Erro ao atualizar documento");
        console.error(error);
      } else {
        toast.success("Documento atualizado com sucesso");
        fetchDocuments();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from("collaborative_documents")
        .insert({
          name: formData.name,
          file_url: formData.file_url || null,
          file_type: formData.file_type || null,
          description: formData.description || null,
          category: formData.category || null,
          created_by: user?.id,
          updated_by: user?.id,
        });

      if (error) {
        toast.error("Erro ao criar documento");
        console.error(error);
      } else {
        toast.success("Documento criado com sucesso");
        fetchDocuments();
        closeDialog();
      }
    }
  };

  const handleDelete = async (doc: CollaborativeDocument) => {
    const { error } = await supabase
      .from("collaborative_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast.error("Erro ao excluir documento");
      console.error(error);
    } else {
      toast.success("Documento excluído com sucesso");
      fetchDocuments();
    }
  };

  const openEditDialog = (doc: CollaborativeDocument) => {
    setEditingDocument(doc);
    setFormData({
      name: doc.name,
      file_url: doc.file_url || "",
      file_type: doc.file_type || "pdf",
      description: doc.description || "",
      category: doc.category || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDocument(null);
    setFormData({
      name: "",
      file_url: "",
      file_type: "pdf",
      description: "",
      category: "",
    });
  };

  const filteredDocuments = documents.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by category
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const cat = doc.category || "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, CollaborativeDocument[]>);

  const getFileTypeBadge = (type: string | null) => {
    const fileType = FILE_TYPES.find((f) => f.value === type) || FILE_TYPES[FILE_TYPES.length - 1];
    return <Badge className={fileType.color}>{fileType.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documentação
            </CardTitle>
            <CardDescription>Central de arquivos e informações</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingDocument ? "Editar Documento" : "Novo Documento"}</DialogTitle>
                <DialogDescription>Preencha os dados do documento</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Manual de Operação"
                  />
                </div>
                <div>
                  <Label>URL do Arquivo</Label>
                  <Input
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Tipo de Arquivo</Label>
                  <select
                    value={formData.file_type}
                    onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    {FILE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Contratos, Manuais, etc"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do documento..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>{editingDocument ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : Object.keys(groupedDocuments).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum documento cadastrado"}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([category, docs]) => (
              <div key={category}>
                <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {category}
                </h3>
                <div className="grid gap-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {doc.name}
                            {getFileTypeBadge(doc.file_type)}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(doc.file_url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O documento "{doc.name}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(doc)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
