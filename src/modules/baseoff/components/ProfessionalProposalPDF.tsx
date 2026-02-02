import React, { useState } from 'react';
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
import { 
  FileText, 
  Download, 
  Loader2,
  CreditCard,
  User,
  CheckCircle,
  Building2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { BaseOffClient, BaseOffContract } from '../types';
import { formatCurrency, formatDate, formatCPF, formatPhone } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfessionalProposalPDFProps {
  isOpen: boolean;
  onClose: () => void;
  client: BaseOffClient;
  contracts: BaseOffContract[];
  companyName?: string;
  companyLogo?: string;
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
  companyName = 'Credtz',
}: ProfessionalProposalPDFProps) {
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

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
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b, 0.05);
      doc.roundedRect(margin, y - 5, pageWidth - 2 * margin, 35, 3, 3, 'F');

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

      y += 25;

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

      toast.success('Proposta profissional gerada com sucesso!');
      onClose();

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar proposta');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gerar Proposta Profissional
          </DialogTitle>
        </DialogHeader>

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
                  {selectedContracts.length} contrato(s) • Saldo total: {
                    formatCurrency(
                      contracts
                        .filter(c => selectedContracts.includes(c.id))
                        .reduce((sum, c) => sum + (c.saldo || 0), 0)
                    )
                  }
                </span>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 shrink-0">
            <Button variant="outline" onClick={onClose} className="flex-1">
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
      </DialogContent>
    </Dialog>
  );
}
