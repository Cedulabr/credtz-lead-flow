import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Download, 
  Loader2,
  CreditCard,
  User,
  CheckCircle,
  Building2,
  Wallet,
  MessageCircle,
  Send
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { BaseOffClient, BaseOffContract } from '../types';
import { formatCurrency, formatDate, formatCPF, formatPhone } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TrocoSimulation } from './TrocoCalculator';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface ProfessionalProposalPDFProps {
  isOpen: boolean;
  onClose: () => void;
  client: BaseOffClient;
  contracts: BaseOffContract[];
  companyName?: string;
  companyLogo?: string;
  trocoSimulation?: TrocoSimulation | null;
  selectedContractIds?: string[];
}

// PDF Template Configuration
const PDF_CONFIG = {
  colors: {
    primary: { r: 37, g: 99, b: 235 },      // Blue-600
    secondary: { r: 100, g: 116, b: 139 },   // Slate-500
    success: { r: 16, g: 185, b: 129 },      // Emerald-500
    dark: { r: 30, g: 41, b: 59 },           // Slate-800
    light: { r: 248, g: 250, b: 252 },       // Slate-50
    border: { r: 226, g: 232, b: 240 },      // Slate-200
  },
  fonts: {
    title: 18,
    subtitle: 14,
    heading: 12,
    body: 10,
    small: 9,
    tiny: 8,
  },
  spacing: {
    margin: 20,
    padding: 10,
    lineHeight: 6,
  }
};

