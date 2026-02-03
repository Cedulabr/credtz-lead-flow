import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Megaphone, 
  Palette,
  ChevronRight,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import existing components
import { AdminWhitelabel } from '@/components/AdminWhitelabel';

type SystemSection = 'menu' | 'announcements' | 'whitelabel';

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface SectionItem {
  id: SystemSection;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function AdminSystem() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SystemSection>('menu');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  const sections: SectionItem[] = [
    {
      id: 'announcements',
      label: 'Avisos do Sistema',
      description: 'Gerenciar avisos e comunicados para usuários',
      icon: Megaphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'whitelabel',
      label: 'Whitelabel',
      description: 'Personalização de marca e visual',
      icon: Palette,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
  ];

  useEffect(() => {
    if (activeSection === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeSection]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAnnouncements(data);
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementForm)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([announcementForm]);
        if (error) throw error;
      }

      toast({
        title: "Aviso salvo!",
        description: "O aviso foi publicado com sucesso.",
      });

      setAnnouncementForm({ title: '', content: '' });
      setEditingItem(null);
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar aviso.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: number) => {
    await supabase.from('announcements').delete().eq('id', id);
    toast({ title: "Aviso excluído" });
    fetchAnnouncements();
  };

  const startEdit = (item: Announcement) => {
    setEditingItem(item);
    setAnnouncementForm({ title: item.title, content: item.content });
    setIsDialogOpen(true);
  };

  const currentSection = sections.find(s => s.id === activeSection);

  const renderAnnouncementsContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Avisos Ativos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setAnnouncementForm({ title: '', content: '' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Aviso' : 'Novo Aviso'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Título do aviso..."
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  placeholder="Conteúdo do aviso..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
              <Button onClick={handleSaveAnnouncement} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum aviso cadastrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro aviso
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-medium truncate">{announcement.title}</h3>
                      <Badge variant={announcement.is_active ? "default" : "secondary"}>
                        {announcement.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Criado em: {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => startEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant={announcement.is_active ? "secondary" : "default"}
                      onClick={() => toggleActive(announcement.id, announcement.is_active)}
                    >
                      {announcement.is_active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => deleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'announcements':
        return renderAnnouncementsContent();
      case 'whitelabel':
        return <AdminWhitelabel />;
      default:
        return null;
    }
  };

  // Show submenu
  if (activeSection === 'menu') {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Configurações gerais e personalização
          </p>
        </div>

        <div className="grid gap-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                onClick={() => setActiveSection(section.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      section.bgColor
                    )}>
                      <section.icon className={cn("h-6 w-6", section.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{section.label}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Show section content
  return (
    <div className="space-y-4 px-4 md:px-0">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setActiveSection('menu')}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Sistema
      </Button>

      {/* Section header */}
      {currentSection && (
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            currentSection.bgColor
          )}>
            <currentSection.icon className={cn("h-5 w-5", currentSection.color)} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{currentSection.label}</h1>
            <p className="text-sm text-muted-foreground">{currentSection.description}</p>
          </div>
        </div>
      )}

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
