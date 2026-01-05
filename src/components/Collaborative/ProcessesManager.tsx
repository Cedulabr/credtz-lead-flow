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
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FileText, Search, Clock, Eye } from "lucide-react";
import { CollaborativeProcess } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProcessesManager() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<CollaborativeProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProcess, setViewingProcess] = useState<CollaborativeProcess | null>(null);
  const [editingProcess, setEditingProcess] = useState<CollaborativeProcess | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaborative_processes")
      .select("*")
      .order("title");

    if (error) {
      toast.error("Erro ao carregar processos");
      console.error(error);
    } else {
      setProcesses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error("Título é obrigatório");
      return;
    }

    if (editingProcess) {
      const { error } = await supabase
        .from("collaborative_processes")
        .update({
          title: formData.title,
          content: formData.content || null,
          version: editingProcess.version + 1,
          updated_by: user?.id,
        })
        .eq("id", editingProcess.id);

      if (error) {
        toast.error("Erro ao atualizar processo");
        console.error(error);
      } else {
        toast.success("Processo atualizado com sucesso");
        fetchProcesses();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from("collaborative_processes")
        .insert({
          title: formData.title,
          content: formData.content || null,
          created_by: user?.id,
          updated_by: user?.id,
        });

      if (error) {
        toast.error("Erro ao criar processo");
        console.error(error);
      } else {
        toast.success("Processo criado com sucesso");
        fetchProcesses();
        closeDialog();
      }
    }
  };

  const handleDelete = async (process: CollaborativeProcess) => {
    const { error } = await supabase
      .from("collaborative_processes")
      .delete()
      .eq("id", process.id);

    if (error) {
      toast.error("Erro ao excluir processo");
      console.error(error);
    } else {
      toast.success("Processo excluído com sucesso");
      fetchProcesses();
    }
  };

  const openEditDialog = (process: CollaborativeProcess) => {
    setEditingProcess(process);
    setFormData({
      title: process.title,
      content: process.content || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProcess(null);
    setFormData({
      title: "",
      content: "",
    });
  };

  const filteredProcesses = processes.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Processos Internos
            </CardTitle>
            <CardDescription>Documentação operacional interna</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Processo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProcess ? "Editar Processo" : "Novo Processo"}</DialogTitle>
                <DialogDescription>Preencha os dados do processo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Como cadastrar proposta"
                  />
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Descreva o processo passo a passo..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Suporta Markdown para formatação
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>{editingProcess ? "Salvar" : "Criar"}</Button>
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
              placeholder="Buscar processos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredProcesses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum processo cadastrado"}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProcesses.map((process) => (
              <Card key={process.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{process.title}</CardTitle>
                    <Badge variant="outline">v{process.version}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {process.content || "Sem conteúdo"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(process.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setViewingProcess(process)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(process)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. O processo "{process.title}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(process)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Process Dialog */}
        <Dialog open={!!viewingProcess} onOpenChange={() => setViewingProcess(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {viewingProcess?.title}
                <Badge variant="outline">v{viewingProcess?.version}</Badge>
              </DialogTitle>
              <DialogDescription>
                Atualizado em {viewingProcess && format(new Date(viewingProcess.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {viewingProcess?.content || "Sem conteúdo"}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
