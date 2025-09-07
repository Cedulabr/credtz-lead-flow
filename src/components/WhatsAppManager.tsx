import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Phone, Send, Plus, Wifi, WifiOff } from "lucide-react";
import { Badge } from "./ui/badge";

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  instance_status: string;
  qr_code?: string;
  created_at: string;
}

interface WhatsAppMessage {
  id: string;
  phone: string;
  message: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

interface WhatsAppConversation {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
}

export function WhatsAppManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [instanceName, setInstanceName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstances();
    fetchMessages();
    fetchConversations();
  }, []);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    }
  };

  const connectWhatsApp = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome da instância (seu número)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Criar instância no banco local
      const { data: instanceData, error: dbError } = await supabase
        .from('whatsapp_instances')
        .insert({
          user_id: user?.id,
          instance_name: instanceName,
          instance_status: 'connecting'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Fazer chamada para API WhatsApp
      const response = await fetch('https://evo.opensys.tech/instance/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '823ca7d2a60eddf3a4978930348648dd'
        },
        body: JSON.stringify({
          instanceName: instanceName,
          integration: "WHATSAPP-BAILEYS"
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Atualizar status da instância
        await supabase
          .from('whatsapp_instances')
          .update({ 
            instance_status: 'connected',
            qr_code: result.qrCode || null
          })
          .eq('id', instanceData.id);

        toast({
          title: "Sucesso",
          description: "WhatsApp conectado com sucesso!",
        });
      } else {
        throw new Error('Falha na conexão com WhatsApp');
      }

      setInstanceName('');
      fetchInstances();
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar WhatsApp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Preencha a mensagem e o telefone",
        variant: "destructive",
      });
      return;
    }

    if (instances.length === 0) {
      toast({
        title: "Erro",
        description: "Conecte uma instância do WhatsApp primeiro",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: user?.id,
          instance_id: instances[0].id,
          phone: phoneNumber,
          message: messageText,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Mensagem enviada!",
      });

      setMessageText('');
      setPhoneNumber('');
      fetchMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Conectar WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conectar WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="instance-name">Nome da Instância (seu número)</Label>
            <Input
              id="instance-name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Ex: 5511999999999"
            />
          </div>
          <Button onClick={connectWhatsApp} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? 'Conectando...' : 'Conectar WhatsApp'}
          </Button>
        </CardContent>
      </Card>

      {/* Status das Instâncias */}
      {instances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Instâncias Conectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instances.map((instance) => (
                <div key={instance.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {instance.instance_status === 'connected' ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{instance.instance_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Criado em: {new Date(instance.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={instance.instance_status === 'connected' ? 'default' : 'secondary'}>
                    {instance.instance_status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disparo de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Disparo de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="5511999999999"
            />
          </div>
          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
            />
          </div>
          <Button onClick={sendMessage} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar Mensagem'}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Mensagens */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mensagens Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{formatPhone(message.phone)}</p>
                    <Badge variant="outline">{message.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{message.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {message.sent_at ? 
                      new Date(message.sent_at).toLocaleString('pt-BR') : 
                      new Date(message.created_at).toLocaleString('pt-BR')
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversas */}
      {conversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Atendimento - Conversas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">
                      {conversation.contact_name || formatPhone(conversation.contact_phone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.last_message_at ? 
                        new Date(conversation.last_message_at).toLocaleString('pt-BR') : 
                        'Sem mensagens'
                      }
                    </p>
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}