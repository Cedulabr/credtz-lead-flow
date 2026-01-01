import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw,
  History,
  Edit,
  Clock,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { useAuth } from "@/contexts/AuthContext";

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

interface SavedProposal {
  id: string;
  client_name: string;
  client_phone: string;
  contracts: Contract[];
  created_at: string;
  updated_at: string;
  user_name?: string;
}

const PRODUCTS = [
  { id: "novo", label: "Novo", emoji: "🆕", color: "bg-emerald-500", footer: "💵 O valor do Novo Empréstimo creditado em até 24 horas" },
  { id: "portabilidade", label: "Portabilidade", emoji: "🔄", color: "bg-blue-500", footer: "📅 O Valor da Portabilidade creditado em até 8 dias" },
  { id: "refinanciamento", label: "Refinanciamento", emoji: "💰", color: "bg-amber-500", footer: "💵 O Valor do Refinanciamento creditado em até 24 horas" },
  { id: "cartao", label: "Cartão", emoji: "💳", color: "bg-purple-500", footer: "💵 O Valor do Cartão de Crédito creditado em até 24 horas" },
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"generator" | "saved">("generator");
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
  
  // Saved proposals state
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (user && activeTab === "saved") {
      fetchSavedProposals();
    }
  }, [user, activeTab]);

  const fetchSavedProposals = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("saved_proposals")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch user profiles to get names
      const userIds = [...new Set((data || []).map((item: any) => item.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
      
      const proposals: SavedProposal[] = (data || []).map((item: any) => ({
        id: item.id,
        client_name: item.client_name,
        client_phone: item.client_phone,
        contracts: Array.isArray(item.contracts) ? item.contracts : [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_name: profileMap.get(item.user_id) || "Usuário",
      }));
      
      setSavedProposals(proposals);
    } catch (error) {
      console.error("Error fetching saved proposals:", error);
      toast.error("Erro ao carregar propostas salvas");
    } finally {
      setLoadingSaved(false);
    }
  };

  const saveProposal = async () => {
    if (!user) {
      toast.error("Faça login para salvar propostas");
      return;
    }

    setIsSaving(true);
    try {
      const contractsData = proposalData.contracts.filter(c => c.isComplete) as unknown as any;
      
      const proposalPayload = {
        user_id: user.id,
        client_name: proposalData.clientName,
        client_phone: proposalData.clientPhone,
        contracts: contractsData,
      };

      if (editingProposalId) {
        const { error } = await supabase
          .from("saved_proposals")
          .update(proposalPayload)
          .eq("id", editingProposalId);
        
        if (error) throw error;
        toast.success("Proposta atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("saved_proposals")
          .insert([proposalPayload]);
        
        if (error) throw error;
        toast.success("Proposta salva com sucesso!");
      }
      
      fetchSavedProposals();
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast.error("Erro ao salvar proposta");
    } finally {
      setIsSaving(false);
    }
  };

  const loadProposalForEdit = (proposal: SavedProposal) => {
    setProposalData({
      clientName: proposal.client_name,
      clientPhone: proposal.client_phone,
      contracts: proposal.contracts,
    });
    setEditingProposalId(proposal.id);
    setStep("contracts");
    setCurrentContractIndex(null);
    setActiveTab("generator");
    toast.success("Proposta carregada para edição");
  };

  const deleteProposal = async (proposalId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("saved_proposals")
        .delete()
        .eq("id", proposalId);
      
      if (error) throw error;
      toast.success("Proposta excluída");
      fetchSavedProposals();
    } catch (error) {
      console.error("Error deleting proposal:", error);
      toast.error("Erro ao excluir proposta");
    }
  };

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
    if (proposalData.contracts.length === 0) {
      addNewContract();
    }
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

  const getUniqueProductFooters = () => {
    const completedContracts = getCompletedContracts();
    const uniqueProducts = new Set(completedContracts.map(c => c.product));
    return Array.from(uniqueProducts).map(productId => getProductInfo(productId)?.footer).filter(Boolean);
  };

  const generateProposalText = () => {
    const completedContracts = getCompletedContracts();
    const totalTroco = calculateTotalTroco();
    const totalParcela = calculateTotalParcela();
    const footers = getUniqueProductFooters();
    
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
    
    // Add product-specific footers
    if (footers.length > 0) {
      text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `ℹ️ *INFORMAÇÕES*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      footers.forEach(footer => {
        text += `${footer}\n`;
      });
    }
    
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
    const footers = getUniqueProductFooters();

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

    // Product-specific footers
    if (footers.length > 0) {
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMAÇÕES IMPORTANTES:", 20, y);
      y += 7;
      
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      footers.forEach(footer => {
        doc.text(`• ${footer?.replace(/[💵📅]/g, '')}`, 20, y);
        y += 6;
      });
      y += 5;
    }

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
    setEditingProposalId(null);
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
    const footers = getUniqueProductFooters();

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

        {/* Product-specific footers */}
        {footers.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground mb-2">ℹ️ Informações importantes:</p>
                <div className="space-y-1">
                  {footers.map((footer, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{footer}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
          {user && (
            <Button onClick={saveProposal} variant="outline" className="flex-1 h-12" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Salvando..." : editingProposalId ? "Atualizar" : "Salvar"}
            </Button>
          )}
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
            {editingProposalId && (
              <Badge variant="secondary" className="mt-2">
                <Edit className="w-3 h-3 mr-1" />
                Editando proposta existente
              </Badge>
            )}
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
                          {productInfo?.footer && (
                            <div className="pt-2 mt-2 border-t">
                              <p className="text-xs text-primary">{productInfo.footer}</p>
                            </div>
                          )}
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
                  "h-24 flex-col gap-2 text-lg font-medium transition-all hover:scale-105",
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
      const currentProduct = getProductInfo(contract.product);
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Qual o banco?</h2>
            <p className="text-muted-foreground">
              Produto: <Badge className={cn("text-white ml-1", currentProduct?.color)}>
                {currentProduct?.label}
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

            {/* Product footer info */}
            {currentProduct?.footer && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary">{currentProduct.footer}</p>
              </div>
            )}

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

  const renderSavedProposals = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Propostas Salvas</h2>
        <p className="text-muted-foreground">Clique em uma proposta para editar</p>
      </div>

      {!user && (
        <div className="max-w-2xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Faça login para ver suas propostas salvas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {user && loadingSaved && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p>Carregando propostas...</p>
            </CardContent>
          </Card>
        </div>
      )}

      {user && !loadingSaved && savedProposals.length === 0 && (
        <div className="max-w-2xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma proposta salva ainda</p>
              <p className="text-sm">Gere uma proposta e clique em "Salvar"</p>
            </CardContent>
          </Card>
        </div>
      )}

      {user && !loadingSaved && savedProposals.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-3">
          {savedProposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{proposal.client_name}</p>
                      <p className="text-sm text-muted-foreground">{proposal.client_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {proposal.contracts.length} contrato(s)
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(proposal.updated_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Criado por: <span className="font-medium">{proposal.user_name || "Usuário"}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => loadProposalForEdit(proposal)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteProposal(proposal.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

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
            {activeTab === "generator" && (step === "contracts" || step === "summary") && proposalData.contracts.some((c) => c.isComplete) && (
              <Button variant="ghost" size="sm" onClick={resetGenerator}>
                Nova Proposta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container max-w-4xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "generator" | "saved")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nova Proposta
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Propostas Salvas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Main Content */}
            <div className="py-4">
              {step === "client-name" && renderClientNameStep()}
              {step === "client-phone" && renderClientPhoneStep()}
              {step === "contracts" && renderContractStep()}
              {step === "summary" && renderSummaryStep()}
            </div>
          </TabsContent>

          <TabsContent value="saved">
            {renderSavedProposals()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Fixed Bottom Actions */}
      {activeTab === "generator" && step === "contracts" && (
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
