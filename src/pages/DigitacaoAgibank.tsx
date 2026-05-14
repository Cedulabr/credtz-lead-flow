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
}: {
  variant: "blue" | "green";
  parcela: number;
  prazo: number;
}) {
  const result = useMemo(() => calcularTroco({ parcela, prazo }), [parcela, prazo]);
  const colors =
    variant === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-100"
      : "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-100";
  const sub =
    variant === "blue"
      ? "text-blue-700/80 dark:text-blue-300/80"
      : "text-emerald-700/80 dark:text-emerald-300/80";
  return (
    <div className={cn("rounded-xl border p-4", colors)}>
      <p className="text-xs font-medium mb-1">
        {variant === "blue"
          ? "Troco líquido estimado (taxa 1,85% a.m. — já deduzido IOF)"
          : "Troco líquido (taxa 1,85% — IOF deduzido)"}
      </p>
      <p className="text-3xl font-bold tracking-tight">
        {formatBRL(result.troco)}
      </p>
      <p className={cn("text-xs mt-1", sub)}>
        Crédito bruto: {formatBRL(result.valorBruto)} | IOF estimado: {formatBRL(result.iofEstimado)}
      </p>
    </div>
  );
}

export default function DigitacaoAgibank() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("home");

  // Simular state
  const [simParcela, setSimParcela] = useState<number | undefined>(undefined);
  const [simPrazo, setSimPrazo] = useState<Prazo>(84);

  // Digitar state
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [produto, setProduto] = useState<Produto | null>(null);
  const [parcela, setParcela] = useState<number | undefined>(undefined);
  const [prazo, setPrazo] = useState<Prazo>(84);
  const [rgFrente, setRgFrente] = useState<File | null>(null);
  const [rgVerso, setRgVerso] = useState<File | null>(null);
  const [extrato, setExtrato] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Faça login para enviar a proposta");
      return;
    }
    if (!validate()) {
      toast.error("Verifique os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const [rgFrenteUrl, rgVersoUrl, extratoUrl] = await Promise.all([
        uploadFile(rgFrente!, "rg-frente"),
        uploadFile(rgVerso!, "rg-verso"),
        extrato ? uploadFile(extrato, "extrato") : Promise.resolve<string | null>(null),
      ]);

      const calc = calcularTroco({ parcela: parcela!, prazo });

      const { error } = await supabase
        .from("digitacao_agibank_propostas" as any)
        .insert({
          user_id: user.id,
          cpf: cpf.replace(/\D/g, ""),
          nome_cliente: nome.trim(),
          telefone: telefone.replace(/\D/g, ""),
          produto,
          banco: produto === "novo_emprestimo" ? "Agibank Easyn" : null,
          parcela,
          prazo,
          troco_calculado: calc.troco,
          valor_bruto: calc.valorBruto,
          iof_estimado: calc.iofEstimado,
          rg_frente_url: rgFrenteUrl,
          rg_verso_url: rgVersoUrl,
          extrato_url: extratoUrl,
        });

      if (error) throw error;

      toast.success("Proposta enviada com sucesso! Aguarde análise.");
      // Reset form
      setCpf("");
      setNome("");
      setTelefone("");
      setProduto(null);
      setParcela(undefined);
      setPrazo(84);
      setRgFrente(null);
      setRgVerso(null);
      setExtrato(null);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1.5">
                <Label>Valor da parcela (R$)</Label>
                <CurrencyInput value={parcela} onChange={setParcela} placeholder="0,00" />
                {errors.parcela && <p className="text-xs text-red-600">{errors.parcela}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Prazo</Label>
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
              <TrocoBox variant="green" parcela={parcela || 0} prazo={prazo} />
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
            <Button onClick={handleSubmit} isLoading={submitting} loadingText="Enviando...">
              <Send className="h-4 w-4" /> Enviar proposta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
