import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send } from "lucide-react";
import { Badge } from "./ui/badge";

interface SMSMessage {
  id: string;
  phone: string;
  message: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

export function SMSManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens SMS:', error);
    }
  };

  const sendSMS = async () => {
    if (!messageText.trim() || !phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Preencha a mensagem e o telefone",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do telefone
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Erro",
        description: "Telefone deve ter 10 ou 11 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sms_messages')
        .insert({
          user_id: user?.id,
          phone: cleanPhone,
          message: messageText,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "SMS enviado com sucesso!",
      });

      setMessageText('');
      setPhoneNumber('');
      fetchMessages();
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    } else if (cleaned.length === 10) {
      const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    return phone;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setPhoneNumber(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Envio de SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Disparo de SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sms-phone">Telefone</Label>
            <Input
              id="sms-phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="11999999999"
              maxLength={11}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite apenas números (10 ou 11 dígitos)
            </p>
          </div>
          <div>
            <Label htmlFor="sms-message">Mensagem</Label>
            <Textarea
              id="sms-message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem SMS..."
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {messageText.length}/160 caracteres
            </p>
          </div>
          <Button onClick={sendSMS} disabled={loading} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar SMS'}
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de SMS */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de SMS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <p className="font-medium">{formatPhone(message.phone)}</p>
                    </div>
                    <Badge 
                      variant={message.status === 'sent' ? 'default' : 'secondary'}
                    >
                      {message.status === 'sent' ? 'Enviado' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-md mb-3">
                    <p className="text-sm">{message.message}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      {message.sent_at ? 
                        `Enviado em: ${new Date(message.sent_at).toLocaleString('pt-BR')}` : 
                        `Criado em: ${new Date(message.created_at).toLocaleString('pt-BR')}`
                      }
                    </span>
                    <span>{message.message.length} caracteres</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {messages.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma mensagem SMS enviada ainda</p>
            <p className="text-sm text-muted-foreground mt-2">
              Envie sua primeira mensagem usando o formulário acima
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}