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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Eye, EyeOff, Copy, Pencil, Trash2, Key, ExternalLink, Search, Clock, User } from "lucide-react";
import { CollaborativePassword, ACCESS_TYPES, AccessType } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PasswordsManager() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<CollaborativePassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<CollaborativePassword | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showPasswordConfirm, setShowPasswordConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    system_name: "",
    access_url: "",
    login_user: "",
    password: "",
    access_type: "operator" as AccessType,
    observations: "",
  });

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaborative_passwords")
      .select("*")
      .order("system_name");

    if (error) {
      toast.error("Erro ao carregar senhas");
      console.error(error);
    } else {
      setPasswords(data || []);
    }
    setLoading(false);
  };

  const logAudit = async (recordId: string, action: string, details?: any) => {
    await supabase.from("collaborative_audit_log").insert({
      table_name: "collaborative_passwords",
      record_id: recordId,
      action,
      user_id: user?.id,
      details,
    });
  };

  const encryptPassword = (password: string): string => {
    // Simple base64 encoding - in production, use proper encryption
    return btoa(password);
  };

  const decryptPassword = (encrypted: string): string => {
    try {
      return atob(encrypted);
    } catch {
      return encrypted;
    }
  };

  const handleSubmit = async () => {
    if (!formData.system_name || !formData.password) {
      toast.error("Nome do sistema e senha são obrigatórios");
      return;
    }

    const encryptedPassword = encryptPassword(formData.password);

    if (editingPassword) {
      // Save to history if password changed
      if (encryptedPassword !== editingPassword.encrypted_password) {
        await supabase.from("collaborative_password_history").insert({
          password_id: editingPassword.id,
          encrypted_password: editingPassword.encrypted_password,
          changed_by: user?.id,
        });
      }

      const { error } = await supabase
        .from("collaborative_passwords")
        .update({
          system_name: formData.system_name,
          access_url: formData.access_url || null,
          login_user: formData.login_user || null,
          encrypted_password: encryptedPassword,
          access_type: formData.access_type,
          observations: formData.observations || null,
          updated_by: user?.id,
        })
        .eq("id", editingPassword.id);

      if (error) {
        toast.error("Erro ao atualizar senha");
        console.error(error);
      } else {
        toast.success("Senha atualizada com sucesso");
        await logAudit(editingPassword.id, "edit", { system_name: formData.system_name });
        fetchPasswords();
        closeDialog();
      }
    } else {
      const { data, error } = await supabase
        .from("collaborative_passwords")
        .insert({
          system_name: formData.system_name,
          access_url: formData.access_url || null,
          login_user: formData.login_user || null,
          encrypted_password: encryptedPassword,
          access_type: formData.access_type,
          observations: formData.observations || null,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar senha");
        console.error(error);
      } else {
        toast.success("Senha criada com sucesso");
        await logAudit(data.id, "create", { system_name: formData.system_name });
        fetchPasswords();
        closeDialog();
      }
    }
  };

  const handleDelete = async (password: CollaborativePassword) => {
    const { error } = await supabase
      .from("collaborative_passwords")
      .delete()
      .eq("id", password.id);

    if (error) {
      toast.error("Erro ao excluir senha");
      console.error(error);
    } else {
      toast.success("Senha excluída com sucesso");
      fetchPasswords();
    }
  };

  const togglePasswordVisibility = async (id: string) => {
    if (visiblePasswords.has(id)) {
      setVisiblePasswords((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setShowPasswordConfirm(id);
    }
  };

  const confirmShowPassword = async (id: string) => {
    setVisiblePasswords((prev) => new Set(prev).add(id));
    setShowPasswordConfirm(null);
    await logAudit(id, "view_password");
  };

  const copyToClipboard = async (password: CollaborativePassword) => {
    const decrypted = decryptPassword(password.encrypted_password);
    await navigator.clipboard.writeText(decrypted);
    toast.success("Senha copiada!");
    await logAudit(password.id, "copy_password");
  };

  const openEditDialog = (password: CollaborativePassword) => {
    setEditingPassword(password);
    setFormData({
      system_name: password.system_name,
      access_url: password.access_url || "",
      login_user: password.login_user || "",
      password: decryptPassword(password.encrypted_password),
      access_type: password.access_type,
      observations: password.observations || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPassword(null);
    setFormData({
      system_name: "",
      access_url: "",
      login_user: "",
      password: "",
      access_type: "operator",
      observations: "",
    });
  };

  const filteredPasswords = passwords.filter(
    (p) =>
      p.system_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.login_user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.observations?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccessTypeBadge = (type: AccessType) => {
    const colors = {
      admin: "bg-red-500/10 text-red-500",
      operator: "bg-blue-500/10 text-blue-500",
      readonly: "bg-gray-500/10 text-gray-500",
    };
    const labels = ACCESS_TYPES.find((t) => t.value === type)?.label || type;
    return <Badge className={colors[type]}>{labels}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Acessos & Senhas
            </CardTitle>
            <CardDescription>Gerencie credenciais de sistemas de forma segura</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Acesso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPassword ? "Editar Acesso" : "Novo Acesso"}</DialogTitle>
                <DialogDescription>Preencha os dados do sistema</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Sistema *</Label>
                  <Input
                    value={formData.system_name}
                    onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                    placeholder="Ex: Banco XYZ"
                  />
                </div>
                <div>
                  <Label>URL de Acesso</Label>
                  <Input
                    value={formData.access_url}
                    onChange={(e) => setFormData({ ...formData, access_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Usuário / Login</Label>
                  <Input
                    value={formData.login_user}
                    onChange={(e) => setFormData({ ...formData, login_user: e.target.value })}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div>
                  <Label>Senha *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label>Tipo de Acesso</Label>
                  <Select
                    value={formData.access_type}
                    onValueChange={(value: AccessType) => setFormData({ ...formData, access_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingPassword ? "Salvar" : "Criar"}
                </Button>
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
              placeholder="Buscar por sistema, usuário ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredPasswords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum acesso cadastrado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPasswords.map((password) => (
                  <TableRow key={password.id}>
                    <TableCell>
                      <div className="font-medium">{password.system_name}</div>
                      {password.access_url && (
                        <a
                          href={password.access_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Acessar
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {password.login_user || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {visiblePasswords.has(password.id)
                            ? decryptPassword(password.encrypted_password)
                            : "••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => togglePasswordVisibility(password.id)}
                        >
                          {visiblePasswords.has(password.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(password)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getAccessTypeBadge(password.access_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(password.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(password)}
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
                              <AlertDialogTitle>Excluir acesso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O acesso "{password.system_name}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(password)}>
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

        {/* Password Confirmation Dialog */}
        <AlertDialog open={!!showPasswordConfirm} onOpenChange={() => setShowPasswordConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar visualização</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja visualizar esta senha? Esta ação será registrada no log de auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => showPasswordConfirm && confirmShowPassword(showPasswordConfirm)}>
                Visualizar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
