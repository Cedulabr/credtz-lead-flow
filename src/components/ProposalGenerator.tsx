import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  FileText, 
  User, 
  Phone, 
  CreditCard, 
  Building2, 
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

interface Contract {
  id: string;
  product: string;
  bank: string;
  parcela: string;
  troco: string;
  isComplete: boolean;
}

interface ProposalData {
  clientName: string;
  clientPhone: string;
  contracts: Contract[];
}

const PRODUCTS = [
  { id: "novo", label: "Novo", emoji: "🆕", color: "bg-emerald-500" },
  { id: "portabilidade", label: "Portabilidade", emoji: "🔄", color: "bg-blue-500" },
  { id: "refinanciamento", label: "Refinanciamento", emoji: "💰", color: "bg-amber-500" },
  { id: "cartao", label: "Cartão", emoji: "💳", color: "bg-purple-500" },
];

const formatCurrency = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseInt(numbers || "0", 10) / 100;
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const parseCurrency = (value: string): number => {
  const numbers = value.replace(/\D/g, "");
  return parseInt(numbers || "0", 10) / 100;
};

export function ProposalGenerator() {
  const [step, setStep] = useState<"client-name" | "client-phone" | "contracts" | "summary">("client-name");
  const [proposalData, setProposalData] = useState<ProposalData>({
    clientName: "",
    clientPhone: "",
    contracts: [],
  });
  const [currentContractIndex, setCurrentContractIndex] = useState<number | null>(null);
  const [currentContractStep, setCurrentContractStep] = useState<"product" | "bank" | "parcela" | "troco" | "complete">("product");
  const [banks, setBanks] = useState<string[]>([]);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [bankInput, setBankInput] = useState("");
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const bankInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const query = supabase.from("televendas_banks").select("name");
        const result = await (query as any).eq("active", true);
        if (result.data && Array.isArray(result.data)) {
          const bankNames: string[] = [];
          for (const item of result.data) {
            if (item && typeof item === 'object' && 'name' in item && item.name) {
              bankNames.push(String(item.name));
            }
          }
          setBanks(bankNames);
        }
      } catch {
        setBanks(["Banrisul", "BMG", "Bradesco", "C6 Bank", "Caixa", "Daycoval", "Facta", "Itaú", "Master", "Pan", "Safra", "Santander"]);
      }
    };
    fetchBanks();
  }, []);

  const filteredBanks = banks.filter(bank => 
    bank.toLowerCase().includes(bankInput.toLowerCase())
  );

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleClientNameSubmit = () => {
    if (proposalData.clientName.trim().length < 3) {
      toast.error("Digite um nome válido");
      return;
    }
    setStep("client-phone");
  };

  const handleClientPhoneSubmit = () => {
    const phoneNumbers = proposalData.clientPhone.replace(/\D/g, "");
    if (phoneNumbers.length < 10) {
      toast.error("Digite um telefone válido");
      return;
    }
    setStep("contracts");
    addNewContract();
  };

  const addNewContract = () => {
    if (proposalData.contracts.length >= 13) {
      toast.error("Limite máximo de 13 contratos atingido");
      return;
    }

    const newContract: Contract = {
      id: crypto.randomUUID(),
      product: "",
      bank: "",
      parcela: "",
      troco: "",
      isComplete: false,
    };

    setProposalData((prev) => ({
      ...prev,
      contracts: [...prev.contracts, newContract],
    }));
    setCurrentContractIndex(proposalData.contracts.length);
    setCurrentContractStep("product");
    setBankInput("");
  };

  const updateCurrentContract = (field: keyof Contract, value: string) => {
    if (currentContractIndex === null) return;

    setProposalData((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c, i) =>
        i === currentContractIndex ? { ...c, [field]: value } : c
      ),
    }));
  };

  const handleProductSelect = (product: string) => {
    updateCurrentContract("product", product);
    setCurrentContractStep("bank");
    setBankInput("");
    setTimeout(() => bankInputRef.current?.focus(), 100);
  };

  const handleBankSelect = (bank: string) => {
    updateCurrentContract("bank", bank);
    setBankInput(bank);
    setShowBankSuggestions(false);
    setCurrentContractStep("parcela");
  };

  const handleBankSubmit = () => {
    if (bankInput.trim().length < 2) {
      toast.error("Digite um banco válido");
      return;
    }
    updateCurrentContract("bank", bankInput.trim());
    setShowBankSuggestions(false);
    setCurrentContractStep("parcela");
  };

  const handleParcelaSubmit = () => {
    if (currentContractIndex === null) return;
    const contract = proposalData.contracts[currentContractIndex];
    if (parseCurrency(contract.parcela) <= 0) {
      toast.error("Digite um valor de parcela válido");
      return;
    }
    setCurrentContractStep("troco");
  };

  const handleTrocoSubmit = () => {
    if (currentContractIndex === null) return;
    
    setProposalData((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c, i) =>
        i === currentContractIndex ? { ...c, isComplete: true } : c
      ),
    }));
    setCurrentContractStep("complete");
    setCurrentContractIndex(null);
    toast.success("Contrato adicionado com sucesso!");
  };

  const removeContract = (contractId: string) => {
    setProposalData((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== contractId),
    }));
    if (proposalData.contracts.length === 1) {
      setCurrentContractIndex(null);
      setCurrentContractStep("product");
    }
  };

  const toggleContractExpand = (contractId: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return next;
    });
  };

  const getProductInfo = (productId: string) => {
    return PRODUCTS.find((p) => p.id === productId);
  };

  const canGenerateProposal = () => {
    return (
      proposalData.clientName.trim().length >= 3 &&
      proposalData.clientPhone.replace(/\D/g, "").length >= 10 &&
      proposalData.contracts.some((c) => c.isComplete)
    );
  };

  const getCompletedContracts = () => {
    return proposalData.contracts.filter((c) => c.isComplete);
  };

  const calculateTotalTroco = () => {
    return getCompletedContracts().reduce((sum, c) => sum + parseCurrency(c.troco), 0);
  };

  const calculateTotalParcela = () => {
    return getCompletedContracts().reduce((sum, c) => sum + parseCurrency(c.parcela), 0);
  };

  const generateProposalText = () => {
    const completedContracts = getCompletedContracts();
    const totalTroco = calculateTotalTroco();
    const totalParcela = calculateTotalParcela();
    
    let text = `✨ *PROPOSTA COMERCIAL* ✨\n\n`;
    text += `👤 *Cliente:* ${proposalData.clientName}\n`;
    text += `📱 *Telefone:* ${proposalData.clientPhone}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📝 *CONTRATOS (${completedContracts.length})*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    completedContracts.forEach((c, i) => {
      const productInfo = getProductInfo(c.product);
      text += `${productInfo?.emoji || "📄"} *${i + 1}. ${productInfo?.label || c.product}*\n`;
      text += `   🏦 Banco: ${c.bank}\n`;
      text += `   💵 Parcela: ${c.parcela}\n`;
      if (c.troco && parseCurrency(c.troco) > 0) {
        text += `   💰 Troco: ${c.troco}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *RESUMO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 Total de Contratos: ${completedContracts.length}\n`;
    text += `💵 Parcela Total: ${formatCurrency(String(totalParcela * 100))}\n`;
    if (totalTroco > 0) {
      text += `💰 Troco Total Estimado: ${formatCurrency(String(totalTroco * 100))}\n`;
    }
    text += `\n📅 Data: ${new Date().toLocaleDateString("pt-BR")}\n`;
    text += `\n✅ *Proposta sujeita à análise de crédito*`;

    return text;
  };

  const generateProposal = async () => {
    if (!canGenerateProposal()) {
      toast.error("Complete pelo menos um contrato para gerar a proposta");
      return;
    }

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsGenerating(false);
    setStep("summary");
  };

  const copyToClipboard = async () => {
    const text = generateProposalText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Proposta copiada para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  const generatePDF = () => {
    const completedContracts = getCompletedContracts();
    const totalTroco = calculateTotalTroco();
    const totalParcela = calculateTotalParcela();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSTA COMERCIAL", pageWidth / 2, 25, { align: "center" });
    
    y = 55;
    doc.setTextColor(0, 0, 0);

    // Client info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${proposalData.clientName}`, 20, y);
    y += 7;
    doc.text(`Telefone: ${proposalData.clientPhone}`, 20, y);
    y += 15;

    // Contracts
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`CONTRATOS (${completedContracts.length})`, 20, y);
    y += 10;

    completedContracts.forEach((c, i) => {
      const productInfo = getProductInfo(c.product);
      
      // Contract card background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, y - 5, pageWidth - 30, 35, 3, 3, "F");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text(`${i + 1}. ${productInfo?.label || c.product}`, 20, y + 5);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Banco: ${c.bank}`, 25, y + 13);
      doc.text(`Parcela: ${c.parcela}`, 25, y + 20);
      if (c.troco && parseCurrency(c.troco) > 0) {
        doc.text(`Troco Estimado: ${c.troco}`, 25, y + 27);
      }

      y += 40;

      // Add new page if needed
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    y += 10;

    // Summary
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(15, y - 5, pageWidth - 30, 45, 3, 3, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DA PROPOSTA", 20, y + 5);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Contratos: ${completedContracts.length}`, 20, y + 15);
    doc.text(`Parcela Total: ${formatCurrency(String(totalParcela * 100))}`, 20, y + 23);
    if (totalTroco > 0) {
      doc.text(`Troco Total Estimado: ${formatCurrency(String(totalTroco * 100))}`, 20, y + 31);
    }

    y += 55;

    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(9);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, y);
    doc.text("Proposta sujeita à análise de crédito", 20, y + 7);

    // Save
    doc.save(`proposta_${proposalData.clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const resetGenerator = () => {
    setProposalData({
      clientName: "",
      clientPhone: "",
      contracts: [],
    });
    setStep("client-name");
    setCurrentContractIndex(null);
    setCurrentContractStep("product");
    setExpandedContracts(new Set());
    setBankInput("");
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "client-name", label: "Nome", completed: proposalData.clientName.length >= 3 },
      { id: "client-phone", label: "Telefone", completed: proposalData.clientPhone.replace(/\D/g, "").length >= 10 },
      { id: "contracts", label: "Contratos", completed: proposalData.contracts.some((c) => c.isComplete) },
      { id: "summary", label: "Resumo", completed: step === "summary" },
    ];

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                s.completed
                  ? "bg-primary text-primary-foreground"
                  : step === s.id
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s.completed ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1 transition-colors",
                  s.completed ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderClientNameStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Qual o nome do cliente?</h2>
        <p className="text-muted-foreground">Digite o nome completo do cliente para a proposta</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Input
          placeholder="Ex: João da Silva"
          value={proposalData.clientName}
          onChange={(e) =>
            setProposalData((prev) => ({ ...prev, clientName: e.target.value }))
          }
          onKeyDown={(e) => e.key === "Enter" && handleClientNameSubmit()}
          className="h-14 text-lg text-center"
          autoFocus
        />
        <Button
          onClick={handleClientNameSubmit}
          className="w-full h-12"
          disabled={proposalData.clientName.trim().length < 3}
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderClientPhoneStep = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Telefone do cliente</h2>
        <p className="text-muted-foreground">
          Olá <span className="font-medium text-foreground">{proposalData.clientName}</span>! Qual o telefone?
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <Input
          placeholder="(00) 00000-0000"
          value={proposalData.clientPhone}
          onChange={(e) =>
            setProposalData((prev) => ({
              ...prev,
              clientPhone: formatPhone(e.target.value),
            }))
          }
          onKeyDown={(e) => e.key === "Enter" && handleClientPhoneSubmit()}
          className="h-14 text-lg text-center"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("client-name")}
            className="flex-1 h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={handleClientPhoneSubmit}
            className="flex-1 h-12"
            disabled={proposalData.clientPhone.replace(/\D/g, "").length < 10}
          >
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSummaryStep = () => {
    const completedContracts = getCompletedContracts();
    const totalTroco = calculateTotalTroco();
    const totalParcela = calculateTotalParcela();
    const proposalText = generateProposalText();

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Proposta Gerada!</h2>
          <p className="text-muted-foreground">
            {completedContracts.length} contrato(s) para {proposalData.clientName}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="max-w-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{completedContracts.length}</p>
              <p className="text-xs text-muted-foreground">Contratos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-foreground">{formatCurrency(String(totalParcela * 100))}</p>
              <p className="text-xs text-muted-foreground">Parcela Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-emerald-500">{formatCurrency(String(totalTroco * 100))}</p>
              <p className="text-xs text-muted-foreground">Troco Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm font-bold text-foreground">{new Date().toLocaleDateString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Data</p>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <div className="max-w-2xl mx-auto space-y-2">
          {completedContracts.map((contract, i) => {
            const productInfo = getProductInfo(contract.product);
            return (
              <Card key={contract.id} className="border-l-4" style={{ borderLeftColor: productInfo?.color.replace("bg-", "#").replace("emerald-500", "10b981").replace("blue-500", "3b82f6").replace("amber-500", "f59e0b").replace("purple-500", "a855f7") }}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{productInfo?.emoji}</span>
                    <div>
                      <p className="font-medium text-sm">{productInfo?.label} - {contract.bank}</p>
                      <p className="text-xs text-muted-foreground">Parcela: {contract.parcela}</p>
                    </div>
                  </div>
                  {contract.troco && parseCurrency(contract.troco) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Troco: {contract.troco}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Copy Text Area */}
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">📋 Texto para enviar ao cliente:</p>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
          <Textarea
            value={proposalText}
            readOnly
            className="min-h-[200px] font-mono text-sm bg-muted/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          <Button onClick={copyToClipboard} className="flex-1 h-12">
            <Copy className="w-4 h-4 mr-2" />
            Copiar Proposta
          </Button>
          <Button onClick={generatePDF} variant="secondary" className="flex-1 h-12">
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button onClick={resetGenerator} variant="outline" className="flex-1 h-12">
            <RefreshCw className="w-4 h-4 mr-2" />
            Nova Proposta
          </Button>
        </div>
      </div>
    );
  };

  const renderContractStep = () => {
    if (currentContractIndex === null) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Proposta para {proposalData.clientName}
            </h2>
            <p className="text-muted-foreground">
              {proposalData.contracts.filter((c) => c.isComplete).length} contrato(s) adicionado(s)
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {proposalData.contracts
              .filter((c) => c.isComplete)
              .map((contract) => {
                const productInfo = getProductInfo(contract.product);
                const isExpanded = expandedContracts.has(contract.id);

                return (
                  <Card
                    key={contract.id}
                    className="border-l-4 overflow-hidden transition-all"
                    style={{ borderLeftColor: productInfo?.color.replace("bg-", "#").replace("emerald-500", "10b981").replace("blue-500", "3b82f6").replace("amber-500", "f59e0b").replace("purple-500", "a855f7") }}
                  >
                    <CardContent className="p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleContractExpand(contract.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={cn("text-white", productInfo?.color)}>
                            {productInfo?.label}
                          </Badge>
                          <span className="font-medium">{contract.bank}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {contract.parcela}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-4 mt-4 border-t space-y-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parcela:</span>
                            <span className="font-medium">{contract.parcela}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Troco Estimado:</span>
                            <span className="font-medium">
                              {contract.troco || "Não informado"}
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeContract(contract.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover Contrato
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

            {proposalData.contracts.filter((c) => c.isComplete).length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum contrato adicionado ainda</p>
                  <p className="text-sm">Clique no botão abaixo para adicionar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }

    const contract = proposalData.contracts[currentContractIndex];

    if (currentContractStep === "product") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Contrato #{proposalData.contracts.length}
            </h2>
            <p className="text-muted-foreground">Qual o tipo de produto?</p>
          </div>

          <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
            {PRODUCTS.map((product) => (
              <Button
                key={product.id}
                variant="outline"
                className={cn(
                  "h-20 flex-col gap-2 text-lg font-medium transition-all hover:scale-105",
                  contract.product === product.id && "ring-2 ring-primary"
                )}
                onClick={() => handleProductSelect(product.id)}
              >
                <span className="text-2xl">{product.emoji}</span>
                {product.label}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    if (currentContractStep === "bank") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Qual o banco?</h2>
            <p className="text-muted-foreground">
              Produto: <Badge className={cn("text-white ml-1", getProductInfo(contract.product)?.color)}>
                {getProductInfo(contract.product)?.label}
              </Badge>
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="relative">
              <Input
                ref={bankInputRef}
                placeholder="Digite ou selecione o banco"
                value={bankInput}
                onChange={(e) => {
                  setBankInput(e.target.value);
                  setShowBankSuggestions(true);
                }}
                onFocus={() => setShowBankSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleBankSubmit();
                  } else if (e.key === "Escape") {
                    setShowBankSuggestions(false);
                  }
                }}
                className="h-14 text-lg"
                autoFocus
              />
              
              {showBankSuggestions && filteredBanks.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg text-foreground"
                      onClick={() => handleBankSelect(bank)}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentContractStep("product");
                  setBankInput("");
                  setShowBankSuggestions(false);
                }}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleBankSubmit}
                className="flex-1 h-12"
                disabled={bankInput.trim().length < 2}
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (currentContractStep === "parcela") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Valor da Parcela</h2>
            <p className="text-muted-foreground">
              {getProductInfo(contract.product)?.label} • {contract.bank}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <Input
              placeholder="R$ 0,00"
              value={contract.parcela}
              onChange={(e) =>
                updateCurrentContract("parcela", formatCurrency(e.target.value))
              }
              onKeyDown={(e) => e.key === "Enter" && handleParcelaSubmit()}
              className="h-14 text-lg text-center"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentContractStep("bank")}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleParcelaSubmit}
                className="flex-1 h-12"
                disabled={parseCurrency(contract.parcela) <= 0}
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (currentContractStep === "troco") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Troco Estimado</h2>
            <p className="text-muted-foreground">
              Parcela: {contract.parcela}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <Input
              placeholder="R$ 0,00 (opcional)"
              value={contract.troco}
              onChange={(e) =>
                updateCurrentContract("troco", formatCurrency(e.target.value))
              }
              onKeyDown={(e) => e.key === "Enter" && handleTrocoSubmit()}
              className="h-14 text-lg text-center"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentContractStep("parcela")}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleTrocoSubmit} className="flex-1 h-12">
                <Check className="w-4 h-4 mr-2" />
                Finalizar Contrato
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Gerador de Propostas</h1>
                <p className="text-sm text-muted-foreground">Crie propostas de forma rápida</p>
              </div>
            </div>
            {(step === "contracts" || step === "summary") && proposalData.contracts.some((c) => c.isComplete) && (
              <Button variant="ghost" size="sm" onClick={resetGenerator}>
                Nova Proposta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="container max-w-4xl mx-auto px-4 pt-8">
        {renderStepIndicator()}
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {step === "client-name" && renderClientNameStep()}
        {step === "client-phone" && renderClientPhoneStep()}
        {step === "contracts" && renderContractStep()}
        {step === "summary" && renderSummaryStep()}
      </div>

      {/* Fixed Bottom Actions */}
      {step === "contracts" && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 md:pb-4 pb-20">
          <div className="container max-w-4xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={addNewContract}
              disabled={currentContractIndex !== null || proposalData.contracts.length >= 13}
              className="flex-1 h-12"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Contrato
              {proposalData.contracts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {proposalData.contracts.filter((c) => c.isComplete).length}/13
                </Badge>
              )}
            </Button>
            <Button
              onClick={generateProposal}
              disabled={!canGenerateProposal() || isGenerating}
              className="flex-1 h-12"
            >
              {isGenerating ? (
                <>Gerando...</>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Proposta
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
