import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, History, FlaskConical, CreditCard, Shuffle } from 'lucide-react';
import { StudioView } from './views/StudioView';
import { HistoryView } from './views/HistoryView';
import { CreditsView } from './views/CreditsView';
import { VariationsView } from './views/VariationsView';
import { ABTestView } from './views/ABTestView';
import { VoicerTab } from './types';

export function VoicerModule() {
  const [activeTab, setActiveTab] = useState<VoicerTab>('studio');

  return (
    <div className="min-h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VoicerTab)}>
        <div className="border-b bg-card/50 px-4 pt-3 overflow-x-auto">
          <TabsList className="h-9">
            <TabsTrigger value="studio" className="text-xs gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Studio
            </TabsTrigger>
            <TabsTrigger value="variations" className="text-xs gap-1.5">
              <Shuffle className="h-3.5 w-3.5" /> Variações
            </TabsTrigger>
            <TabsTrigger value="ab-test" className="text-xs gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Teste A/B
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
        <TabsContent value="variations" className="mt-0">
          <VariationsView />
        </TabsContent>
        <TabsContent value="ab-test" className="mt-0">
          <ABTestView />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <HistoryView />
        </TabsContent>
        <TabsContent value="credits" className="mt-0">
          <CreditsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
