import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, CheckSquare, Quote, Heading1, Heading2 } from "lucide-react";

interface BlockEditorProps {
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  minHeight?: number;
}

export function BlockEditor({ value, onChange, placeholder = "Comece a escrever...", minHeight = 200 }: BlockEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value && (Array.isArray(value) ? value.length : true) ? value : "",
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value) && value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean) => (active ? "bg-accent text-accent-foreground" : "");

  return (
    <div className="border rounded-md flex flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b p-1 bg-muted/30">
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("heading", { level: 1 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("heading", { level: 2 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("bold"))}`} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("italic"))}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("strike"))}`} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("code"))}`} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("bulletList"))}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("orderedList"))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("taskList"))}`} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className={`h-7 w-7 ${btn(editor.isActive("blockquote"))}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Helper: extract plain text preview from TipTap JSON
export function extractPreview(content: any, max = 160): string {
  if (!content) return "";
  if (typeof content === "string") return content.slice(0, max);
  try {
    const walk = (node: any): string => {
      if (!node) return "";
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(walk).join(" ");
      if (Array.isArray(node)) return node.map(walk).join(" ");
      return "";
    };
    return walk(content).replace(/\s+/g, " ").trim().slice(0, max);
  } catch {
    return "";
  }
}
