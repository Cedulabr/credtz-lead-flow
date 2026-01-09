import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, MapPin, Camera, Wifi } from 'lucide-react';

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({ open, onAccept, onDecline }: ConsentModalProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Termo de Consentimento - LGPD
          </DialogTitle>
          <DialogDescription>
            Para utilizar o sistema de controle de ponto, precisamos do seu consentimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Ao utilizar este módulo de controle de ponto, você concorda com a coleta dos seguintes dados:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Camera className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Foto</p>
                <p className="text-xs text-muted-foreground">
                  Captura de foto no momento do registro para verificação de identidade.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Localização</p>
                <p className="text-xs text-muted-foreground">
                  Coordenadas GPS (latitude/longitude), cidade e estado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Wifi className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Dados de Conexão</p>
                <p className="text-xs text-muted-foreground">
                  Endereço IP e informações do dispositivo.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Finalidade:</strong> Controle de jornada de trabalho.
              <br />
              <strong>Retenção:</strong> Os dados serão mantidos por até 5 anos conforme legislação trabalhista.
              <br />
              <strong>Direitos:</strong> Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label
              htmlFor="consent"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Li e concordo com os termos acima
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            Recusar
          </Button>
          <Button onClick={onAccept} disabled={!accepted}>
            Aceitar e Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
