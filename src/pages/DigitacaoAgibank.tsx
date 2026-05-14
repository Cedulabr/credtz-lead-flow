import { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Calculator,
  Pencil,
  ArrowLeft,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  Building2,
  IdCard,
  FileText,
  Send,
  Check,
  X,
  Upload,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CurrencyInput } from "@/modules/sales-wizard/components/CurrencyInput";
import {
  calcularTroco,
  calcularPortabilidade,
  FATOR_COEFICIENTE_PORTABILIDADE,
  formatBRL,
} from "@/lib/calcularTroco";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type View = "home" | "simular" | "digitar";
type Produto = "novo_emprestimo" | "refinanciamento" | "portabilidade";
type Prazo = 84 | 96 | 108;

const PRAZOS: Prazo[] = [108, 96, 84];

const maskCPF = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
            step === 1
              ? "bg-primary text-primary-foreground"
              : "bg-emerald-600 text-white"
          )}
        >
          {step === 1 ? "1" : <Check className="h-4 w-4" />}
        </div>
        <span
          className={cn(
            "text-sm",
            step === 1 ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          Simular contrato
        </span>
      </div>
      <div className="h-px w-10 bg-border" />
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
            step === 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          2
        </div>
        <span
          className={cn(
            "text-sm",
            step === 2 ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          Cadastrar proposta
        </span>
      </div>
    </div>
  );
}

function UploadZone({
  label,
  required,
  file,
  onFile,
  onClear,
  icon: Icon,
  error,
}: {
  label: string;
  required: boolean;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  icon: typeof IdCard;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            required
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          )}
        >
          {required ? "Obrigatório" : "Opcional"}
        </span>
      </div>
      {file ? (
        <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-secondary/40">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-secondary"
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className={cn(
            "w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-sm transition-colors",
            drag
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60 hover:bg-secondary/30",
            error && "border-red-400"
          )}
        >
          <Icon className="h-6 w-6 text-muted-foreground" />
          <span className="text-muted-foreground">
            Arraste o arquivo aqui ou <span className="text-primary font-medium">clique para selecionar</span>
          </span>
          <span className="text-[11px] text-muted-foreground">JPG, PNG ou PDF</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function TrocoBox({
  variant,
  parcela,
  prazo,
  modo = "novo",
  saldoDevedor = 0,
}: {
  variant: "blue" | "green";
  parcela: number;
  prazo: number;
  modo?: "novo" | "portabilidade";
  saldoDevedor?: number;
}) {
  const isPort = modo === "portabilidade";
  const novo = useMemo(() => calcularTroco({ parcela, prazo }), [parcela, prazo]);
  const port = useMemo(
    () => calcularPortabilidade({ parcela, prazo, saldoDevedor }),
    [parcela, prazo, saldoDevedor]
  );
  const colors =
    variant === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-100"
      : "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-100";
  const sub =
    variant === "blue"
      ? "text-blue-700/80 dark:text-blue-300/80"
      : "text-emerald-700/80 dark:text-emerald-300/80";

  const titulo = isPort
    ? "Valor liberado ao cliente (taxa 1,65% a.m.)"
    : variant === "blue"
    ? "Troco líquido estimado (taxa 1,85% a.m. — já deduzido IOF)"
    : "Troco líquido estimado (taxa 1,85% — IOF deduzido)";

  const valor = isPort ? port.valorLiberado : novo.troco;
  const negativo = isPort && valor < 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 shadow-sm ring-1 ring-inset",
        colors,
        variant === "blue" ? "ring-blue-300/40" : "ring-emerald-300/40"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-3.5 w-3.5" />
        <p className="text-[11px] uppercase tracking-wider font-semibold">
          Troco estimado
        </p>
      </div>
      <p className="text-xs font-medium mb-1">{titulo}</p>
      <p
        className={cn(
          "text-3xl md:text-4xl font-extrabold tracking-tight",
          negativo && "text-red-600 dark:text-red-400"
        )}
      >
        {formatBRL(valor)}
      </p>
      {isPort ? (
        <p className={cn("text-xs mt-1", sub)}>
          Novo valor financiado: {formatBRL(port.novoValorFinanciado)} | Saldo devedor a quitar:{" "}
          {formatBRL(port.saldoDevedor)} | Fator {prazo}x: {port.fator.toFixed(6)}
        </p>
      ) : (
        <p className={cn("text-xs mt-1", sub)}>
          Crédito bruto: {formatBRL(novo.valorBruto)} | IOF estimado: {formatBRL(novo.iofEstimado)}
        </p>
      )}
      <p className="text-[11px] mt-2 italic opacity-80">
        * Valor estimado com base nas taxas vigentes. Sujeito a confirmação do banco.
      </p>
    </div>
  );
}

export default function DigitacaoAgibank() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("home");

  // Simular state
  const [simParcela, setSimParcela] = useState<number | undefined>(undefined);
  const [simPrazo, setSimPrazo] = useState<Prazo>(108);

  // Digitar state
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [produto, setProduto] = useState<Produto | null>(null);
  const [parcela, setParcela] = useState<number | undefined>(undefined);
  const [prazo, setPrazo] = useState<Prazo>(108);
  const [rgFrente, setRgFrente] = useState<File | null>(null);
  const [rgVerso, setRgVerso] = useState<File | null>(null);
  const [extrato, setExtrato] = useState<File | null>(null);
  // Portabilidade extra fields
  const [bancoOriginador, setBancoOriginador] = useState("");
  const [prazoTotal, setPrazoTotal] = useState<number | undefined>(undefined);
  const [parcelasAberto, setParcelasAberto] = useState<number | undefined>(undefined);
  const [saldoDevedor, setSaldoDevedor] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const goSimular = () => {
    setView("simular");
  };
  const goDigitar = () => {
    setErrors({});
    setView("digitar");
  };
  const goHome = () => {
    setView("home");
  };

  const handleDigitarFromSim = () => {
    setParcela(simParcela);
    setPrazo(simPrazo);
    goDigitar();
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (cpf.replace(/\D/g, "").length !== 11) e.cpf = "CPF inválido";
    if (!nome.trim()) e.nome = "Informe o nome do cliente";
    if (telefone.replace(/\D/g, "").length < 10) e.telefone = "Telefone inválido";
    if (!produto) e.produto = "Selecione um produto";
    if (!parcela || parcela <= 0) e.parcela = "Informe o valor da parcela";
    if (!rgFrente) e.rgFrente = "Envie o RG (frente)";
    if (!rgVerso) e.rgVerso = "Envie o RG (verso)";
    if (produto === "portabilidade") {
      if (!bancoOriginador.trim()) e.bancoOriginador = "Informe o banco originador";
      if (!prazoTotal || prazoTotal <= 0) e.prazoTotal = "Informe o prazo total";
      if (!parcelasAberto || parcelasAberto <= 0) e.parcelasAberto = "Informe as parcelas em aberto";
      if (!saldoDevedor || saldoDevedor <= 0) e.saldoDevedor = "Informe o saldo devedor";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadFile = async (file: File, kind: string): Promise<string> => {
    const cpfDigits = cpf.replace(/\D/g, "");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${cpfDigits}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("digitacao-documentos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const handleClickEnviar = () => {
    if (!user) {
      toast.error("Faça login para enviar a proposta");
      return;
    }
    if (!validate()) {
      toast.error("Verifique os campos obrigatórios");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const [rgFrenteUrl, rgVersoUrl, extratoUrl] = await Promise.all([
        uploadFile(rgFrente!, "rg-frente"),
        uploadFile(rgVerso!, "rg-verso"),
        extrato ? uploadFile(extrato, "extrato") : Promise.resolve<string | null>(null),
      ]);

      const isPort = produto === "portabilidade";
      const calcNovo = calcularTroco({ parcela: parcela!, prazo });
      const calcPort = isPort
        ? calcularPortabilidade({ parcela: parcela!, prazo, saldoDevedor: saldoDevedor || 0 })
        : null;
      const trocoFinal = isPort ? calcPort!.valorLiberado : calcNovo.troco;
      const valorBrutoFinal = isPort ? calcPort!.novoValorFinanciado : calcNovo.valorBruto;

      const banco =
        produto === "novo_emprestimo"
          ? "Agibank Easyn"
          : isPort
          ? bancoOriginador.trim()
          : "Agibank Easyn";

      const tipoOperacaoMap: Record<string, string> = {
        novo_emprestimo: "novo",
        refinanciamento: "refinanciamento",
        portabilidade: "portabilidade",
      };

      const observacao = isPort
        ? `Portabilidade — Banco originador: ${bancoOriginador}; Prazo total: ${prazoTotal}x; Parcelas em aberto: ${parcelasAberto}; Saldo devedor: ${formatBRL(
            saldoDevedor || 0
          )}; Fator ${prazo}x: ${calcPort!.fator.toFixed(6)}`
        : `Origem: Digitação Agibank — ${produto}`;

      // 1) Insert na tabela própria do módulo
      const { error: errDig } = await supabase
        .from("digitacao_agibank_propostas" as any)
        .insert({
          user_id: user!.id,
          cpf: cpf.replace(/\D/g, ""),
          nome_cliente: nome.trim(),
          telefone: telefone.replace(/\D/g, ""),
          produto,
          banco,
          parcela,
          prazo,
          troco_calculado: trocoFinal,
          valor_bruto: valorBrutoFinal,
          iof_estimado: isPort ? 0 : calcNovo.iofEstimado,
          rg_frente_url: rgFrenteUrl,
          rg_verso_url: rgVersoUrl,
          extrato_url: extratoUrl,
        });
      if (errDig) throw errDig;

      // 2) Buscar company_id do usuário (para isolamento multi-tenant)
      const { data: uc } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      // 3) Enviar proposta para Gestão de Televendas
      const today = new Date().toISOString().slice(0, 10);
      const { error: errTel } = await supabase.from("televendas").insert({
        user_id: user!.id,
        company_id: uc?.company_id ?? null,
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, ""),
        telefone: telefone.replace(/\D/g, ""),
        data_venda: today,
        banco,
        parcela: parcela!,
        troco: trocoFinal,
        saldo_devedor: isPort ? saldoDevedor || 0 : null,
        tipo_operacao: tipoOperacaoMap[produto!],
        observacao,
        modulo_origem: "digitacao_agibank",
        status: "pendente",
        status_proposta: "digitada",
        status_bancario: "aguardando_digitacao",
      } as any);
      if (errTel) throw errTel;

      toast.success("Proposta enviada para Gestão de Televendas!");
      // Reset form
      setCpf("");
      setNome("");
      setTelefone("");
      setProduto(null);
      setParcela(undefined);
      setPrazo(108);
      setRgFrente(null);
      setRgVerso(null);
      setExtrato(null);
      setBancoOriginador("");
      setPrazoTotal(undefined);
      setParcelasAberto(undefined);
      setSaldoDevedor(undefined);
      setErrors({});
      goHome();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar proposta: " + (err.message || "tente novamente"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Keyboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Digitação Agibank</h1>
            <p className="text-sm text-muted-foreground">Empréstimos Consignado</p>
          </div>
        </div>
      </header>

      {view === "home" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={goSimular}
            className="text-left rounded-xl border bg-card p-6 hover:shadow-md hover:border-blue-400 transition-all group"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Calculator className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Simular</h2>
            <p className="text-sm text-muted-foreground">
              Calcule parcelas, prazo e troco antes de digitar
            </p>
          </button>
          <button
            type="button"
            onClick={goDigitar}
            className="text-left rounded-xl border bg-card p-6 hover:shadow-md hover:border-emerald-400 transition-all group"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Pencil className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Digitar</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre uma proposta de novo contrato, refinanciamento ou portabilidade
            </p>
          </button>
        </div>
      )}

      {view === "simular" && (
        <div>
          <StepIndicator step={1} />
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold">Simular contrato novo</h2>

            <div className="space-y-2">
              <Label>Valor da parcela desejada (R$)</Label>
              <CurrencyInput value={simParcela} onChange={setSimParcela} placeholder="0,00" />
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
              <div className="flex gap-2">
                {PRAZOS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSimPrazo(p)}
                    className={cn(
                      "px-5 h-10 rounded-full border text-sm font-medium transition-colors",
                      simPrazo === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-secondary"
                    )}
                  >
                    {p}x
                  </button>
                ))}
              </div>
            </div>

            <TrocoBox variant="blue" parcela={simParcela || 0} prazo={simPrazo} />

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="ghost" onClick={goHome}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={handleDigitarFromSim}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!simParcela || simParcela <= 0}
              >
                <Pencil className="h-4 w-4" /> Digitar essa proposta
              </Button>
            </div>
          </div>
        </div>
      )}

      {view === "digitar" && (
        <div>
          <StepIndicator step={2} />

          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 mb-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Atenção:</strong> O benefício do cliente precisa estar desbloqueado para que a proposta seja processada. Verifique antes de continuar.
            </p>
          </div>

          {/* Section 1 — Dados do cliente */}
          <section className="rounded-xl border bg-card p-5 mb-4">
            <h3 className="text-base font-semibold mb-4">Dados do cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
                {errors.cpf && <p className="text-xs text-red-600">{errors.cpf}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cliente"
                />
                {errors.nome && <p className="text-xs text-red-600">{errors.nome}</p>}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Telefone</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
                {errors.telefone && <p className="text-xs text-red-600">{errors.telefone}</p>}
              </div>
            </div>
          </section>

          {/* Section 2 — Produto */}
          <section className="rounded-xl border bg-card p-5 mb-4">
            <h3 className="text-base font-semibold mb-4">Qual produto o cliente quer?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {([
                { id: "novo_emprestimo", label: "Novo empréstimo", icon: Plus },
                { id: "refinanciamento", label: "Refinanciamento", icon: RefreshCw },
                { id: "portabilidade", label: "Portabilidade", icon: ArrowRightLeft },
              ] as const).map((p) => {
                const I = p.icon;
                const active = produto === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProduto(p.id)}
                    className={cn(
                      "h-12 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-secondary"
                    )}
                  >
                    <I className="h-4 w-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            {errors.produto && <p className="text-xs text-red-600 mb-2">{errors.produto}</p>}

            {produto === "novo_emprestimo" && (
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200 px-3 py-1 text-xs font-medium mb-4">
                <Building2 className="h-3.5 w-3.5" />
                Banco: Agibank Easyn
              </div>
            )}

            {produto === "portabilidade" && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-900 p-4 mb-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Dados do contrato a portar
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Banco originador</Label>
                    <Input
                      value={bancoOriginador}
                      onChange={(e) => setBancoOriginador(e.target.value)}
                      placeholder="Ex.: Banco do Brasil, Itaú..."
                    />
                    {errors.bancoOriginador && (
                      <p className="text-xs text-red-600">{errors.bancoOriginador}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prazo total do contrato (meses)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={prazoTotal ?? ""}
                      onChange={(e) =>
                        setPrazoTotal(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Ex.: 96"
                    />
                    {errors.prazoTotal && (
                      <p className="text-xs text-red-600">{errors.prazoTotal}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parcelas em aberto</Label>
                    <Input
                      type="number"
                      min={1}
                      value={parcelasAberto ?? ""}
                      onChange={(e) =>
                        setParcelasAberto(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Ex.: 72"
                    />
                    {errors.parcelasAberto && (
                      <p className="text-xs text-red-600">{errors.parcelasAberto}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Saldo devedor (R$)</Label>
                    <CurrencyInput
                      value={saldoDevedor}
                      onChange={setSaldoDevedor}
                      placeholder="0,00"
                    />
                    {errors.saldoDevedor && (
                      <p className="text-xs text-red-600">{errors.saldoDevedor}</p>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-purple-800/80 dark:text-purple-200/80">
                  Cálculo: parcela ÷ fator coeficiente (taxa 1,65% a.m.) − saldo devedor.
                  Fatores: 108x = {FATOR_COEFICIENTE_PORTABILIDADE[108]} | 96x ={" "}
                  {FATOR_COEFICIENTE_PORTABILIDADE[96]} | 84x ={" "}
                  {FATOR_COEFICIENTE_PORTABILIDADE[84]}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1.5">
                <Label>Valor da parcela (R$)</Label>
                <CurrencyInput value={parcela} onChange={setParcela} placeholder="0,00" />
                {errors.parcela && <p className="text-xs text-red-600">{errors.parcela}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Prazo (novo contrato)</Label>
                <Select
                  value={String(prazo)}
                  onValueChange={(v) => setPrazo(Number(v) as Prazo)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRAZOS.map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <TrocoBox
                variant="green"
                parcela={parcela || 0}
                prazo={prazo}
                modo={produto === "portabilidade" ? "portabilidade" : "novo"}
                saldoDevedor={saldoDevedor || 0}
              />
            </div>
          </section>

          {/* Section 3 — Documentação */}
          <section className="rounded-xl border bg-card p-5 mb-4">
            <h3 className="text-base font-semibold mb-4">Documentação do cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UploadZone
                label="RG — frente"
                required
                file={rgFrente}
                onFile={setRgFrente}
                onClear={() => setRgFrente(null)}
                icon={IdCard}
                error={errors.rgFrente}
              />
              <UploadZone
                label="RG — verso"
                required
                file={rgVerso}
                onFile={setRgVerso}
                onClear={() => setRgVerso(null)}
                icon={IdCard}
                error={errors.rgVerso}
              />
              <UploadZone
                label="Extrato bancário"
                required={false}
                file={extrato}
                onFile={setExtrato}
                onClear={() => setExtrato(null)}
                icon={FileText}
              />
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={goHome} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleClickEnviar} isLoading={submitting} loadingText="Enviando...">
              <Send className="h-4 w-4" /> Enviar proposta
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <AlertDialogTitle>Atenção antes de enviar</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-semibold text-foreground">
                O benefício do cliente precisa estar desbloqueado.
              </span>
              <span className="block">
                Se o benefício estiver bloqueado, a proposta não poderá ser processada pelo banco.
                Confirme com o cliente antes de prosseguir.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirmar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
