import { useState } from "react";
import { Plus, Trello, ArrowLeft, MoreHorizontal, Trash2, Calendar, MessageSquare, CheckSquare2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBoards, useBoardDetail, useCardDetail } from "../hooks/useNotas";
import { LABEL_COLORS, type Board, type Card as TCard } from "../types";
import { BlockEditor } from "../components/BlockEditor";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function BoardsView() {
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  if (selectedBoard) return <BoardDetail board={selectedBoard} onBack={() => setSelectedBoard(null)} />;
  return <BoardsList onOpen={setSelectedBoard} />;
}

function BoardsList({ onOpen }: { onOpen: (b: Board) => void }) {
  const { boards, createBoard, deleteBoard } = useBoards();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    const b = await createBoard(name, desc);
    setName("");
    setDesc("");
    setOpen(false);
    if (b) onOpen(b);
  };

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Quadros</h2>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Novo Quadro
        </Button>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trello className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">Nenhum quadro ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro quadro Kanban.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Criar quadro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {boards.map((b) => (
            <Card
              key={b.id}
              className="p-4 cursor-pointer hover:shadow-md transition group relative"
              onClick={() => onOpen(b)}
            >
              <div className="flex items-start gap-2 mb-2">
                <Trello className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-medium">{b.name}</h3>
                  {b.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.description}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Excluir quadro "${b.name}"?`)) deleteBoard(b.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Criado em {new Date(b.created_at).toLocaleDateString("pt-BR")}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do quadro" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Textarea placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardDetail({ board, onBack }: { board: Board; onBack: () => void }) {
  const { columns, cards, labels, addColumn, renameColumn, deleteColumn, addCard, updateCard, moveCard, deleteCard, addLabel, deleteLabel } =
    useBoardDetail(board.id);
  const [openCard, setOpenCard] = useState<TCard | null>(null);
  const [newColName, setNewColName] = useState("");
  const [showNewCol, setShowNewCol] = useState(false);

  const onDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("cardId", cardId);
  };
  const onDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    if (cardId) {
      const colCards = cards.filter((c) => c.column_id === columnId);
      moveCard(cardId, columnId, colCards.length);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold">{board.name}</h2>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        <div className="flex gap-3 h-full items-start">
          {columns.map((col) => {
            const colCards = cards.filter((c) => c.column_id === col.id).sort((a, b) => a.order_index - b.order_index);
            return (
              <div
                key={col.id}
                className="bg-muted/40 rounded-lg p-2 w-72 shrink-0 max-h-full flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className="flex items-center justify-between px-2 py-1 mb-2 group">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      defaultValue={col.name}
                      onBlur={(e) => e.target.value !== col.name && renameColumn(col.id, e.target.value)}
                      className="font-medium text-sm bg-transparent outline-none flex-1"
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">{colCards.length}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => confirm(`Excluir lista "${col.name}"?`) && deleteColumn(col.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {colCards.map((c) => (
                    <KanbanCardItem
                      key={c.id}
                      card={c}
                      labels={labels}
                      onClick={() => setOpenCard(c)}
                      onDragStart={(e) => onDragStart(e, c.id)}
                    />
                  ))}
                </div>

                <AddCardInline onAdd={(t) => addCard(col.id, t)} />
              </div>
            );
          })}

          {showNewCol ? (
            <div className="bg-muted/40 rounded-lg p-2 w-72 shrink-0">
              <Input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Nome da lista"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColName.trim()) {
                    addColumn(newColName.trim());
                    setNewColName("");
                    setShowNewCol(false);
                  }
                  if (e.key === "Escape") setShowNewCol(false);
                }}
                onBlur={() => {
                  if (newColName.trim()) addColumn(newColName.trim());
                  setNewColName("");
                  setShowNewCol(false);
                }}
              />
            </div>
          ) : (
            <Button variant="outline" className="shrink-0 gap-1" onClick={() => setShowNewCol(true)}>
              <Plus className="h-4 w-4" /> Adicionar Lista
            </Button>
          )}
        </div>
      </div>

      <CardDrawer
        card={openCard}
        open={!!openCard}
        onClose={() => setOpenCard(null)}
        labels={labels}
        onUpdate={updateCard}
        onDelete={deleteCard}
        onAddLabel={addLabel}
        onDeleteLabel={deleteLabel}
      />
    </div>
  );
}

function KanbanCardItem({
  card,
  labels,
  onClick,
  onDragStart,
}: {
  card: TCard;
  labels: any[];
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const overdue = card.due_date && new Date(card.due_date) < new Date();
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-2 cursor-pointer hover:ring-1 hover:ring-primary/50 transition"
    >
      <p className="text-sm font-medium">{card.title}</p>
      {card.due_date && (
        <Badge variant={overdue ? "destructive" : "secondary"} className="mt-1 text-[10px] py-0 px-1.5 h-4 gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {new Date(card.due_date).toLocaleDateString("pt-BR")}
        </Badge>
      )}
    </Card>
  );
}

function AddCardInline({ onAdd }: { onAdd: (title: string) => void }) {
  const [show, setShow] = useState(false);
  const [v, setV] = useState("");
  if (!show) {
    return (
      <Button variant="ghost" size="sm" className="justify-start mt-2 text-muted-foreground" onClick={() => setShow(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Cartão
      </Button>
    );
  }
  return (
    <div className="mt-2 space-y-1">
      <Textarea
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Título do cartão"
        rows={2}
        className="text-sm"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => {
            if (v.trim()) {
              onAdd(v.trim());
              setV("");
              setShow(false);
            }
          }}
        >
          Adicionar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CardDrawer({
  card,
  open,
  onClose,
  labels,
  onUpdate,
  onDelete,
  onAddLabel,
  onDeleteLabel,
}: {
  card: TCard | null;
  open: boolean;
  onClose: () => void;
  labels: any[];
  onUpdate: (id: string, patch: Partial<TCard>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onAddLabel: (name: string, color: string) => Promise<any>;
  onDeleteLabel: (id: string) => Promise<any>;
}) {
  const { user } = useAuth();
  const detail = useCardDetail(card?.id ?? null);
  const [title, setTitle] = useState(card?.title ?? "");
  const [desc, setDesc] = useState<any>(card?.description ?? []);
  const [due, setDue] = useState(card?.due_date ? card.due_date.slice(0, 16) : "");
  const [comment, setComment] = useState("");
  const [newChecklist, setNewChecklist] = useState("");

  // sync when card changes
  useState(() => {
    if (card) {
      setTitle(card.title);
      setDesc(card.description ?? []);
      setDue(card.due_date ? card.due_date.slice(0, 16) : "");
    }
  });

  if (!card) return null;

  const save = async (patch: Partial<TCard>) => {
    await onUpdate(card.id, patch);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== card.title && save({ title })}
            className="font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0"
          />
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm("Excluir cartão?")) {
                  onDelete(card.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Labels */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Etiquetas</h4>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const active = detail.cardLabels.includes(l.id);
                const colorCls = LABEL_COLORS.find((c) => c.id === l.color)?.className ?? "bg-gray-500";
                return (
                  <button
                    key={l.id}
                    onClick={() => detail.toggleLabel(l.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs text-white transition",
                      colorCls,
                      !active && "opacity-40 hover:opacity-70"
                    )}
                  >
                    {l.name || l.color}
                  </button>
                );
              })}
              <AddLabelButton onAdd={onAddLabel} />
            </div>
          </div>

          {/* Due date */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Prazo</h4>
            <Input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              onBlur={() => save({ due_date: due ? new Date(due).toISOString() : null })}
              className="w-56"
            />
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Descrição</h4>
            <BlockEditor
              value={desc}
              onChange={(v) => {
                setDesc(v);
                save({ description: v });
              }}
              placeholder="Adicione uma descrição..."
              minHeight={120}
            />
          </div>

          {/* Checklists */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
              <CheckSquare2 className="h-3.5 w-3.5" /> Checklists
            </h4>
            <div className="space-y-3">
              {detail.checklists.map((cl) => {
                const its = detail.items.filter((i) => i.checklist_id === cl.id);
                const done = its.filter((i) => i.checked).length;
                const pct = its.length ? (done / its.length) * 100 : 0;
                return (
                  <div key={cl.id} className="border rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cl.title}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => detail.deleteChecklist(cl.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="h-1 bg-muted rounded-full mb-2 overflow-hidden">
                      <div className={cn("h-full transition-all", pct === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="space-y-1">
                      {its.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 text-sm group">
                          <Checkbox checked={i.checked} onCheckedChange={(v) => detail.toggleItem(i.id, !!v)} />
                          <span className={cn("flex-1", i.checked && "line-through text-muted-foreground")}>{i.text}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => detail.deleteItem(i.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <AddChecklistItem onAdd={(t) => detail.addItem(cl.id, t)} />
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Input value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} placeholder="Novo checklist" className="h-8 text-sm" />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newChecklist.trim()) {
                      detail.addChecklist(newChecklist.trim());
                      setNewChecklist("");
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Comentários
            </h4>
            <div className="flex gap-2 mb-2">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escreva um comentário..." rows={2} className="text-sm" />
              <Button
                size="sm"
                onClick={() => {
                  if (comment.trim()) {
                    detail.addComment(comment.trim());
                    setComment("");
                  }
                }}
              >
                Enviar
              </Button>
            </div>
            <div className="space-y-2">
              {detail.comments.map((c) => (
                <div key={c.id} className="text-sm border rounded p-2 group">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                    {c.user_id === user?.id && (
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => detail.deleteComment(c.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p>{c.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Atividade</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {detail.activity.length === 0 && <p className="italic">Sem atividade ainda.</p>}
              {detail.activity.map((a) => (
                <div key={a.id}>
                  <span className="font-medium">{a.action}</span> · {new Date(a.created_at).toLocaleString("pt-BR")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AddLabelButton({ onAdd }: { onAdd: (name: string, color: string) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0].id);
  return (
    <>
      <button onClick={() => setOpen(true)} className="px-2 py-0.5 rounded text-xs border border-dashed text-muted-foreground hover:bg-accent">
        <Plus className="h-3 w-3 inline" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova etiqueta</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          <div className="flex gap-2">
            {LABEL_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cn("h-6 w-6 rounded", c.className, color === c.id && "ring-2 ring-foreground")}
              />
            ))}
          </div>
          <Button
            onClick={async () => {
              await onAdd(name, color);
              setName("");
              setOpen(false);
            }}
          >
            Criar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddChecklistItem({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <Input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && v.trim()) {
          onAdd(v.trim());
          setV("");
        }
      }}
      placeholder="+ Adicionar item"
      className="h-7 text-sm border-0 px-1 focus-visible:ring-0"
    />
  );
}
