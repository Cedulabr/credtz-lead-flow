import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Link2, ExternalLink, Search } from "lucide-react";
import { CollaborativeLink, LINK_CATEGORIES, LinkCategory } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LinksManager() {
  const { user } = useAuth();
  const [links, setLinks] = useState<CollaborativeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CollaborativeLink | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "outros" as LinkCategory,
    url: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaborative_links")
      .select("*")
      .order("category")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar links");
      console.error(error);
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.url) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }

    if (editingLink) {
      const { error } = await supabase
        .from("collaborative_links")
        .update({
          name: formData.name,
          category: formData.category,
          url: formData.url,
          description: formData.description || null,
          is_active: formData.is_active,
          updated_by: user?.id,
        })
        .eq("id", editingLink.id);

      if (error) {
        toast.error("Erro ao atualizar link");
        console.error(error);
      } else {
        toast.success("Link atualizado com sucesso");
        fetchLinks();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from("collaborative_links")
        .insert({
          name: formData.name,
          category: formData.category,
          url: formData.url,
          description: formData.description || null,
          is_active: formData.is_active,
          created_by: user?.id,
          updated_by: user?.id,
        });

      if (error) {
        toast.error("Erro ao criar link");
        console.error(error);
      } else {
        toast.success("Link criado com sucesso");
        fetchLinks();
        closeDialog();
      }
    }
  };

  const handleDelete = async (link: CollaborativeLink) => {
    const { error } = await supabase
      .from("collaborative_links")
      .delete()
      .eq("id", link.id);

    if (error) {
      toast.error("Erro ao excluir link");
      console.error(error);
    } else {
      toast.success("Link excluído com sucesso");
      fetchLinks();
    }
  };

  const toggleActive = async (link: CollaborativeLink) => {
    const { error } = await supabase
      .from("collaborative_links")
      .update({ is_active: !link.is_active, updated_by: user?.id })
      .eq("id", link.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      fetchLinks();
    }
  };

  const openEditDialog = (link: CollaborativeLink) => {
    setEditingLink(link);
    setFormData({
      name: link.name,
      category: link.category,
      url: link.url,
      description: link.description || "",
      is_active: link.is_active,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingLink(null);
    setFormData({
      name: "",
      category: "outros",
      url: "",
      description: "",
      is_active: true,
    });
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || link.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: LinkCategory) => {
    const colors: Record<LinkCategory, string> = {
      banco: "bg-green-500/10 text-green-500",
      governo: "bg-blue-500/10 text-blue-500",
      parceiros: "bg-purple-500/10 text-purple-500",
      marketing: "bg-pink-500/10 text-pink-500",
      ferramentas: "bg-indigo-500/10 text-indigo-500",
      outros: "bg-gray-500/10 text-gray-500",
    };
    const label = LINK_CATEGORIES.find((c) => c.value === category)?.label || category;
    return <Badge className={colors[category]}>{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Links Importantes
            </CardTitle>
            <CardDescription>Organize URLs úteis do dia a dia</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingLink ? "Editar Link" : "Novo Link"}</DialogTitle>
                <DialogDescription>Preencha os dados do link</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Portal do Banco"
                  />
                </div>
                <div>
                  <Label>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: LinkCategory) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do link..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativo</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>{editingLink ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {LINK_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || categoryFilter !== "all" ? "Nenhum resultado encontrado" : "Nenhum link cadastrado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <TableRow key={link.id} className={!link.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {link.name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>{getCategoryBadge(link.category)}</TableCell>
                    <TableCell className="max-w-xs truncate">{link.description || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={() => toggleActive(link)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(link)}
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
                              <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O link "{link.name}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(link)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
