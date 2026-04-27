import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreBadge } from "./ScoreBadge";
import { formatCpf } from "../utils/cpfMask";

function getStr(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v._text) return String(v._text).trim();
  return String(v);
}
function asArr(v: any): any[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function field(label: string, value: any) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function PerfilCompletoSection({ resultado }: { resultado: any }) {
  const consulta = resultado?.d?.CONSULTA ?? resultado?.CONSULTA ?? {};
  const cad = consulta.CADASTRAIS ?? {};
  const credito = consulta.CREDITO ?? {};
  const empresas = asArr(consulta.EMPRESAS);
  const ligadas = asArr(consulta.PESSOASLIGADAS ?? consulta.PESSOAS_LIGADAS);
  const peps = asArr(consulta.PEP);
  const ruins = asArr(consulta.CONTATOSRUINS ?? consulta.CONTATOS_RUINS);
  const isPep = getStr(cad.FLPEP).toUpperCase() === "S";
  const propensao = Number(getStr(credito.PROPENSAOPAGAMENTO ?? credito.PROPENSAO_PAGAMENTO)) || 0;

  return (
    <Tabs defaultValue="credito" className="w-full">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="credito">Crédito</TabsTrigger>
        <TabsTrigger value="empresas">Empresas ({empresas.length})</TabsTrigger>
        <TabsTrigger value="ligadas">Pessoas Ligadas ({ligadas.length})</TabsTrigger>
        <TabsTrigger value="pep">PEP</TabsTrigger>
        <TabsTrigger value="ruins">Contatos Ruins ({ruins.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="credito" className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Score</div>
            <ScoreBadge score={getStr(credito.SCORE) || getStr(cad.SCORE)} />
          </div>
          {field("Mensagem", getStr(credito.MENSAGEM))}
          {field("Persona Digital", getStr(credito.PERSONADIGITAL ?? cad.PERSONADIGITAL))}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Propensão de Pagamento</div>
          <Progress value={propensao} />
          <div className="text-xs text-right mt-1">{propensao}%</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {field("Consultas 6m", getStr(credito.CONSULTAS6MESES))}
          {field("Consultas 12m", getStr(credito.CONSULTAS12MESES))}
        </div>
        <div className="flex flex-wrap gap-2">
          {getStr(credito.FLVEICULO).toUpperCase() === "S" && <Badge>Veículo</Badge>}
          {getStr(credito.FLIMOVEL).toUpperCase() === "S" && <Badge>Imóvel</Badge>}
          {getStr(credito.FLBOLSAFAMILIA).toUpperCase() === "S" && <Badge>Bolsa Família</Badge>}
          {getStr(credito.FLPOSSIVELAPOSENTADO).toUpperCase() === "S" && (
            <Badge>Possível Aposentado</Badge>
          )}
          {getStr(credito.FLDAU).toUpperCase() === "S" && <Badge>DAU</Badge>}
        </div>
      </TabsContent>

      <TabsContent value="empresas">
        {empresas.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>Participação</TableHead>
                <TableHead>CNAE</TableHead>
                <TableHead>Status RF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{getStr(e.CNPJ)}</TableCell>
                  <TableCell>{getStr(e.RAZAOSOCIAL ?? e.RAZAO_SOCIAL)}</TableCell>
                  <TableCell>{getStr(e.PARTICIPACAO)}%</TableCell>
                  <TableCell>{getStr(e.CNAE)}</TableCell>
                  <TableCell>{getStr(e.STATUSRF ?? e.STATUS_RF)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Sem empresas vinculadas.</Card>
        )}
      </TabsContent>

      <TabsContent value="ligadas">
        {ligadas.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Nascimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ligadas.map((p, i) => {
                const cpfRaw = getStr(p.CPF);
                const cpfMasked = cpfRaw
                  ? `${cpfRaw.slice(0, 3)}.***.***-${cpfRaw.slice(-2)}`
                  : "—";
                return (
                  <TableRow key={i}>
                    <TableCell>{getStr(p.NOME)}</TableCell>
                    <TableCell className="font-mono">{cpfMasked}</TableCell>
                    <TableCell>{getStr(p.VINCULO)}</TableCell>
                    <TableCell>{getStr(p.DTNASC ?? p.DATANASCIMENTO)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Sem pessoas ligadas.</Card>
        )}
      </TabsContent>

      <TabsContent value="pep">
        {isPep ? (
          <Alert variant="destructive">
            <AlertDescription>⚠️ Pessoa Politicamente Exposta</AlertDescription>
          </Alert>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">
            Não consta como PEP nesta consulta.
          </Card>
        )}
        {peps.length > 0 && (
          <div className="space-y-2 mt-3">
            {peps.map((p, i) => (
              <Card key={i} className="p-3 text-sm">
                <div className="font-medium">{getStr(p.NOME)}</div>
                <div className="text-xs text-muted-foreground">
                  {getStr(p.CARGO)} • {getStr(p.ORGAO)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ruins">
        {ruins.length ? (
          <div className="space-y-2">
            {ruins.map((r, i) => {
              const ddd = getStr(r.DDD);
              const tel = getStr(r.TELEFONE);
              return (
                <Card key={i} className="p-3 flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {ddd && `(${ddd}) `}
                    {tel}
                  </span>
                  {getStr(r.TIPO) && <Badge variant="destructive">{getStr(r.TIPO)}</Badge>}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Sem contatos ruins listados.</Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
