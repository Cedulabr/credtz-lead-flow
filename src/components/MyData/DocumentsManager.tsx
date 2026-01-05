import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Upload, FileText, Eye, Trash2, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { UserDocument, PersonType, documentTypes, DocumentStatus } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentsManagerProps {
  documents: UserDocument[];
  personType: PersonType;
  userId: string;
  onRefresh: () => void;
  isAdmin?: boolean;
  onReviewDocument?: (docId: string, status: DocumentStatus, notes: string) => Promise<void>;
}

export function DocumentsManager({ 
  documents, 
  personType, 
  userId, 
  onRefresh, 
  isAdmin,
  onReviewDocument 
}: DocumentsManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedDocName, setSelectedDocName] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableDocTypes = documentTypes[personType];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedType) {
      toast.error('Selecione o tipo de documento');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não permitido. Use PDF, JPG ou PNG');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setUploading(true);
    try {
      // Get current version for this document type
      const existingDocs = documents.filter(d => d.document_type === selectedType);
      const newVersion = existingDocs.length > 0 
        ? Math.max(...existingDocs.map(d => d.version)) + 1 
        : 1;

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${selectedType}_v${newVersion}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          document_type: selectedType,
          document_name: selectedDocName || availableDocTypes.find(t => t.value === selectedType)?.label || 'Documento',
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          version: newVersion,
          status: 'sent',
        });

      if (dbError) throw dbError;

      toast.success('Documento enviado com sucesso');
      setShowUploadDialog(false);
      setSelectedType('');
      setSelectedDocName('');
      onRefresh();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: UserDocument) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;

    try {
      // Extract file path from URL
      const urlParts = doc.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage
        .from('user-documents')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Documento excluído');
      onRefresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao excluir documento');
    }
  };

  const handleReview = async (docId: string, status: DocumentStatus) => {
    if (!onReviewDocument) return;
    
    setReviewingDoc(docId);
    try {
      await onReviewDocument(docId, status, reviewNotes);
      setReviewNotes('');
      toast.success(`Documento ${status === 'approved' ? 'aprovado' : 'reprovado'}`);
    } catch (error) {
      toast.error('Erro ao revisar documento');
    } finally {
      setReviewingDoc(null);
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const config = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      sent: { label: 'Enviado', variant: 'default' as const, icon: FileText },
      approved: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Reprovado', variant: 'destructive' as const, icon: XCircle },
    };
    const { label, variant, icon: Icon } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Gerencie seus documentos obrigatórios</CardDescription>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                Selecione o tipo e faça upload do documento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Documento</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDocTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedType === 'other' && (
                <div>
                  <Label>Nome do Documento</Label>
                  <Input
                    value={selectedDocName}
                    onChange={(e) => setSelectedDocName(e.target.value)}
                    placeholder="Ex: Declaração de IR"
                  />
                </div>
              )}

              <div>
                <Label>Arquivo</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={uploading || !selectedType}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                </p>
              </div>

              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Enviando...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum documento enviado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.document_name}</TableCell>
                  <TableCell className="text-muted-foreground">{doc.file_name}</TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>
                    {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = doc.file_url;
                          link.download = doc.file_name;
                          link.click();
                        }}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!isAdmin && doc.status !== 'approved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {isAdmin && doc.status === 'sent' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReview(doc.id, 'approved')}
                            disabled={reviewingDoc === doc.id}
                            title="Aprovar"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReview(doc.id, 'rejected')}
                            disabled={reviewingDoc === doc.id}
                            title="Reprovar"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                    {doc.review_notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.review_notes}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
