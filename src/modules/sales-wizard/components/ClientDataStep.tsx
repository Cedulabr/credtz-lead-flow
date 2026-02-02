import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { WizardStepProps } from "../types";
import { StepHeader } from "./StepHeader";
import { CPFInput } from "./CPFInput";
import { PhoneInput } from "./PhoneInput";
import { FieldHint } from "./FieldHint";

export function ClientDataStep({ data, onUpdate, onValidChange }: WizardStepProps) {
  const [clientFound, setClientFound] = useState(false);

  useEffect(() => {
    const isValid = Boolean(
      data.cpf?.length === 11 && 
      data.nome && data.nome.length >= 3 && 
      data.telefone && data.telefone.length >= 10
    );
    onValidChange(isValid);
  }, [data.cpf, data.nome, data.telefone, onValidChange]);

  const handleClientFound = (nome: string, telefone: string) => {
    onUpdate({ nome, telefone });
    setClientFound(true);
  };

  const handleNewClient = () => {
    setClientFound(false);
  };

  return (
    <div className="space-y-6">
      <StepHeader
        stepNumber={1}
        title="Dados do Cliente"
        subtitle="Comece digitando o CPF para buscar os dados automaticamente"
        icon={<User className="h-5 w-5" />}
      />

      <FieldHint type="tip">
        💡 <strong>Dica:</strong> Sempre comece pelo CPF! Se o cliente já fez operação antes, os dados serão preenchidos automaticamente.
      </FieldHint>

      <div className="grid gap-6">
        <CPFInput
          value={data.cpf || ""}
          onChange={(cpf) => onUpdate({ cpf })}
          onClientFound={handleClientFound}
          onNewClient={handleNewClient}
        />

        <div className="space-y-2">
          <Label className="text-base font-medium">Nome Completo</Label>
          <Input
            value={data.nome || ""}
            onChange={(e) => onUpdate({ nome: e.target.value })}
            placeholder="Digite o nome completo do cliente"
            className="h-12 text-base"
            disabled={clientFound}
          />
          {clientFound && (
            <p className="text-xs text-muted-foreground">
              🔒 Nome preenchido automaticamente do cadastro anterior
            </p>
          )}
        </div>

        <PhoneInput
          value={data.telefone || ""}
          onChange={(telefone) => onUpdate({ telefone })}
          disabled={clientFound}
        />
      </div>

      {data.cpf?.length === 11 && data.nome && data.telefone?.length >= 10 && (
        <FieldHint type="success">
          ✅ Dados do cliente completos! Clique em <strong>Próximo</strong> para escolher o produto.
        </FieldHint>
      )}
    </div>
  );
}
