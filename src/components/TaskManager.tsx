import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Plus, Calendar, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  lead_id?: string;
  lead_name?: string;
  created_at: string;
}

export function TaskManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as const,
    lead_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchLeads();
    }
  }, [user]);

  const fetchTasks = async () => {
    // Simulação - você precisará criar a tabela 'tasks' no Supabase
    // Por enquanto, vou usar localStorage como mock
    const storedTasks = localStorage.getItem(`tasks_${user?.id}`);
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    setLeads(data || []);
  };

  const createTask = () => {
    if (!newTask.title || !newTask.due_date) {
      toast({
        title: "Erro",
        description: "Título e data são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const lead = leads.find(l => l.id === newTask.lead_id);
    const task: Task = {
      id: crypto.randomUUID(),
      ...newTask,
      lead_name: lead?.name,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    localStorage.setItem(`tasks_${user?.id}`, JSON.stringify(updatedTasks));

    toast({
      title: "Sucesso",
      description: "Tarefa criada com sucesso!"
    });

    setIsDialogOpen(false);
    setNewTask({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      lead_id: ''
    });
  };

  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, status: task.status === 'pending' ? 'completed' as const : 'pending' as const }
        : task
    );
    setTasks(updatedTasks);
    localStorage.setItem(`tasks_${user?.id}`, JSON.stringify(updatedTasks));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.due_date) < new Date());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Tarefas e Follow-ups
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Ex: Ligar para cliente"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Detalhes da tarefa"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lead Relacionado</label>
                  <Select value={newTask.lead_id} onValueChange={(value) => setNewTask({ ...newTask, lead_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data *</label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={createTask} className="w-full">
                  Criar Tarefa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {pendingTasks.length > 0 && (
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              {pendingTasks.length} pendentes
            </Badge>
            {overdueTasks.length > 0 && (
              <Badge variant="destructive">
                {overdueTasks.length} atrasadas
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa criada ainda</p>
            <p className="text-sm">Clique em "Nova Tarefa" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const isOverdue = task.status === 'pending' && new Date(task.due_date) < new Date();
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.status === 'completed' 
                      ? 'bg-muted/50 opacity-60' 
                      : isOverdue
                        ? 'border-destructive bg-destructive/5'
                        : 'bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTaskStatus(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant={getPriorityColor(task.priority)} className="shrink-0">
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </div>
                        {task.lead_name && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {task.lead_name}
                          </div>
                        )}
                      </div>
                      {isOverdue && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Tarefa atrasada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
