import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit,
  Trash2,
  Plus,
  X,
  Building2,
  Percent
} from "lucide-react";

interface CommissionTable {
  id: string;
  bank_name: string;
  product_name: string;
  term?: string;
  commission_percentage: number;
  user_percentage: number;
  user_percentage_profile?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminCommissionTableProps {
  commissionTable: CommissionTable[];
  onEdit: (rule: CommissionTable) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onNewRule: (bankName?: string, productName?: string) => void;
}

export function AdminCommissionTable({ 
  commissionTable, 
  onEdit, 
  onToggleActive, 
  onDelete, 
  onNewRule 
}: AdminCommissionTableProps) {
  const { toast } = useToast();

  // Lista de produtos padrão organizados por categoria
  const productOrder = [
    'Novo', 'Refinanciamento', 'Portabilidade', 
    'Refinanciamento da portabilidade', 'Cartão', 'Cartão Com saque'
  ];

  // Agrupar comissões por banco
  const groupedByBank = commissionTable.reduce((groups, rule) => {
    if (!groups[rule.bank_name]) {
      groups[rule.bank_name] = {};
    }
    if (!groups[rule.bank_name][rule.product_name]) {
      groups[rule.bank_name][rule.product_name] = [];
    }
    groups[rule.bank_name][rule.product_name].push(rule);
    return groups;
  }, {} as Record<string, Record<string, CommissionTable[]>>);

  if (commissionTable.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">Nenhuma regra de comissão</h3>
          <p className="text-muted-foreground mb-4">
            Crie a primeira regra de comissão para começar
          </p>
          <Button onClick={() => onNewRule()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira regra
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.keys(groupedByBank).map(bankName => (
        <Card key={bankName} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {bankName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Produto</th>
                    <th className="text-left p-4 font-medium">Prazo</th>
                    <th className="text-left p-4 font-medium">Comissão (%)</th>
                    <th className="text-left p-4 font-medium">Repasse (%)</th>
                    <th className="text-left p-4 font-medium">Nível</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {productOrder.map(productName => {
                    const rules = groupedByBank[bankName][productName] || [];
                    
                    if (rules.length === 0) {
                      return (
                        <tr key={productName} className="border-t hover:bg-muted/20">
                          <td className="p-4 font-medium">{productName}</td>
                          <td className="p-4 text-muted-foreground">-</td>
                          <td className="p-4 text-muted-foreground">-</td>
                          <td className="p-4 text-muted-foreground">-</td>
                          <td className="p-4 text-muted-foreground">-</td>
                          <td className="p-4">
                            <Badge variant="secondary">Não configurado</Badge>
                          </td>
                          <td className="p-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNewRule(bankName, productName)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Configurar
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                    
                    return rules.map((rule, index) => (
                      <tr key={`${productName}-${index}`} className="border-t hover:bg-muted/20">
                        {index === 0 && (
                          <td className="p-4 font-medium" rowSpan={rules.length}>
                            {productName}
                          </td>
                        )}
                        <td className="p-4">{rule.term || '-'}</td>
                        <td className="p-4 font-medium">{rule.commission_percentage}%</td>
                        <td className="p-4 font-medium text-green-600">{rule.user_percentage}%</td>
                        <td className="p-4">
                          {rule.user_percentage_profile ? (
                            <Badge 
                              className={
                                rule.user_percentage_profile === 'bronze' ? 'bg-amber-700 text-white' :
                                rule.user_percentage_profile === 'prata' ? 'bg-gray-400 text-gray-900' :
                                rule.user_percentage_profile === 'ouro' ? 'bg-yellow-500 text-yellow-900' :
                                rule.user_percentage_profile === 'diamante' ? 'bg-cyan-400 text-cyan-900' :
                                ''
                              }
                            >
                              {rule.user_percentage_profile.charAt(0).toUpperCase() + rule.user_percentage_profile.slice(1)}
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-4">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(rule)}
                              title="Editar"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={rule.is_active ? "secondary" : "default"}
                              onClick={() => onToggleActive(rule.id, rule.is_active)}
                              title={rule.is_active ? "Desativar" : "Ativar"}
                            >
                              {rule.is_active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(rule.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })}
                  
                  {/* Produtos personalizados não listados */}
                  {Object.keys(groupedByBank[bankName]).filter(product => 
                    !productOrder.includes(product)
                  ).map(productName => {
                    const rules = groupedByBank[bankName][productName] || [];
                    
                    return rules.map((rule, index) => (
                      <tr key={`${productName}-${index}`} className="border-t hover:bg-muted/20 bg-blue-50/50">
                        {index === 0 && (
                          <td className="p-4 font-medium" rowSpan={rules.length}>
                            {productName} <Badge variant="outline" className="ml-2">Custom</Badge>
                          </td>
                        )}
                        <td className="p-4">{rule.term || '-'}</td>
                        <td className="p-4 font-medium">{rule.commission_percentage}%</td>
                        <td className="p-4 font-medium text-green-600">{rule.user_percentage}%</td>
                        <td className="p-4">
                          {rule.user_percentage_profile ? (
                            <Badge 
                              className={
                                rule.user_percentage_profile === 'bronze' ? 'bg-amber-700 text-white' :
                                rule.user_percentage_profile === 'prata' ? 'bg-gray-400 text-gray-900' :
                                rule.user_percentage_profile === 'ouro' ? 'bg-yellow-500 text-yellow-900' :
                                rule.user_percentage_profile === 'diamante' ? 'bg-cyan-400 text-cyan-900' :
                                ''
                              }
                            >
                              {rule.user_percentage_profile.charAt(0).toUpperCase() + rule.user_percentage_profile.slice(1)}
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-4">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(rule)}
                              title="Editar"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={rule.is_active ? "secondary" : "default"}
                              onClick={() => onToggleActive(rule.id, rule.is_active)}
                              title={rule.is_active ? "Desativar" : "Ativar"}
                            >
                              {rule.is_active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(rule.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}