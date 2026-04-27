import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import { formatCpf } from "../utils/cpfMask";

function field(label: string, value: any) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value ?? "—"}</div>
    </div>
  );
}

function getStr(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && v._text) return String(v._text).trim() || null;
  return String(v);
}

function formatDate(v: any) {
  const s = getStr(v);
  if (!s) return null;
  // accept yyyy-mm-dd or dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

interface Props {
  resultado: any;
  metodo: string;
}

export function DadosCadastraisSection({ resultado, metodo }: Props) {
  const cad =
    metodo === "NVCHECK_JSON"
      ? resultado?.d?.CONSULTA?.CADASTRAIS ?? resultado?.CONSULTA?.CADASTRAIS
      : resultado?.CONSULTA?.CADASTRO;

  if (!cad) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">Sem dados cadastrais retornados.</Card>
    );
  }

  const obito = (getStr(cad.FLOBITO) || "").toUpperCase() === "S";
  const pep = (getStr(cad.FLPEP) || "").toUpperCase() === "S";
  const cpfRaw = getStr(cad.CPF) || getStr(cad.DOCUMENTO);

  return (
    <div className="space-y-3">
      {obito && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Indicador de óbito retornado pela base.</AlertDescription>
        </Alert>
      )}
      {pep && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Pessoa Politicamente Exposta (PEP).</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {field("Nome", getStr(cad.NOME))}
        {field("CPF", cpfRaw ? formatCpf(cpfRaw) : null)}
        {field("Nascimento", formatDate(cad.DTNASC ?? cad.DATANASCIMENTO))}
        {field("Idade", getStr(cad.IDADE))}
        {field("Sexo", getStr(cad.SEXO))}
        {field("Mãe", getStr(cad.NOMEMAE ?? cad.MAE))}
        {field("Geração", getStr(cad.GERACAO))}
        {field("Classe Econômica", getStr(cad.CLASSEECONOMICA ?? cad.CLASSE))}
        {field("Fonte de Renda", getStr(cad.FONTERENDA))}
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">Score</div>
          <ScoreBadge score={getStr(cad.SCORE) ?? cad.SCORE} />
        </div>
        {field("Persona Crédito", getStr(cad.PERSONACREDITO ?? cad.PERSONA))}
      </div>
    </div>
  );
}
