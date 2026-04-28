import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotebookPen, Trello } from "lucide-react";
import { NotesView } from "./views/NotesView";
import { BoardsView } from "./views/BoardsView";
import { QuickCaptureFab } from "./components/QuickCaptureFab";
import { ReminderAlertDialog } from "./components/ReminderAlertDialog";
import { useReminderWatcher } from "./hooks/useReminderWatcher";

export function NotasModule() {
  const [tab, setTab] = useState<"notas" | "quadros">("notas");
  const { activeAlerts, dismissAlert, dismissAll } = useReminderWatcher();

  return (
    <div className="relative h-[calc(100vh-3.5rem)] md:h-screen flex flex-col bg-background">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "notas" | "quadros")} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Notas & Workspace</h1>
          </div>
          <TabsList>
            <TabsTrigger value="notas" className="gap-2">
              <NotebookPen className="h-4 w-4" /> Notas
            </TabsTrigger>
            <TabsTrigger value="quadros" className="gap-2">
              <Trello className="h-4 w-4" /> Quadros
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="notas" className="flex-1 min-h-0 m-0">
          <NotesView />
        </TabsContent>
        <TabsContent value="quadros" className="flex-1 min-h-0 m-0 overflow-hidden">
          <BoardsView />
        </TabsContent>
      </Tabs>

      <QuickCaptureFab />

      <ReminderAlertDialog
        alerts={activeAlerts}
        onDismiss={dismissAlert}
        onDismissAll={dismissAll}
      />
    </div>
  );
}

export default NotasModule;
