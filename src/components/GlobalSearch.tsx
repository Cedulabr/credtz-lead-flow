import { useState, useEffect } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Search, User, Settings, Users, FileText, Zap, Home, DollarSign, Wallet } from "lucide-react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um comando ou pesquise..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Módulos Principais">
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Início / Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Zap className="mr-2 h-4 w-4" />
              <span>Leads Premium</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Meus Clientes</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Gerador de Propostas</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Financeiro">
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Wallet className="mr-2 h-4 w-4" />
              <span>Minhas Comissões</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Tabela de Comissões</span>
            </CommandItem>
          </CommandGroup>
          {isAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Administração">
                <CommandItem onSelect={() => runCommand(() => navigate("/admin"))}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Painel do Administrador</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Gestão de Usuários</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}