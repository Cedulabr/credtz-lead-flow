import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserData, Company, UserCompany } from "./types";
import { UserAvatar } from "./UserAvatar";

interface UserEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  companies: Company[];
  userCompany?: UserCompany;
  onSave: (form: UserEditForm) => void;
}

export interface UserEditForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  pix_key: string;
  company: string;
  level: string;
  company_id: string;
  company_role: "gestor" | "colaborador" | "";
}

export function UserEditModal({ open, onOpenChange, user, companies, userCompany, onSave }: UserEditModalProps) {
  const [form, setForm] = useState<UserEditForm>({
    name: "", email: "", cpf: "", phone: "", pix_key: "",
    company: "", level: "", company_id: "", company_role: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        cpf: user.cpf || "",
        phone: user.phone || "",
        pix_key: user.pix_key || "",
        company: user.company || "",
        level: user.level || "",
        company_id: userCompany?.company_id || "",
        company_role: userCompany?.company_role || "",
      });
    }
  }, [user, userCompany]);

  if (!user) return null;

  const fields = [
    { id: "name", label: "Nome", placeholder: "Nome completo" },
    { id: "email", label: "Email", placeholder: "email@exemplo.com", type: "email" },
    { id: "cpf", label: "CPF", placeholder: "000.000.000-00" },
    { id: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
    { id: "pix_key", label: "Chave PIX", placeholder: "Chave PIX para pagamentos" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name || "?"} size="sm" />
            <DialogTitle className="text-base">Editar Usuário</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {fields.map((f) => (
            <div key={f.id}>
              <Label htmlFor={`edit-${f.id}`} className="text-xs">{f.label}</Label>
              <Input
                id={`edit-${f.id}`}
                type={(f as any).type || "text"}
                value={(form as any)[f.id]}
                onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                placeholder={f.placeholder}
                className="h-9"
              />
            </div>
          ))}

          <div>
            <Label className="text-xs">Empresa</Label>
            <Select
              value={form.company_id || "none"}
              onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cargo na Empresa</Label>
            <Select
              value={form.company_role || "none"}
              onValueChange={(v) => setForm({ ...form, company_role: v === "none" ? "" : v as any })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Nível</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="prata">Prata</SelectItem>
                <SelectItem value="ouro">Ouro</SelectItem>
                <SelectItem value="diamante">Diamante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => onSave(form)} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
