import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserData } from "./types";
import { UserAvatar } from "./UserAvatar";

interface UserPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (userId: string, password: string) => void;
}

export function UserPasswordModal({ open, onOpenChange, user, onSave }: UserPasswordModalProps) {
  const [password, setPassword] = useState("");

  const handleSave = () => {
    if (user && password) {
      onSave(user.id, password);
      setPassword("");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setPassword(""); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name || "?"} size="sm" />
            <div>
              <DialogTitle className="text-base">Definir Senha</DialogTitle>
              <p className="text-xs text-muted-foreground">{user.name || user.email}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="new-pass" className="text-xs">Nova Senha</Label>
            <Input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!password}>Definir Senha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
