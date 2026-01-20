import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, KeyRound, Crown, User } from "lucide-react";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  level: string;
  cpf: string;
  phone: string;
  role: string;
  company_id: string;
  company_role: 'gestor' | 'colaborador';
}

interface Company {
  id: string;
  name: string;
}

export function CreateUser() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    level: "",
    cpf: "",
    phone: "",
    role: "partner",
    company_id: "",
    company_role: "colaborador"
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (!error && data) {
      setCompanies(data);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, email e senha são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Buscar o nome da empresa selecionada
      const selectedCompany = companies.find(c => c.id === formData.company_id);
      
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          company: selectedCompany?.name || "",
          level: formData.level,
          cpf: formData.cpf,
          phone: formData.phone,
          role: formData.role,
          company_id: formData.company_id || null,
          company_role: formData.company_role
        }
      });

      if (error) throw error;

      toast({
        title: "Usuário criado com sucesso!",
        description: `O usuário ${formData.name} foi criado e pode fazer login.`,
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        level: "",
        cpf: "",
        phone: "",
        role: "partner",
        company_id: "",
        company_role: "colaborador"
      });
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro interno do servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Senha de acesso"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomPassword}
                  title="Gerar senha aleatória"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="partner">Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company_id">Empresa</Label>
              <Select
                value={formData.company_id || "none"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem empresa</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level">Nível</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="prata">Prata</SelectItem>
                  <SelectItem value="ouro">Ouro</SelectItem>
                  <SelectItem value="diamante">Diamante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.company_id && formData.company_id !== "none" && (
              <div>
                <Label htmlFor="company_role">Cargo na Empresa</Label>
                <Select
                  value={formData.company_role}
                  onValueChange={(value: 'gestor' | 'colaborador') => setFormData(prev => ({ ...prev, company_role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-yellow-500" />
                        Gestor
                      </div>
                    </SelectItem>
                    <SelectItem value="colaborador">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Colaborador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <Button 
            onClick={handleCreateUser} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Criando usuário..." : "Criar Usuário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}