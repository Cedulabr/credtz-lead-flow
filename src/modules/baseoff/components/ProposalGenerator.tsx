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

interface ProposalGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  client: BaseOffClient;
  contracts: BaseOffContract[];
}

export function ProposalGenerator({ 
  isOpen, 
  onClose, 
  client, 
  contracts 
}: ProposalGeneratorProps) {
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
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.text('PROPOSTA DE REFINANCIAMENTO', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerada em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });
      y += 20;

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Client Data Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('📋 DADOS DO CLIENTE', margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      const clientData = [
        ['Nome:', client.nome],
        ['CPF:', formatCPF(client.cpf)],
        ['Data de Nascimento:', formatDate(client.data_nascimento) || 'N/I'],
        ['Benefício (NB):', client.nb || 'N/I'],
        ['Espécie:', client.esp || 'N/I'],
        ['Situação:', client.status_beneficio || 'N/I'],
        ['Banco Pagamento:', client.banco_pagto || 'N/I'],
        ['Telefone:', client.tel_cel_1 ? formatPhone(client.tel_cel_1) : 'N/I'],
        ['UF:', client.uf || 'N/I'],
        ['Município:', client.municipio || 'N/I'],
      ];

      clientData.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || 'N/I', margin + 50, y);
        y += 7;
      });

      y += 10;

      // Margem Info
      if (client.mr) {
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 0);
        doc.text(`💰 Margem Disponível: ${formatCurrency(client.mr)}`, margin, y);
        y += 15;
      }

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Contracts Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('📄 CONTRATOS SELECIONADOS', margin, y);
      y += 10;

      const selectedContractsList = contracts.filter(c => selectedContracts.includes(c.id));
      
      selectedContractsList.forEach((contract, index) => {
        // Check if we need a new page
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 5, pageWidth - 2 * margin, 45, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Contrato ${index + 1}: ${contract.banco_emprestimo || 'N/I'}`, margin + 5, y + 3);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        
        y += 12;
        doc.text(`Número: ${contract.contrato}`, margin + 5, y);
        doc.text(`Tipo: ${contract.tipo_emprestimo || 'N/I'}`, margin + 80, y);
        
        y += 8;
        doc.text(`Valor Empréstimo: ${formatCurrency(contract.vl_emprestimo)}`, margin + 5, y);
        doc.text(`Parcela: ${formatCurrency(contract.vl_parcela)}`, margin + 80, y);
        
        y += 8;
        doc.text(`Prazo: ${contract.prazo || 'N/I'} meses`, margin + 5, y);
        doc.text(`Taxa: ${contract.taxa ? `${contract.taxa}%` : 'N/I'}`, margin + 80, y);
        
        y += 8;
        doc.text(`Saldo Devedor: ${formatCurrency(contract.saldo)}`, margin + 5, y);
        doc.text(`Situação: ${contract.situacao_emprestimo || 'N/I'}`, margin + 80, y);
        
        y += 15;
      });

      y += 10;

      // Summary
      const totalSaldo = selectedContractsList.reduce((sum, c) => sum + (c.saldo || 0), 0);
      const totalParcelas = selectedContractsList.reduce((sum, c) => sum + (c.vl_parcela || 0), 0);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 RESUMO', margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Contratos: ${selectedContractsList.length}`, margin, y);
      y += 7;
      doc.text(`Saldo Total: ${formatCurrency(totalSaldo)}`, margin, y);
      y += 7;
      doc.text(`Parcelas Totais: ${formatCurrency(totalParcelas)}/mês`, margin, y);
      y += 15;

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Esta proposta é informativa e não constitui compromisso de aprovação.', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.text('Condições sujeitas a análise de crédito e elegibilidade do beneficiário.', pageWidth / 2, y, { align: 'center' });

      // Download
      const fileName = `proposta_${client.cpf}_${new Date().getTime()}.pdf`;
      doc.save(fileName);

      toast.success('Proposta gerada com sucesso!');
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
            Gerar Proposta em PDF
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
          {/* Client Info */}
          <Card className="p-4 bg-muted/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg">{client.nome}</p>
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
                          <span className="font-semibold">{contract.banco_emprestimo || 'N/I'}</span>
                          <Badge variant="outline" className="text-xs">
                            {contract.tipo_emprestimo || 'Empréstimo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Contrato: {contract.contrato} • Parcela: {formatCurrency(contract.vl_parcela)}
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
            <Card className="p-3 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 shrink-0">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedContracts.length} contrato(s) selecionado(s)
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
