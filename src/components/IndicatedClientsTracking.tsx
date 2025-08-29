import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Phone, MessageCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface IndicatedClient {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  convenio: string;
  status: string;
  observacoes?: string;
  created_at: string;
}

const IndicatedClientsTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<IndicatedClient[]>([]);
  const [loading, setLoading] = useState(true);

  const statusOptions = [
    { value: 'lead_digitado', label: 'Lead Digitado', color: 'bg-blue-500' },
    { value: 'oferta_aprovada', label: 'Oferta Aprovada', color: 'bg-green-500' },
    { value: 'oferta_recusada', label: 'Oferta Recusada', color: 'bg-red-500' },
    { value: 'oferta_paga', label: 'Oferta Paga', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads_indicados')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar clientes indicados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar clientes indicados",
          variant: "destructive",
        });
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes indicados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const getStatusInfo = (status: string) => {
    const statusInfo = statusOptions.find(opt => opt.value === status);
    return statusInfo || { label: status, color: 'bg-gray-500' };
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Carregando clientes indicados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Acompanhamento de Clientes Indicados
        </CardTitle>
        <CardDescription>
          Acompanhe o status dos seus clientes indicados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum cliente indicado encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const statusInfo = getStatusInfo(client.status);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.nome}</TableCell>
                      <TableCell>{formatCPF(client.cpf)}</TableCell>
                      <TableCell>{formatPhone(client.telefone)}</TableCell>
                      <TableCell>{client.convenio}</TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.color} text-white`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${client.telefone}`, '_self')}
                            title="Ligar"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsApp(client.telefone)}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndicatedClientsTracking;