import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getStr(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v._text) return String(v._text).trim();
  return String(v);
}

function asArray(v: any): any[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export function EnderecosSection({ resultado, metodo }: { resultado: any; metodo: string }) {
  const root =
    metodo === "NVCHECK_JSON"
      ? resultado?.d?.CONSULTA ?? resultado?.CONSULTA
      : resultado?.CONSULTA;
  let enderecos: any[] = [];
  if (metodo === "NVCHECK_JSON") {
    enderecos = asArray(root?.ENDERECOS);
  } else {
    enderecos = asArray(root?.ENDERECOS?.ENDERECO);
  }

  if (!enderecos.length) {
    return <Card className="p-4 text-sm text-muted-foreground">Nenhum endereço retornado.</Card>;
  }

  return (
    <div className="space-y-2">
      {enderecos.map((e, i) => {
        const logradouro = getStr(e.LOGRADOURO);
        const numero = getStr(e.NUMERO);
        const compl = getStr(e.COMPLEMENTO);
        const bairro = getStr(e.BAIRRO);
        const cidade = getStr(e.CIDADE);
        const uf = getStr(e.UF);
        const cep = getStr(e.CEP);
        const risco = getStr(e.AREARISCO).toUpperCase() === "S";
        return (
          <Card key={i} className="p-3 space-y-1">
            <div className="text-sm font-medium">
              {logradouro} {numero && `, ${numero}`} {compl && `- ${compl}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {[bairro, cidade && uf ? `${cidade}/${uf}` : cidade || uf, cep]
                .filter(Boolean)
                .join(" • ")}
            </div>
            {risco && <Badge variant="destructive">⚠️ Área de risco</Badge>}
          </Card>
        );
      })}
    </div>
  );
}
