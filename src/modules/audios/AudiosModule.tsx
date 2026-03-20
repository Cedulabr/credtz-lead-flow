import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mic, Plus, Trash2, Loader2, Music } from 'lucide-react';
import { useAudioFiles } from './hooks/useAudioFiles';

export function AudiosModule() {
  const { audios, loading, uploadAudio, deleteAudio, getPublicUrl } = useAudioFiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    const ok = await uploadAudio(title.trim(), file);
    setUploading(false);
    if (ok) {
      setDialogOpen(false);
      setTitle('');
      setFile(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Áudios</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus áudios para envio via WhatsApp</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Áudio
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : audios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum áudio cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Novo Áudio" para adicionar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audios.map(audio => (
            <Card key={audio.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium truncate">{audio.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteAudio(audio)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full" preload="none">
                  <source src={getPublicUrl(audio.file_path)} type={audio.mime_type || 'audio/mpeg'} />
                </audio>
                {audio.file_size && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {(audio.file_size / 1024).toFixed(0)} KB
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Áudio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Apresentação portabilidade" />
            </div>
            <div>
              <Label>Arquivo de áudio</Label>
              <Input
                type="file"
                accept="audio/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !title.trim() || !file} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
