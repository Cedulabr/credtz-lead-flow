import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, XCircle, FileText } from 'lucide-react';
import { UserDataStatus, UserDocument, PersonType, documentTypes } from './types';

interface StatusCardProps {
  status: UserDataStatus;
  documents: UserDocument[];
  personType: PersonType;
  rejectionReason?: string | null;
}

export function StatusCard({ status, documents, personType, rejectionReason }: StatusCardProps) {
  const requiredDocs = documentTypes[personType].filter(d => d.value !== 'other');
  
  const getDocStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    if (!doc) return 'missing';
    return doc.status;
  };

  const approvedDocs = documents.filter(d => d.status === 'approved').length;
  const totalRequired = requiredDocs.length;
  const progress = totalRequired > 0 ? (approvedDocs / totalRequired) * 100 : 0;

  const statusConfig = {
    incomplete: { 
      label: 'Incompleto', 
      variant: 'secondary' as const, 
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Complete seu cadastro e envie os documentos obrigatórios.'
    },
    in_review: { 
      label: 'Em Análise', 
      variant: 'default' as const, 
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Seus dados estão sendo analisados pela equipe.'
    },
    approved: { 
      label: 'Aprovado', 
      variant: 'default' as const, 
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Seu cadastro foi aprovado com sucesso!'
    },
    rejected: { 
      label: 'Reprovado', 
      variant: 'destructive' as const, 
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: rejectionReason || 'Seu cadastro foi reprovado. Verifique as pendências.'
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={config.bgColor}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${config.color}`} />
            <div>
              <CardTitle className="text-lg">Status do Cadastro</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge variant={config.variant} className="text-sm">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Documentos Aprovados</span>
              <span className="font-medium">{approvedDocs} de {totalRequired}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {requiredDocs.map((docType) => {
              const docStatus = getDocStatus(docType.value);
              const statusInfo = {
                missing: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
                pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                sent: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
              };
              const info = statusInfo[docStatus as keyof typeof statusInfo];
              const StatusIcon = info.icon;

              return (
                <div
                  key={docType.value}
                  className={`flex items-center gap-2 p-2 rounded-lg ${info.bg}`}
                >
                  <StatusIcon className={`h-4 w-4 ${info.color}`} />
                  <span className="text-sm truncate">{docType.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
