import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, History, FlaskConical, CreditCard, Settings } from 'lucide-react';
import { StudioView } from './views/StudioView';
import { VoicerTab } from './types';

export function VoicerModule() {
  const [activeTab, setActiveTab] = useState<VoicerTab>('studio');

  return (
    <div className="min-h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VoicerTab)}>
        <div className="border-b bg-card/50 px-4 pt-3">
          <TabsList className="h-9">
            <TabsTrigger value="studio" className="text-xs gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Studio
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <History className="h-3.5 w-3.5" /> Meus Áudios
            </TabsTrigger>
            <TabsTrigger value="credits" className="text-xs gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Créditos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="studio" className="mt-0">
          <StudioView />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <div className="p-6 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Histórico de áudios — em breve</p>
          </div>
        </TabsContent>
        <TabsContent value="credits" className="mt-0">
          <div className="p-6 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Gestão de créditos — em breve</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