export function ProfessionalProposalPDF({ 
  isOpen, 
  onClose, 
  client, 
  contracts,
  companyName = 'Easyn',
  trocoSimulation,
  selectedContractIds: externalSelectedIds,
}: ProfessionalProposalPDFProps) {
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [showWhatsAppSend, setShowWhatsAppSend] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const { sendTextMessage, sendMediaMessage, hasInstances, sending, instances, loadingInstances } = useWhatsApp();

  // Sync with external selection if provided
  useEffect(() => {
    if (externalSelectedIds && externalSelectedIds.length > 0) {
      setSelectedContracts(externalSelectedIds);
    }
  }, [externalSelectedIds, isOpen]);

  const toggleContract = (contractId: string) => {
    setSelectedContracts(prev => 
      prev.includes(contractId) 
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const selectAll = () => {
    if (selectedContracts.length === contracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(contracts.map(c => c.id));
    }
  };

  const generateProposalText = () => {
    const selectedContractsList = contracts.filter(c => selectedContracts.includes(c.id));
    const totalSaldo = selectedContractsList.reduce((sum, c) => sum + (c.saldo || 0), 0);

    let text = `📋 *PROPOSTA DE REFINANCIAMENTO*\n━━━━━━━━━━━━━━━━━\n\n`;
    text += `👤 *Beneficiário:* ${client.nome || 'N/I'}\n`;
    text += `📄 *CPF:* ${client.cpf ? formatCPF(client.cpf) : 'N/I'}\n`;
    text += `🔢 *NB:* ${client.nb || 'N/I'}\n`;
    text += `🏦 *Banco Pagto:* ${client.banco_pagto || 'N/I'}\n`;
    if (client.mr && client.mr > 0) {
      text += `💰 *Margem Disponível:* ${formatCurrency(client.mr)}\n`;
    }

    text += `\n📄 *CONTRATOS SELECIONADOS*\n━━━━━━━━━━━━━━━━━\n\n`;
    selectedContractsList.forEach((contract, index) => {
      const num = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][index] || `${index+1}.`;
      text += `${num} *${contract.banco_emprestimo || 'N/I'}* - ${contract.tipo_emprestimo || 'Empréstimo'}\n`;
      text += `   Nº ${contract.contrato}\n`;
      text += `   Parcela: ${formatCurrency(contract.vl_parcela)} | Saldo: ${formatCurrency(contract.saldo)}\n`;
      if (contract.prazo || contract.taxa) {
        text += `   Prazo: ${contract.prazo || '0'}x | Taxa: ${contract.taxa ? contract.taxa.toFixed(2) + '%' : 'N/I'}\n`;
      }
      text += `\n`;
    });

    if (trocoSimulation && trocoSimulation.troco > 0) {
      text += `💰 *SIMULAÇÃO DE TROCO*\n━━━━━━━━━━━━━━━━━\n`;
      text += `🏦 Banco: ${trocoSimulation.bancoLabel}\n`;
      text += `📊 Taxa: ${trocoSimulation.taxa.toFixed(2)}% | Prazo: ${trocoSimulation.prazo}x\n`;
      text += `💵 Nova Parcela: ${formatCurrency(trocoSimulation.novaParcela)}\n`;
      text += `🤑 *TROCO: ${formatCurrency(trocoSimulation.troco)}*\n\n`;
    }

    text += `📊 *RESUMO*\n`;
    text += `Total contratos: ${selectedContractsList.length}\n`;
    text += `Saldo total: ${formatCurrency(totalSaldo)}\n\n`;
    text += `_Proposta gerada por Easyn_`;

    return text;
  };

  const generatePDF = async () => {
    if (selectedContracts.length === 0) {
      toast.error('Selecione pelo menos um contrato');
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const { margin, lineHeight } = PDF_CONFIG.spacing;
      const { colors, fonts } = PDF_CONFIG;
      let y = margin;

      // Helper functions
      const setColor = (color: { r: number; g: number; b: number }) => {
        doc.setTextColor(color.r, color.g, color.b);
      };

      const drawLine = (yPos: number, color = colors.border) => {
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const addText = (text: string, x: number, yPos: number, options?: { 
        fontSize?: number; 
        color?: { r: number; g: number; b: number }; 
        bold?: boolean;
        align?: 'left' | 'center' | 'right';
      }) => {
        const { fontSize = fonts.body, color = colors.dark, bold = false, align = 'left' } = options || {};
        doc.setFontSize(fontSize);
        setColor(color);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        
        if (align === 'center') {
          doc.text(text, pageWidth / 2, yPos, { align: 'center' });
        } else if (align === 'right') {
          doc.text(text, pageWidth - margin, yPos, { align: 'right' });
        } else {
          doc.text(text, x, yPos);
        }
      };

      // ===== HEADER =====
      // Company name/logo area
      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setFontSize(fonts.title);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(companyName.toUpperCase(), margin, 22);
      
      doc.setFontSize(fonts.small);
      doc.setFont('helvetica', 'normal');
      doc.text('Soluções em Crédito Consignado', margin, 30);

      // Document title
      y = 50;
      addText('PROPOSTA DE REFINANCIAMENTO', margin, y, { 
        fontSize: fonts.subtitle, 
        color: colors.primary, 
        bold: true 
      });
      
      y += 8;
      const today = new Date();
      addText(
        `Documento gerado em ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        margin, y, { fontSize: fonts.tiny, color: colors.secondary }
      );
      
      y += 15;
      drawLine(y);
      y += 15;

      // ===== CLIENT DATA SECTION =====
      addText('DADOS DO BENEFICIÁRIO', margin, y, { 
        fontSize: fonts.heading, 
        color: colors.primary, 
        bold: true 
      });
      y += 12;

      // Client info grid
      const clientFields = [
        { label: 'Nome Completo', value: client.nome || 'Não informado' },
        { label: 'CPF', value: client.cpf ? formatCPF(client.cpf) : 'Não informado' },
        { label: 'Data de Nascimento', value: client.data_nascimento ? formatDate(client.data_nascimento) : 'Não informado' },
        { label: 'Número do Benefício', value: client.nb || 'Não informado' },
        { label: 'Espécie', value: client.esp || 'Não informado' },
        { label: 'Situação do Benefício', value: client.status_beneficio || 'Não informado' },
        { label: 'Banco de Pagamento', value: client.banco_pagto || 'Não informado' },
        { label: 'Telefone', value: client.tel_cel_1 ? formatPhone(client.tel_cel_1) : 'Não informado' },
        { label: 'Localidade', value: [client.municipio, client.uf].filter(Boolean).join(' - ') || 'Não informado' },
      ];

      const colWidth = (pageWidth - 2 * margin) / 2;
      
      clientFields.forEach((field, index) => {
        const col = index % 2;
        const x = margin + (col * colWidth);
        
        if (col === 0 && index > 0) y += lineHeight * 2;
        
        addText(field.label + ':', x, y, { fontSize: fonts.small, color: colors.secondary });
        addText(field.value, x, y + lineHeight, { fontSize: fonts.body, bold: true });
      });
      
      y += lineHeight * 3;

      // Margem disponível highlight
      if (client.mr && client.mr > 0) {
        doc.setFillColor(colors.success.r, colors.success.g, colors.success.b, 0.1);
        doc.roundedRect(margin, y - 2, pageWidth - 2 * margin, 20, 3, 3, 'F');
        
        addText('Margem Disponível:', margin + 5, y + 8, { 
          fontSize: fonts.body, 
          color: colors.success 
        });
        addText(formatCurrency(client.mr), margin + 50, y + 8, { 
          fontSize: fonts.heading, 
          color: colors.success, 
          bold: true 
        });
        y += 25;
      }

      y += 10;
      drawLine(y);
      y += 15;

      // ===== TROCO SIMULATION SECTION (if available) =====
      if (trocoSimulation && trocoSimulation.troco > 0) {
        addText('SIMULAÇÃO DE REFINANCIAMENTO', margin, y, { 
          fontSize: fonts.heading, 
          color: colors.primary, 
          bold: true 
        });
        y += 12;

        // Simulation highlight box
        doc.setFillColor(colors.success.r, colors.success.g, colors.success.b, 0.1);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 45, 3, 3, 'F');
        doc.setDrawColor(colors.success.r, colors.success.g, colors.success.b);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 45, 3, 3, 'S');

        // Troco (highlighted)
        addText('TROCO ESTIMADO:', margin + 5, y + 8, { 
          fontSize: fonts.body, 
          color: colors.success 
        });
        addText(formatCurrency(trocoSimulation.troco), margin + 55, y + 8, { 
          fontSize: fonts.subtitle, 
          color: colors.success, 
          bold: true 
        });

        // Simulation details row
        y += 18;
        addText(`Banco: ${trocoSimulation.bancoLabel}`, margin + 5, y, { fontSize: fonts.small });
        addText(`Taxa: ${trocoSimulation.taxa.toFixed(2)}% a.m.`, margin + 60, y, { fontSize: fonts.small });
        addText(`Prazo: ${trocoSimulation.prazo} meses`, margin + 115, y, { fontSize: fonts.small });

        y += 10;
        addText(`Nova Parcela: ${formatCurrency(trocoSimulation.novaParcela)}`, margin + 5, y, { 
          fontSize: fonts.body, 
          bold: true 
        });
        addText(`Saldo Refinanciado: ${formatCurrency(trocoSimulation.saldoDevedor)}`, margin + 80, y, { 
          fontSize: fonts.body 
        });

        y += 20;
        drawLine(y);
        y += 15;
      }

      // ===== CONTRACTS SECTION =====
      addText('CONTRATOS SELECIONADOS PARA REFINANCIAMENTO', margin, y, { 
        fontSize: fonts.heading, 
        color: colors.primary, 
        bold: true 
      });
      y += 12;

      const selectedContractsList = contracts.filter(c => selectedContracts.includes(c.id));
      
      selectedContractsList.forEach((contract, index) => {
        // Check page break
        if (y > pageHeight - 80) {
          doc.addPage();
          y = margin;
        }

        // Contract box
        doc.setFillColor(colors.light.r, colors.light.g, colors.light.b);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 42, 2, 2, 'F');
        doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 42, 2, 2, 'S');

        // Contract header
        addText(`Contrato ${index + 1}`, margin + 5, y + 5, { 
          fontSize: fonts.small, 
          color: colors.secondary 
        });
        addText(contract.banco_emprestimo || 'Banco não informado', margin + 35, y + 5, { 
          fontSize: fonts.body, 
          color: colors.dark, 
          bold: true 
        });
        
        // Contract number
        addText(`Nº ${contract.contrato}`, pageWidth - margin - 5, y + 5, { 
          fontSize: fonts.small, 
          color: colors.secondary,
          align: 'right' 
        });

        // Contract details row 1
        y += 12;
        addText('Tipo:', margin + 5, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(contract.tipo_emprestimo || 'Não informado', margin + 20, y, { fontSize: fonts.small });
        
        addText('Valor do Empréstimo:', margin + 80, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(formatCurrency(contract.vl_emprestimo), margin + 120, y, { fontSize: fonts.small, bold: true });

        // Contract details row 2
        y += 10;
        addText('Parcela:', margin + 5, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(formatCurrency(contract.vl_parcela), margin + 25, y, { fontSize: fonts.small });
        
        addText('Prazo:', margin + 55, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(`${contract.prazo || '0'} meses`, margin + 70, y, { fontSize: fonts.small });
        
        addText('Taxa:', margin + 100, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(contract.taxa ? `${contract.taxa}% a.m.` : 'Não informada', margin + 115, y, { fontSize: fonts.small });

        // Contract details row 3
        y += 10;
        addText('Saldo Devedor:', margin + 5, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(formatCurrency(contract.saldo), margin + 40, y, { 
          fontSize: fonts.body, 
          color: colors.primary, 
          bold: true 
        });
        
        addText('Situação:', margin + 100, y, { fontSize: fonts.tiny, color: colors.secondary });
        addText(contract.situacao_emprestimo || 'Não informada', margin + 125, y, { fontSize: fonts.small });

        y += 20;
      });

      y += 10;
      drawLine(y);
      y += 15;

      // ===== SUMMARY SECTION =====
      const totalSaldo = selectedContractsList.reduce((sum, c) => sum + (c.saldo || 0), 0);
      const totalParcelas = selectedContractsList.reduce((sum, c) => sum + (c.vl_parcela || 0), 0);

      // Check page break for summary
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      }

      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b, 0.05);
      doc.roundedRect(margin, y - 5, pageWidth - 2 * margin, trocoSimulation ? 50 : 35, 3, 3, 'F');

      addText('RESUMO DA OPERAÇÃO', margin + 5, y + 5, { 
        fontSize: fonts.heading, 
        color: colors.primary, 
        bold: true 
      });

      y += 15;
      addText(`Total de Contratos: ${selectedContractsList.length}`, margin + 5, y, { fontSize: fonts.body });
      addText(`Saldo Total a Refinanciar: ${formatCurrency(totalSaldo)}`, margin + 70, y, { 
        fontSize: fonts.body, 
        color: colors.primary, 
        bold: true 
      });
      
      y += lineHeight;
      addText(`Parcelas Atuais: ${formatCurrency(totalParcelas)}/mês`, margin + 5, y, { fontSize: fonts.body });

      // Add troco summary if available
      if (trocoSimulation && trocoSimulation.troco > 0) {
        y += lineHeight;
        addText(`Nova Parcela Proposta: ${formatCurrency(trocoSimulation.novaParcela)}/mês`, margin + 5, y, { fontSize: fonts.body });
        addText(`TROCO DISPONÍVEL: ${formatCurrency(trocoSimulation.troco)}`, margin + 90, y, { 
          fontSize: fonts.body, 
          color: colors.success, 
          bold: true 
        });
      }

      y += 30;

      // ===== FOOTER =====
      drawLine(y);
      y += 10;

      addText(
        'Esta proposta é informativa e não constitui compromisso de aprovação de crédito.',
        margin, y, { fontSize: fonts.tiny, color: colors.secondary, align: 'center' }
      );
      y += 5;
      addText(
        'Condições sujeitas à análise de crédito, elegibilidade do beneficiário e políticas vigentes.',
        margin, y, { fontSize: fonts.tiny, color: colors.secondary, align: 'center' }
      );
      y += 8;
      addText(
        `${companyName} - Documento gerado eletronicamente`,
        margin, y, { fontSize: fonts.tiny, color: colors.secondary, align: 'center' }
      );

      // Page number
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(fonts.tiny);
        doc.setTextColor(colors.secondary.r, colors.secondary.g, colors.secondary.b);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Download
      const cleanCPF = client.cpf?.replace(/\D/g, '') || 'sem_cpf';
      const fileName = `proposta_refinanciamento_${cleanCPF}_${Date.now()}.pdf`;
      doc.save(fileName);

      // Capture base64 for WhatsApp
      const base64 = doc.output('datauristring').split(',')[1];
      setPdfBase64(base64);
      setPhoneNumber(client.tel_cel_1?.replace(/\D/g, '') || '');
      setWhatsAppMessage(generateProposalText());
      setShowWhatsAppSend(true);

      toast.success('PDF gerado! Agora você pode enviar via WhatsApp.');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar proposta');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFullPhone = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Número de telefone inválido');
      return null;
    }
    return cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  };

  const handleSendText = async () => {
    const fullPhone = getFullPhone();
    if (!fullPhone) return;
    const success = await sendTextMessage(fullPhone, whatsAppMessage, client.nome);
    if (success) handleCloseAll();
  };

  const handleSendPDF = async () => {
    if (!pdfBase64) return;
    const fullPhone = getFullPhone();
    if (!fullPhone) return;
    const fileName = `proposta_${client.cpf?.replace(/\D/g, '') || 'cliente'}.pdf`;
    const success = await sendMediaMessage(fullPhone, pdfBase64, fileName, undefined, client.nome);
    if (success) handleCloseAll();
  };

  const handleCloseAll = () => {
    setShowWhatsAppSend(false);
    setPdfBase64(null);
    onClose();
  };

  // Calculate totals for display
  const selectedContractsList = contracts.filter(c => selectedContracts.includes(c.id));
  const totalSaldo = selectedContractsList.reduce((sum, c) => sum + (c.saldo || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAll}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {showWhatsAppSend ? (
              <>
                <MessageCircle className="w-5 h-5 text-green-600" />
                Enviar Proposta via WhatsApp
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 text-primary" />
                Gerar Proposta Profissional
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {showWhatsAppSend ? (
          /* ===== WhatsApp Send Screen ===== */
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">PDF gerado com sucesso!</p>
                  <p className="text-sm text-muted-foreground">O download já foi realizado. Deseja enviar via WhatsApp?</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{client.nome}</p>
                  <p className="text-sm text-muted-foreground">CPF: {formatCPF(client.cpf)}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Telefone (com DDD)</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 71999999999"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">📋 Texto para enviar ao cliente:</Label>
                <Textarea
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  rows={10}
                  className="mt-1 font-mono text-xs"
                  placeholder="Texto da proposta..."
                />
              </div>
            </div>

            {!hasInstances && !loadingInstances && (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 shrink-0">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Nenhuma instância WhatsApp configurada. Configure em Configurações WhatsApp.
                </p>
              </Card>
            )}

            <div className="flex gap-3 pt-2 shrink-0">
              <Button variant="outline" onClick={handleCloseAll}>
                Fechar
              </Button>
              <Button 
                onClick={handleSendText}
                disabled={!hasInstances || sending || !phoneNumber.trim()}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                Enviar Texto
              </Button>
              <Button 
                onClick={handleSendPDF}
                disabled={!hasInstances || sending || !phoneNumber.trim() || !pdfBase64}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Enviar PDF
              </Button>
            </div>
          </div>
        ) : (
          /* ===== Contract Selection Screen (original) ===== */
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            {/* Client Info */}
            <Card className="p-4 bg-muted/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg truncate">{client.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    CPF: {formatCPF(client.cpf)} • NB: {client.nb || 'N/I'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Troco Simulation Summary (if available) */}
            {trocoSimulation && trocoSimulation.troco > 0 && (
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">Troco Calculado</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(trocoSimulation.troco)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">{trocoSimulation.bancoLabel}</p>
                    <p className="text-muted-foreground">{trocoSimulation.taxa}% • {trocoSimulation.prazo}x</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Contract Selection */}
            <div className="flex items-center justify-between shrink-0">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Selecione os Contratos
              </Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedContracts.length === contracts.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pr-2">
                {contracts.length === 0 ? (
                  <Card className="p-6 text-center">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum contrato disponível</p>
                  </Card>
                ) : (
                  contracts.map(contract => (
                    <Card
                      key={contract.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        selectedContracts.includes(contract.id) 
                          ? "border-2 border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleContract(contract.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedContracts.includes(contract.id)}
                          onCheckedChange={() => toggleContract(contract.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-semibold truncate">{contract.banco_emprestimo || 'N/I'}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {contract.tipo_emprestimo || 'Empréstimo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            Nº {contract.contrato} • Parcela: {formatCurrency(contract.vl_parcela)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatCurrency(contract.saldo)}</p>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Summary */}
            {selectedContracts.length > 0 && (
              <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 shrink-0">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {selectedContracts.length} contrato(s) • Saldo total: {formatCurrency(totalSaldo)}
                    {trocoSimulation && trocoSimulation.troco > 0 && (
                      <span className="ml-2 font-bold">• Troco: {formatCurrency(trocoSimulation.troco)}</span>
                    )}
                  </span>
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 shrink-0">
              <Button variant="outline" onClick={handleCloseAll} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={generatePDF} 
                disabled={selectedContracts.length === 0 || isGenerating}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
